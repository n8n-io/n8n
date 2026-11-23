import { Logger } from '@n8n/backend-common';
import { Publisher } from '@n8n/backend-services';
import { Time } from '@n8n/constants';
import { OnPubSubEvent, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { OperationalError } from '@n8n/errors';
import { latestWins } from '@n8n/utils/promise/latest-wins';
import { EMPTY_RULE_SET, ruleSetSchema, type RuleSet } from '@n8n/workflow-rules';

import type { WorkflowRuleExemptionEntity } from './database/workflow-rule-exemption.entity';
import { WorkflowRuleExemptionRepository } from './database/workflow-rule-exemption.repository';
import { WorkflowRuleSetRepository } from './database/workflow-rule-set.repository';

const FINGERPRINT_POLL_INTERVAL_MS = 30 * Time.seconds.toMilliseconds;

export interface StoredRuleSet {
	readonly ruleSet: RuleSet;
	readonly version: number;
}

export interface WorkflowRulesState {
	readonly instance: StoredRuleSet;
	readonly projects: ReadonlyMap<string, StoredRuleSet>;
	/** Exempted rule ids by workflow id. */
	readonly exemptions: ReadonlyMap<string, ReadonlySet<string>>;
}

interface Fingerprint {
	readonly ruleSets: string;
	readonly exemptions: string;
}

const NO_RULE_SET: StoredRuleSet = { ruleSet: EMPTY_RULE_SET, version: 0 };

/**
 * Every rule set and exemption, held in memory so a policy check reads no database inside
 * its deadline. The database stays the source of truth.
 *
 * Kept fresh three ways: the writing process reloads after its commit, the others reload on
 * a pubsub command, and a fingerprint poll catches a command that was lost.
 */
@Service()
export class WorkflowRulesSnapshot {
	private loaded: { state: WorkflowRulesState; fingerprint: Fingerprint } | null = null;

	private pollTimer: NodeJS.Timeout | undefined;

	private polling = false;

	constructor(
		private readonly ruleSetRepository: WorkflowRuleSetRepository,
		private readonly exemptionRepository: WorkflowRuleExemptionRepository,
		private readonly publisher: Publisher,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('policy');
	}

	/** The cached state, or a fresh load when the first load has not succeeded yet. */
	async read(): Promise<WorkflowRulesState> {
		if (!this.loaded) await this.reload();
		const state = this.currentState();
		if (!state) throw new OperationalError('Workflow Rules could not be loaded');
		return state;
	}

	private currentState(): WorkflowRulesState | undefined {
		return this.loaded?.state;
	}

	async start(): Promise<void> {
		await this.reloadAndLog();
		this.pollTimer ??= setInterval(async () => await this.poll(), FINGERPRINT_POLL_INTERVAL_MS);
		this.pollTimer.unref();
	}

	@OnShutdown()
	stop(): void {
		clearInterval(this.pollTimer);
		this.pollTimer = undefined;
	}

	/** Call after a write commits, never inside its transaction. */
	async refreshAfterWrite(): Promise<void> {
		await this.reloadAndLog();

		// Not awaited: a disconnected Redis queues the publish, and the write already committed.
		void this.publisher
			.publishCommand({ command: 'reload-workflow-rules' })
			.catch((error: unknown) => {
				this.logger.warn('Failed to tell other processes to reload Workflow Rules', { error });
			});
	}

	@OnPubSubEvent('reload-workflow-rules')
	@OnPubSubEvent('pubsub-reconnected')
	async handleReloadRequest(): Promise<void> {
		await this.reloadAndLog();
	}

	readonly reload = latestWins(async () => await this.load());

	private async reloadAndLog(): Promise<void> {
		try {
			await this.reload();
		} catch (error) {
			this.logger.error('Failed to load Workflow Rules', { error });
		}
	}

	private async readFingerprint(): Promise<Fingerprint> {
		const [ruleSets, exemptions] = await Promise.all([
			this.ruleSetRepository.readFingerprint({}),
			this.exemptionRepository.readFingerprint({}),
		]);
		return { ruleSets: JSON.stringify(ruleSets), exemptions: JSON.stringify(exemptions) };
	}

	private async load(): Promise<void> {
		// Read first: a write that lands during the load then shows as a change on the next poll.
		const fingerprint = await this.readFingerprint();
		const [ruleSets, exemptions] = await Promise.all([
			this.ruleSetRepository.findAll({}),
			this.exemptionRepository.findAll({}),
		]);

		let instance = NO_RULE_SET;
		const projects = new Map<string, StoredRuleSet>();
		for (const row of ruleSets) {
			const parsed = ruleSetSchema.safeParse(row.config);
			if (!parsed.success) {
				this.logger.error('Ignoring a stored rule set that is not valid', {
					projectId: row.projectId,
					issues: parsed.error.issues,
				});
				continue;
			}
			const stored = { ruleSet: parsed.data, version: row.version };
			if (row.projectId === null) instance = stored;
			else projects.set(row.projectId, stored);
		}

		this.loaded = {
			state: { instance, projects, exemptions: groupExemptions(exemptions) },
			fingerprint,
		};
	}

	private async poll(): Promise<void> {
		if (this.polling) return;
		this.polling = true;
		try {
			if (this.loaded) {
				const fingerprint = await this.readFingerprint();
				const { fingerprint: current } = this.loaded;
				if (
					fingerprint.ruleSets === current.ruleSets &&
					fingerprint.exemptions === current.exemptions
				) {
					return;
				}
				this.logger.info('Workflow Rules changed without a reload message');
			}
			await this.reload();
		} catch (error) {
			this.logger.error('Failed to check Workflow Rules for changes', { error });
		} finally {
			this.polling = false;
		}
	}
}

function groupExemptions(
	exemptions: readonly WorkflowRuleExemptionEntity[],
): Map<string, Set<string>> {
	const byWorkflow = new Map<string, Set<string>>();
	for (const { workflowId, ruleId } of exemptions) {
		const ruleIds = byWorkflow.get(workflowId) ?? new Set<string>();
		ruleIds.add(ruleId);
		byWorkflow.set(workflowId, ruleIds);
	}
	return byWorkflow;
}
