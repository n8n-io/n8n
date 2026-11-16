import { Logger } from '@n8n/backend-common';
import { UrlService } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import type { WorkflowEntity } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { OperationalError, UserError } from '@n8n/errors';
import type { IDataObject, IWorkflowBase, IWorkflowSettings } from 'n8n-workflow';

import { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';
import { getVariables } from '@/workflow-helpers';

import type { MintedToken } from './compiled-engine-credentials';
import { CompiledEngineCredentials, mintExpiries } from './compiled-engine-credentials';
import type { CompiledArtifact } from './compiled-engine.types';
import { MANUAL_WORKFLOW_SUFFIX, WFRT_WEBHOOK_PREFIX } from './compiled-engine.types';
import { CompiledWorkflowCompiler } from './compiled-workflow.compiler';
import type { WfrtWorkflowStatus } from './wfrt-admin.client';
import { WfrtAdminClient } from './wfrt-admin.client';

/** n8n makes a minted token again this long before it expires. */
const MINT_RENEWAL_MARGIN_MS = 5 * 60 * 1000;
/** The shortest wait before n8n makes a minted token again, also after a failure. */
const MINT_RENEWAL_MIN_DELAY_MS = 60 * 1000;
/** The most credentials that n8n renews at the same time. More is an error for the request. */
const MAX_RENEWALS_IN_FLIGHT = 1024;

/** The workflows (`wfrt` ids) that got the new values of a renewal, and the errors of the others. */
interface RenewalResult {
	sent: Set<string>;
	failures: Map<string, Error>;
}

/** A workflow version that n8n loaded into `wfrt`. */
export interface LoadedWorkflow {
	/** The workflow id in `wfrt`. A manual run uses the n8n id with a suffix. */
	wfrtId: string;
	workflowData: IWorkflowBase;
	artifact: CompiledArtifact;
	active: boolean;
}

/** The first error diagnostics, as one line for an error message. */
export function describeErrors(artifact: CompiledArtifact): string {
	const errors = artifact.diagnostics.filter((d) => d.severity === 'error');
	const shown = errors
		.slice(0, 3)
		.map((d) => (d.node ? `"${d.node}": ${d.message}` : d.message))
		.join(' ');
	return errors.length > 3 ? `${shown} (and ${errors.length - 3} more)` : shown;
}

/**
 * Whether `wfrt` must send step args and results of production runs. A workflow
 * that saves no execution data does not need them.
 */
export function savesData(settings: IWorkflowSettings | null | undefined) {
	return !(
		settings?.saveDataSuccessExecution === 'none' && settings?.saveDataErrorExecution === 'none'
	);
}

/**
 * Keeps `wfrt` in step with n8n: the modules of published compiled workflows
 * and the draft modules of manual runs, each with its own credentials. When
 * `wfrt` (re)connects, it pushes everything again, because `wfrt` holds
 * credentials in memory only.
 */
@Service()
export class CompiledEngineSync {
	private readonly loaded = new Map<string, LoadedWorkflow>();

	private connected = false;

	/**
	 * One timer for each published workflow with minted tokens. It renews the tokens ahead
	 * of their expiry, so a request does not wait for the renewal.
	 */
	private readonly mintRenewals = new Map<string, NodeJS.Timeout>();

	/** When the minted tokens of each slot of a loaded workflow expire, by `wfrt` id. */
	private readonly mintExpiry = new Map<string, Map<string, number>>();

	/**
	 * The renewals in progress, by credential id: requests for the same credential share
	 * one.
	 */
	private readonly renewals = new Map<string, Promise<RenewalResult>>();

	/** The last static data save of each workflow, so saves stay in order. */
	private readonly staticSaves = new Map<string, Promise<void>>();

	constructor(
		private readonly compiler: CompiledWorkflowCompiler,
		private readonly client: WfrtAdminClient,
		private readonly credentials: CompiledEngineCredentials,
		private readonly workflowRepository: WorkflowRepository,
		private readonly urlService: UrlService,
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
		private readonly staticData: WorkflowStaticDataService,
	) {
		this.logger = this.logger.scoped('compiled-engine');
	}

	get isConnected() {
		return this.connected;
	}

	findLoaded(wfrtId: string) {
		return this.loaded.get(wfrtId);
	}

	/** Compiles the published version of a workflow and loads it with its triggers on. */
	async activate(workflow: WorkflowEntity) {
		const version = workflow.activeVersion;
		const workflowData: IWorkflowBase = {
			...workflow,
			nodes: version?.nodes ?? workflow.nodes,
			connections: version?.connections ?? workflow.connections,
			versionId: version?.versionId ?? workflow.versionId,
		};
		const artifact = await this.compile(workflowData);
		if (!artifact.ok) {
			throw new UserError(
				`The workflow cannot run on the compiled engine. ${describeErrors(artifact)}`,
			);
		}
		const entry: LoadedWorkflow = { wfrtId: workflow.id, workflowData, artifact, active: true };
		this.loaded.set(entry.wfrtId, entry);
		if (!this.connected) {
			this.logger.info(
				`Workflow ${workflow.id} is compiled. It loads when the compiled engine is connected.`,
			);
			return;
		}
		await this.push(entry);
	}

	async deactivate(workflowId: string) {
		const known = this.loaded.delete(workflowId);
		this.cancelMintRenewal(workflowId);
		this.mintExpiry.delete(workflowId);
		// After a restart `wfrt` can hold a workflow that this process never loaded.
		if (this.connected) await this.client.deleteWorkflow(workflowId);
		else if (known) this.logger.debug(`Workflow ${workflowId} unloads when wfrt connects`);
	}

	/** Compiles the given workflow and loads it, with no triggers, for one manual run. */
	async prepareManualRun(workflowData: IWorkflowBase, trigger?: string): Promise<LoadedWorkflow> {
		const artifact = await this.compile(workflowData, trigger);
		if (!artifact.ok) {
			throw new UserError(
				`The workflow cannot run on the compiled engine. ${describeErrors(artifact)}`,
			);
		}
		if (!this.connected) {
			throw new OperationalError(
				'The compiled engine is not running. Check the n8n logs for wfrt errors.',
			);
		}
		const wfrtId = `${workflowData.id}${MANUAL_WORKFLOW_SUFFIX}`;
		const entry: LoadedWorkflow = { wfrtId, workflowData, artifact, active: false };
		this.loaded.set(wfrtId, entry);
		// Always push: the credentials can have changed since the last run.
		await this.push(entry);
		return entry;
	}

	async compile(workflowData: IWorkflowBase, trigger?: string) {
		return await this.compiler.compile({
			...(trigger === undefined ? {} : { trigger }),
			id: workflowData.id,
			name: workflowData.name,
			versionId: workflowData.versionId ?? '',
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			settings: workflowData.settings,
		});
	}

	/**
	 * Called when the event stream of `wfrt` opens. Unloads the workflows that
	 * are no longer published compiled workflows, then loads everything again.
	 * Returns the workflow list of `wfrt` for the execution reconcile.
	 */
	async onConnected(): Promise<WfrtWorkflowStatus[]> {
		let listed: WfrtWorkflowStatus[] = [];
		try {
			listed = await this.client.listWorkflows();
			// Changes that n8n missed while the stream was down: keep them before
			// the loads below send n8n's copy back.
			await this.pullStaticData(listed.map((status) => status.workflowId));
			for (const status of listed) {
				if (status.workflowId.endsWith(MANUAL_WORKFLOW_SUFFIX)) continue;
				if (this.loaded.has(status.workflowId)) continue;
				if (await this.isPublishedCompiled(status.workflowId)) continue;
				this.logger.info(`Unloading workflow ${status.workflowId} from wfrt: it is not published`);
				await this.client.deleteWorkflow(status.workflowId);
			}
		} catch (error) {
			this.logger.warn('Could not reconcile the workflows of wfrt', {
				error: error instanceof Error ? error.message : String(error),
			});
		}

		this.connected = true;
		await this.pushVariables();
		this.logger.info(`Connected to wfrt. Loading ${this.loaded.size} compiled workflow(s).`);
		for (const entry of this.loaded.values()) {
			try {
				await this.push(entry);
			} catch (error) {
				this.logger.error(`Could not load workflow ${entry.wfrtId} into wfrt`, {
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
		return listed;
	}

	private async isPublishedCompiled(workflowId: string) {
		const workflow = await this.workflowRepository.findById(workflowId);
		return (
			workflow !== null &&
			workflow.activeVersionId !== null &&
			workflow.settings?.engineType === 'compiled'
		);
	}

	onDisconnected() {
		this.connected = false;
		// A connect loads everything again, with new tokens and new timers.
		for (const wfrtId of [...this.mintRenewals.keys()]) this.cancelMintRenewal(wfrtId);
	}

	/**
	 * Stores a static data change of `wfrt` in the workflow, as v1 saves it
	 * after a run (spec section 9.7), so a switch back to v1 keeps it.
	 */
	async saveStaticData(workflowId: string, staticData: IDataObject) {
		// Manual runs keep no static data; `wfrt` sends none for them.
		if (workflowId.endsWith(MANUAL_WORKFLOW_SUFFIX)) return;
		// Saves of one workflow go in the order of the events: the last one wins.
		const previous = this.staticSaves.get(workflowId) ?? Promise.resolve();
		const next = previous.then(async () => {
			try {
				await this.staticData.saveStaticDataById(workflowId, staticData);
			} catch (error) {
				this.logger.error(`Could not save the static data of workflow ${workflowId}`, {
					error: error instanceof Error ? error.message : String(error),
				});
			}
		});
		this.staticSaves.set(workflowId, next);
		await next;
		if (this.staticSaves.get(workflowId) === next) this.staticSaves.delete(workflowId);
	}

	/**
	 * Reads the static data of published workflows from `wfrt` and stores it.
	 * For a gap in the event stream: on connect, and after `wfrt` dropped
	 * events. Without `workflowIds`, it reads every published workflow that
	 * n8n loaded. `{}` means that `wfrt` has none, so n8n keeps its copy.
	 */
	async pullStaticData(workflowIds?: string[]) {
		const ids = (
			workflowIds ?? [...this.loaded.values()].filter((e) => e.active).map((e) => e.wfrtId)
		).filter((id) => !id.endsWith(MANUAL_WORKFLOW_SUFFIX));
		for (const id of ids) {
			try {
				const document = await this.client.getStaticData(id);
				if (Object.keys(document).length > 0) await this.saveStaticData(id, document);
			} catch (error) {
				this.logger.warn(`Could not read the static data of workflow ${id} from wfrt`, {
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
	}

	/** Loads again each workflow that uses the changed credential, with the new data. */
	async onCredentialChanged(credentialId: string) {
		if (!this.connected) return;
		for (const entry of this.loaded.values()) {
			if (entry.artifact.slots.some((s) => s.credentialId === credentialId)) {
				await this.push(entry);
			}
		}
	}

	/**
	 * Sends the instance variables (`$vars`). `wfrt` has one set for all
	 * workflows, so project variables are not included.
	 */
	async pushVariables() {
		if (!this.connected) return;
		try {
			const variables = await getVariables();
			const document: Record<string, string> = {};
			for (const [key, value] of Object.entries(variables)) {
				document[key] = typeof value === 'string' ? value : JSON.stringify(value);
			}
			await this.client.putVariables(document);
		} catch (error) {
			this.logger.warn('Could not send the variables to wfrt', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/** The n8n waiting URLs. `wfrt` appends `/<executionId>` to them. */
	resumeUrlBases() {
		const base = this.urlService.getWebhookBaseUrl().replace(/\/$/, '');
		const { webhookWaiting, formWaiting } = this.globalConfig.endpoints;
		return {
			resumeUrlBase: `${base}/${webhookWaiting}`,
			resumeFormUrlBase: `${base}/${formWaiting}`,
		};
	}

	/**
	 * Renews a credential and sends the new values to every loaded workflow that uses it:
	 * a credentials-only update, the modules stay. Requests for the same credential at the
	 * same time share one renewal. It throws when the workflow `forWfrtId` did not get the
	 * new values.
	 */
	async renewCredential(credentialId: string, forWfrtId: string, again = false): Promise<void> {
		let renewal = this.renewals.get(credentialId);
		if (!renewal) {
			if (this.renewals.size >= MAX_RENEWALS_IN_FLIGHT) {
				throw new OperationalError('Too many credential renewals are in progress');
			}
			renewal = this.runRenewal(credentialId).finally(() => {
				this.renewals.delete(credentialId);
			});
			this.renewals.set(credentialId, renewal);
		}
		const result = await renewal;
		const failed = result.failures.get(forWfrtId);
		if (failed) throw failed;
		if (result.sent.has(forWfrtId)) return;
		// The renewal began before this workflow was loaded: one more, for this workflow.
		if (again) throw new OperationalError('The workflow did not get the renewed credential');
		await this.renewCredential(credentialId, forWfrtId, true);
	}

	private async runRenewal(credentialId: string): Promise<RenewalResult> {
		const users = [...this.loaded.values()].filter((entry) =>
			entry.artifact.slots.some((slot) => slot.credentialId === credentialId),
		);
		const first = users[0];
		const binding = first?.artifact.slots.find((slot) => slot.credentialId === credentialId);
		if (!first || !binding) throw new UserError('No loaded workflow uses this credential');
		const hasMints = users.some((entry) =>
			entry.artifact.slots.some(
				(slot) =>
					slot.credentialId === credentialId &&
					(entry.artifact.mints?.[slot.slot] ?? []).length > 0,
			),
		);
		await this.credentials.renew(binding, first.workflowData.id, hasMints);
		const failures = new Map<string, Error>();
		const sent = new Set<string>();
		const minted = new Map<string, MintedToken>();
		for (const entry of users) {
			try {
				await this.pushCredentials(entry, credentialId, minted);
				sent.add(entry.wfrtId);
			} catch (error) {
				failures.set(entry.wfrtId, error instanceof Error ? error : new Error(String(error)));
				this.logger.warn(`Could not send renewed credentials to workflow ${entry.wfrtId}`, {
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
		return { sent, failures };
	}

	/** Sends the slots of one credential of a loaded workflow, with new values. */
	private async pushCredentials(
		entry: LoadedWorkflow,
		credentialId: string,
		minted: Map<string, MintedToken>,
	) {
		if (!this.connected) throw new OperationalError('The compiled engine is not connected');
		const slots = entry.artifact.slots.filter((slot) => slot.credentialId === credentialId);
		const credentials = await this.credentials.buildDocument(
			entry.workflowData.id,
			slots,
			entry.artifact.derivations,
			entry.artifact.mints,
			{ strict: true, minted },
		);
		await this.client.putWorkflowCredentials(entry.wfrtId, credentials);
		const expiries = this.mintExpiry.get(entry.wfrtId) ?? new Map<string, number>();
		for (const [slot, expiresAt] of mintExpiries(credentials)) expiries.set(slot, expiresAt);
		this.mintExpiry.set(entry.wfrtId, expiries);
		if (this.loaded.get(entry.wfrtId) === entry) this.scheduleMintRenewal(entry);
	}

	/** The first expiry of the minted tokens of a workflow; none when a token is missing. */
	private earliestMintExpiry(entry: LoadedWorkflow): number | undefined {
		const expiries = this.mintExpiry.get(entry.wfrtId);
		let earliest: number | undefined;
		for (const [slot, requested] of Object.entries(entry.artifact.mints ?? {})) {
			if (requested.length === 0) continue;
			const expiresAt = expiries?.get(slot);
			if (expiresAt === undefined) return undefined;
			if (earliest === undefined || expiresAt < earliest) earliest = expiresAt;
		}
		return earliest;
	}

	/** Renews each credential of the workflow that has minted tokens. */
	private async renewMinted(entry: LoadedWorkflow) {
		const credentialIds = new Set<string>();
		for (const slot of entry.artifact.slots) {
			if (slot.credentialId && (entry.artifact.mints?.[slot.slot] ?? []).length > 0) {
				credentialIds.add(slot.credentialId);
			}
		}
		for (const credentialId of credentialIds) {
			await this.renewCredential(credentialId, entry.wfrtId);
		}
	}

	private cancelMintRenewal(wfrtId: string) {
		clearTimeout(this.mintRenewals.get(wfrtId));
		this.mintRenewals.delete(wfrtId);
	}

	/**
	 * Minted tokens expire, and `wfrt` cannot make them. `wfrt` asks for a renewal when a
	 * request needs one (`renewCredential`). This timer is an optimisation: n8n sends new
	 * tokens before the first one expires, with a credentials-only update, so a request does
	 * not wait. Without an expiry the mint failed, so n8n tries again.
	 * A manual run gets new tokens at each run, so it has no timer.
	 */
	private scheduleMintRenewal(entry: LoadedWorkflow, retry = false) {
		this.cancelMintRenewal(entry.wfrtId);
		const expiresAt = retry ? undefined : this.earliestMintExpiry(entry);
		const minted = Object.values(entry.artifact.mints ?? {}).some((list) => list.length > 0);
		if (!minted || !entry.active) return;
		const delay =
			expiresAt === undefined
				? MINT_RENEWAL_MIN_DELAY_MS
				: Math.max(MINT_RENEWAL_MIN_DELAY_MS, expiresAt - Date.now() - MINT_RENEWAL_MARGIN_MS);
		const timer = setTimeout(() => {
			this.mintRenewals.delete(entry.wfrtId);
			if (!this.connected || this.loaded.get(entry.wfrtId) !== entry) return;
			void this.renewMinted(entry).catch((error) => {
				this.logger.warn(`Could not renew the tokens of workflow ${entry.wfrtId}`, {
					error: error instanceof Error ? error.message : String(error),
				});
				this.scheduleMintRenewal(entry, true);
			});
		}, delay);
		timer.unref();
		this.mintRenewals.set(entry.wfrtId, timer);
	}

	private async push(entry: LoadedWorkflow) {
		if (!entry.artifact.module) return;
		const credentials = await this.credentials.buildDocument(
			entry.workflowData.id,
			entry.artifact.slots,
			entry.artifact.derivations,
			entry.artifact.mints,
		);
		this.mintExpiry.set(entry.wfrtId, mintExpiries(credentials));
		this.scheduleMintRenewal(entry);
		// n8n's copy of the static data; manual runs read it too (they keep nothing).
		const staticData = await this.staticData.getStaticDataById(entry.workflowData.id);
		await this.client.putWorkflow(entry.wfrtId, {
			staticData: staticData ?? {},
			versionId: entry.artifact.key,
			module: entry.artifact.module,
			active: entry.active,
			webhookPrefix: WFRT_WEBHOOK_PREFIX,
			saveData: savesData(entry.workflowData.settings),
			credentials,
			...this.resumeUrlBases(),
		});
		this.logger.debug(`Loaded workflow ${entry.wfrtId} into wfrt`, { active: entry.active });
	}
}
