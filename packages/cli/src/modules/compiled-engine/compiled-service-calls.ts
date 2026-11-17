import { Logger } from '@n8n/backend-common';
import { Container, Service } from '@n8n/di';
import type { BinaryDataBackend } from '@n8n/workflow-lang';
import {
	BinaryDataConfig,
	BinaryDataService,
	detectBinaryEncoding,
	prepareBinaryData,
} from 'n8n-core';

import { DeduplicationHelper } from '@/deduplication/deduplication-helper';

import { dataTableCallSchema } from '../engine-v2/engine-data-tables.contract';
import { EngineDataTablesService } from '../engine-v2/engine-data-tables.service';
import { runtimeLocationId } from './compiled-binary-data';
import { CompiledEngineCredentials } from './compiled-engine-credentials';
import { CompiledEngineSync } from './compiled-engine-sync.service';
import { CompiledEngineConfig } from './compiled-engine.config';
import type { WfrtServiceEvent } from './compiled-engine.types';
import { isDataObject, MANUAL_WORKFLOW_SUFFIX } from './compiled-engine.types';
import type { WorkflowLang } from './workflow-lang';
import { loadWorkflowLang } from './workflow-lang';
import { WfrtAdminClient } from './wfrt-admin.client';

/** The answer to a service call (spec section 9.9). */
export type ServiceAnswer =
	| { ok: true; result: unknown }
	| { ok: false; error: { message: string; description?: string } };

/** How long n8n keeps an answer, so that a call that `wfrt` sends again gets the same one. */
const ANSWER_TTL_MS = 10 * 60 * 1000;

/**
 * The backend of the service calls of compiled executions (spec section 9.9).
 * A `dataTable` call runs with the engine v2 data-table service: it resolves
 * the project of the workflow and checks access, as for a v1 execution. A
 * `deduplication` call runs with n8n's `DeduplicationHelper` on the
 * `processed_data` table, always for the workflow of the execution. A
 * `chatMemory` call runs with the session store of the Simple Memory node: the
 * sessions are in the memory of this process only, as the v1 node keeps them. A
 * `binaryData` call (`read`, `store`) runs with n8n-core's `BinaryDataService`, for
 * the files of the workflow of the execution only.
 *
 * `wfrt` sends a waiting call again when the event stream opens again. Each
 * answer is kept by call id and attempt, so a write that ran already is not
 * run twice.
 */
@Service()
export class CompiledServiceCalls {
	private readonly answers = new Map<string, { at: number; answer: Promise<ServiceAnswer> }>();

	/** `N8N_COMPILED_ENGINE_CHAT_MEMORY_MB`, in bytes. */
	private readonly chatMemoryBytes: number;

	private chatMemory?: InstanceType<WorkflowLang['ChatMemoryStore']>;

	constructor(
		private readonly client: WfrtAdminClient,
		private readonly logger: Logger,
		private readonly sync: CompiledEngineSync,
		private readonly credentials: CompiledEngineCredentials,
		config: CompiledEngineConfig,
	) {
		this.logger = this.logger.scoped('compiled-engine');
		this.chatMemoryBytes = config.chatMemoryMb * 1024 * 1024;
	}

	/**
	 * The store of the `chatMemory` service. One store serves all shards of `wfrt`. With a
	 * limit of 0 the store takes no session, and each `open` sends its run to the fallback host.
	 */
	private async chatMemoryStore(): Promise<InstanceType<WorkflowLang['ChatMemoryStore']>> {
		if (!this.chatMemory) {
			const { ChatMemoryStore } = await loadWorkflowLang();
			this.chatMemory ??= new ChatMemoryStore({ maxBytes: this.chatMemoryBytes });
		}
		return this.chatMemory;
	}

