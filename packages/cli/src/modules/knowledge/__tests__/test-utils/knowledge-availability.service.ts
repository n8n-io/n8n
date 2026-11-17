import { KNOWLEDGE_COLLECTIONS_FLAG } from '@n8n/api-types';
import type { ModuleRegistry } from '@n8n/backend-common';
import type { PostHogClient } from '@n8n/backend-services';
import { mock } from 'vitest-mock-extended';

import type { SandboxSettingsService } from '@/services/sandbox-settings.service';

import { KnowledgeAvailabilityService } from '../../knowledge-availability.service';

/**
 * A real `KnowledgeAvailabilityService` over mocked settings, so a consumer test
 * exercises its own check instead of a mocked assertion. All inputs default to on.
 */
export function makeKnowledgeAvailabilityService({
	isSandboxEnabled = true,
	isKnowledgeActive = true,
	collectionsFlag = true,
}: {
	isSandboxEnabled?: boolean;
	isKnowledgeActive?: boolean;
	/** What PostHog answers for the collections flag. */
	collectionsFlag?: boolean | string;
} = {}): KnowledgeAvailabilityService {
	return new KnowledgeAvailabilityService(
		mock<ModuleRegistry>({ isActive: (name) => name === 'knowledge' && isKnowledgeActive }),
		mock<SandboxSettingsService>({ isAgentSandboxEnabled: () => isSandboxEnabled }),
		mock<PostHogClient>({
			getFeatureFlagForInstance: async (flag) =>
				flag === KNOWLEDGE_COLLECTIONS_FLAG ? collectionsFlag : undefined,
		}),
	);
}
