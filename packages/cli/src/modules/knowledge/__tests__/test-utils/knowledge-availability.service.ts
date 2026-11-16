import type { ModuleRegistry } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import type { SandboxSettingsService } from '@/services/sandbox-settings.service';

import { KnowledgeAvailabilityService } from '../../knowledge-availability.service';

/**
 * A real `KnowledgeAvailabilityService` over mocked settings, so a consumer test
 * exercises its own check instead of a mocked assertion. Both inputs default to on.
 */
export function makeKnowledgeAvailabilityService({
	isSandboxEnabled = true,
	isKnowledgeActive = true,
}: { isSandboxEnabled?: boolean; isKnowledgeActive?: boolean } = {}): KnowledgeAvailabilityService {
	return new KnowledgeAvailabilityService(
		mock<ModuleRegistry>({ isActive: (name) => name === 'knowledge' && isKnowledgeActive }),
		mock<SandboxSettingsService>({ isAgentSandboxEnabled: () => isSandboxEnabled }),
	);
}
