import { KNOWLEDGE_COLLECTIONS_FLAG } from '@n8n/api-types';
import type { ModuleRegistry } from '@n8n/backend-common';
import type { PostHogClient } from '@n8n/backend-services';
import { mock } from 'vitest-mock-extended';

import type { SandboxSettingsService } from '@/services/sandbox-settings.service';

import { KnowledgeAvailabilityService } from '../../knowledge-availability.service';
import type { KnowledgeConfig } from '../../knowledge.config';

/**
 * A real `KnowledgeAvailabilityService` over mocked settings, so a consumer test
 * exercises its own check instead of a mocked assertion. All inputs default to on,
 * except the collections override.
 */
export function makeKnowledgeAvailabilityService({
	isSandboxEnabled = true,
	isKnowledgeActive = true,
	collectionsFlag = true,
	collectionsOverride = false,
}: {
	isSandboxEnabled?: boolean;
	isKnowledgeActive?: boolean;
	/** What PostHog answers for the collections flag. */
	collectionsFlag?: boolean | string;
	/** The value of `N8N_KNOWLEDGE_COLLECTIONS_ENABLED`. */
	collectionsOverride?: boolean;
} = {}): KnowledgeAvailabilityService {
	return new KnowledgeAvailabilityService(
		mock<ModuleRegistry>({ isActive: (name) => name === 'knowledge' && isKnowledgeActive }),
		mock<SandboxSettingsService>({ isAgentSandboxEnabled: () => isSandboxEnabled }),
		mock<PostHogClient>({
			getFeatureFlagForInstance: async (flag) =>
				flag === KNOWLEDGE_COLLECTIONS_FLAG ? collectionsFlag : undefined,
		}),
		mock<KnowledgeConfig>({ collectionsEnabled: collectionsOverride }),
	);
}
