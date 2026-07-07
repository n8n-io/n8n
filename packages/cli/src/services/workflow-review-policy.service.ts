import { type WorkflowReviewsPolicy, workflowReviewsPolicySchema } from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse, UserError } from 'n8n-workflow';

import {
	isWorkflowReviewsFeatureAvailable,
	WORKFLOW_REVIEW_POLICY_SETTINGS_KEY,
} from '@/constants/workflow-reviews';

const DEFAULT_POLICY: WorkflowReviewsPolicy = { enabled: false };

@Service()
export class WorkflowReviewPolicyService {
	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly licenseState: LicenseState,
	) {}

	isAvailable(): boolean {
		return isWorkflowReviewsFeatureAvailable(this.licenseState.isWorkflowReviewsLicensed());
	}

	async get(): Promise<WorkflowReviewsPolicy | undefined> {
		if (!this.isAvailable()) {
			return undefined;
		}

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
		const parsed = workflowReviewsPolicySchema.safeParse({ enabled });
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
