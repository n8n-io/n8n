import { type WorkflowReviewsPolicy, workflowReviewsPolicySchema } from '@n8n/api-types';
import { SettingsRepository, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';
import { UserError } from '@n8n/errors';

import { WORKFLOW_REVIEW_POLICY_SETTINGS_KEY } from '@/constants/workflow-reviews';

const DEFAULT_POLICY = { enabled: false };

/** A broken value gives the default policy. */
function parsePolicy(value: string): WorkflowReviewsPolicy {
	const parsed = workflowReviewsPolicySchema.safeParse(
		jsonParse(value, { fallbackValue: DEFAULT_POLICY }),
	);
	return parsed.success ? parsed.data : DEFAULT_POLICY;
}

@Service()
export class WorkflowReviewPolicyService {
	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly transactionRunner: TransactionRunner,
	) {}

	async get(): Promise<WorkflowReviewsPolicy> {
		const row = await this.settingsRepository.findByKey(WORKFLOW_REVIEW_POLICY_SETTINGS_KEY);
		if (!row) {
			return DEFAULT_POLICY;
		}

		return parsePolicy(row.value);
	}

	async set(enabled: boolean): Promise<WorkflowReviewsPolicy> {
		return (await this.update({ enabled })).after;
	}

	/**
	 * The read, the merge and the write run under one row lock, so parallel updates keep each
	 * other's keys. `before` comes from the same lock, so callers can compare the two safely.
	 */
	async update(
		patch: Partial<WorkflowReviewsPolicy>,
	): Promise<{ before: WorkflowReviewsPolicy; after: WorkflowReviewsPolicy }> {
		const definedChanges = Object.fromEntries(
			Object.entries(patch).filter(([, value]) => value !== undefined),
		);

		return await this.transactionRunner.run({}, async (ctx) => {
			const row = await this.settingsRepository.getOrCreateWithWriteLock(
				WORKFLOW_REVIEW_POLICY_SETTINGS_KEY,
				JSON.stringify(DEFAULT_POLICY),
				true,
				ctx,
			);

			const before = parsePolicy(row.value);
			const parsed = workflowReviewsPolicySchema.safeParse({ ...before, ...definedChanges });
			if (!parsed.success) {
				throw new UserError('Invalid workflow reviews settings');
			}

			await this.settingsRepository.upsertByKey(
				WORKFLOW_REVIEW_POLICY_SETTINGS_KEY,
				JSON.stringify(parsed.data),
				true,
				ctx,
			);

			return { before, after: parsed.data };
		});
	}
}
