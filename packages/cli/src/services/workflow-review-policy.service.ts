import { type WorkflowReviewsPolicy, workflowReviewsPolicySchema } from '@n8n/api-types';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';
import { UserError } from '@n8n/errors';

import { WORKFLOW_REVIEW_POLICY_SETTINGS_KEY } from '@/constants/workflow-reviews';

const DEFAULT_POLICY = { enabled: false };

@Service()
export class WorkflowReviewPolicyService {
	constructor(private readonly settingsRepository: SettingsRepository) {}

	async get(): Promise<WorkflowReviewsPolicy> {
		const row = await this.settingsRepository.findByKey(WORKFLOW_REVIEW_POLICY_SETTINGS_KEY);
		if (!row) {
			return DEFAULT_POLICY;
		}

		const parsed = workflowReviewsPolicySchema.safeParse(
			jsonParse(row.value, { fallbackValue: DEFAULT_POLICY }),
		);
		if (!parsed.success) {
			return DEFAULT_POLICY;
		}

		return parsed.data;
	}

	async set(enabled: boolean): Promise<WorkflowReviewsPolicy> {
		return await this.update({ enabled });
	}

	async update(patch: Partial<WorkflowReviewsPolicy>): Promise<WorkflowReviewsPolicy> {
		const definedChanges = Object.fromEntries(
			Object.entries(patch).filter(([, value]) => value !== undefined),
		);

		const parsed = workflowReviewsPolicySchema.safeParse({
			...(await this.get()),
			...definedChanges,
		});
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
}
