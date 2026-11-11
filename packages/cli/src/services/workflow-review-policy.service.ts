import type { ResolvedWorkflowReviewsPolicy, WorkflowReviewsPolicy } from '@n8n/api-types';
import { workflowReviewsPolicySchema } from '@n8n/api-types';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';

import { UserError } from '@n8n/errors';

import { WORKFLOW_REVIEW_POLICY_SETTINGS_KEY } from '@/constants/workflow-reviews';

const DEFAULT_POLICY: ResolvedWorkflowReviewsPolicy = {
	enabled: false,
	publishingNeedsApproval: false,
	promotionReviewsEnabled: false,
	promotingNeedsApproval: false,
};

/**
 * The instance-wide workflow reviews policy, persisted as one settings row.
 * The requirement flags default to off so a row written before they existed
 * still reads as "reviews are optional".
 */
@Service()
export class WorkflowReviewPolicyService {
	constructor(private readonly settingsRepository: SettingsRepository) {}

	async get(): Promise<ResolvedWorkflowReviewsPolicy> {
		const row = await this.settingsRepository.findByKey(WORKFLOW_REVIEW_POLICY_SETTINGS_KEY);
		if (!row) return { ...DEFAULT_POLICY };

		const parsed = workflowReviewsPolicySchema.safeParse(
			jsonParse(row.value, { fallbackValue: DEFAULT_POLICY }),
		);
		if (!parsed.success) return { ...DEFAULT_POLICY };
		return parsed.data;
	}

	/** Merges a partial update. Omitted flags keep their stored value. */
	async update(patch: Partial<WorkflowReviewsPolicy>): Promise<ResolvedWorkflowReviewsPolicy> {
		const current = await this.get();
		const parsed = workflowReviewsPolicySchema.safeParse({ ...current, ...patch });
		if (!parsed.success) {
			throw new UserError('Invalid workflow reviews settings');
		}

		await this.settingsRepository.upsert(
			{
				key: WORKFLOW_REVIEW_POLICY_SETTINGS_KEY,
				value: JSON.stringify(parsed.data),
				loadOnStartup: true,
			},
			['key'],
		);
		return parsed.data;
	}

	async set(enabled: boolean): Promise<ResolvedWorkflowReviewsPolicy> {
		return await this.update({ enabled });
	}
}