	/**
	 * Runs the call once for each call id and attempt, and sends the answer to `wfrt`. `run`
	 * is the backend of a call that needs the state of its execution (the `execution` service).
	 */
	async handle(
		event: WfrtServiceEvent,
		run: () => Promise<ServiceAnswer> = async () => await this.run(event),
	): Promise<void> {
		const now = Date.now();
		for (const [key, entry] of this.answers) {
			if (now - entry.at > ANSWER_TTL_MS) this.answers.delete(key);
		}
		const key = `${event.callId}#${event.attempt}`;
		let entry = this.answers.get(key);
		if (!entry) {
			entry = { at: now, answer: run() };
			this.answers.set(key, entry);
		}
		const answer = await entry.answer;
		try {
			await this.client.answerService(event.callId, answer);
		} catch (error) {
			this.logger.warn('Could not answer a service call of wfrt', {
				callId: event.callId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/** Runs one call. Errors become `ok: false` answers; the step sees their message. */
	async run(event: WfrtServiceEvent): Promise<ServiceAnswer> {
		const args = isRecord(event.args) ? event.args : {};
		const workflowId = event.workflowId.endsWith(MANUAL_WORKFLOW_SUFFIX)
			? event.workflowId.slice(0, -MANUAL_WORKFLOW_SUFFIX.length)
			: event.workflowId;
		if (event.service === 'deduplication') {
			const { runDeduplicationCall } = await loadWorkflowLang();
			return await runDeduplicationCall(
				new DeduplicationHelper(),
				{ service: event.service, op: event.op, args },
				workflowId,
			);
		}
		if (event.service === 'credentials') {
			return await this.runCredentialCall(event, args, workflowId);
		}
		if (event.service === 'chatMemory') {
			// The store runs each call when it comes, with no wait between: the order of the
			// events is the order of the reads and writes of runs that share a session.
			const store = await this.chatMemoryStore();
			return store.run({ service: event.service, op: event.op, args }, workflowId);
		}
		if (event.service === 'binaryData') {
			const { runBinaryDataCall } = await loadWorkflowLang();
			return await runBinaryDataCall(this.binaryDataBackend(event, workflowId), {
				service: event.service,
				op: event.op,
				args,
			});
		}
		if (event.service !== 'dataTable') {
			return { ok: false, error: { message: `Unknown service "${event.service}"` } };
		}
		const parsed = dataTableCallSchema.safeParse({ ...args, kind: event.op });
		if (!parsed.success) {
			return { ok: false, error: { message: `Invalid data table call "${event.op}"` } };
		}
		try {
			const outcome = await Container.get(EngineDataTablesService).call({
				execution: { executionId: event.executionId, workflowId },
				consumer: { nodeType: 'n8n-nodes-base.dataTable' },
				call: parsed.data,
			});
			if ('error' in outcome) {
				const { message, description } = outcome.error;
				return { ok: false, error: description ? { message, description } : { message } };
			}
			return { ok: true, result: outcome.data };
		} catch (error) {
			return {
				ok: false,
				error: { message: error instanceof Error ? error.message : String(error) },
			};
		}
	}

	/**
	 * The parts of n8n-core that the `binaryData` service needs. A file must be a file of
	 * the workflow of the execution. A new file goes where a v1 execution writes it:
	 * `workflows/<workflow id>/executions/<execution id>/binary_data/<uuid>` (n8n-core
	 * `getBinaryHelperFunctions`: `additionalData.executionId` and `workflow.id`). The
	 * execution id of a run that n8n started is n8n's id. A run that the runtime started has
	 * the id `wfrt-<n>`: n8n knows its own id only when it saves the run, so the file goes
	 * under `wfrt-wfrt-<n>`, as the runtime and the fallback host write it (`server.zig`
	 * `egressStored`, `binary-store.ts` `storedExecutionId`), and the dispatcher moves it to
	 * n8n's id (`moveRunBinaryData`).
	 */
	private binaryDataBackend(event: WfrtServiceEvent, workflowId: string): BinaryDataBackend {
		const service = Container.get(BinaryDataService);
		const { mode } = Container.get(BinaryDataConfig);
		const executionId = event.executionId.startsWith('wfrt-')
			? runtimeLocationId(event.executionId)
			: event.executionId;
		return {
			read: async (id, limit) => {
				if (!id.includes(`workflows/${workflowId}/`)) {
					throw new Error('The file is not a file of the workflow of the execution');
				}
				const { fileSize } = await service.getMetadata(id);
				if (fileSize > limit) return null;
				return await service.getAsBuffer({ id, data: '', mimeType: '' });
			},
			detect: (bytes) => detectBinaryEncoding(Buffer.from(bytes)) ?? null,
			store: async (bytes, fileName, mimeType) => {
				// The dispatcher moves the files of a run in these two modes only.
				if (mode !== 'default' && mode !== 'filesystem') return null;
				return await prepareBinaryData(
					Buffer.from(bytes),
					executionId,
					workflowId,
					fileName,
					mimeType,
				);
			},
		};
	}

	/**
	 * Saves a token that a fallback-host node refreshed, or renews a credential
	 * for a native request. Only a credential of the workflow that runs may change.
	 */
	private async runCredentialCall(
		event: WfrtServiceEvent,
		args: Record<string, unknown>,
		workflowId: string,
	): Promise<ServiceAnswer> {
		const loaded = this.sync.findLoaded(event.workflowId);
		const requested = typeof args.credentialId === 'string' ? args.credentialId : '';
		const binding = loaded?.artifact.slots.find(
			(slot) => slot.credentialId === requested || slot.slot === requested,
		);
		if (!binding?.credentialId) {
			return {
				ok: false,
				error: { message: 'The workflow does not use this credential' },
			};
		}
		try {
			if (event.op === 'updateOauthTokenData') {
				if (!isDataObject(args.oauthTokenData)) {
					return {
						ok: false,
						error: { message: 'Invalid credentials call "updateOauthTokenData"' },
					};
				}
				await this.credentials.updateOAuthTokenData(binding, args.oauthTokenData, workflowId);
				await this.sync.onCredentialChanged(binding.credentialId);
				return { ok: true, result: true };
			}
			// `renew` comes from `wfrt` itself, for any renewable slot. `refreshOAuth2` is the
			// call of older modules. Both use one protocol: n8n renews the credential once for
			// all requests that wait, and sends only the new credential values.
			if (event.op === 'renew' || event.op === 'refreshOAuth2') {
				await this.sync.renewCredential(binding.credentialId, event.workflowId);
				return { ok: true, result: { ok: true } };
			}
			return { ok: false, error: { message: `Invalid credentials call "${event.op}"` } };
		} catch (error) {
			return {
				ok: false,
				error: { message: error instanceof Error ? error.message : String(error) },
			};
		}
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
