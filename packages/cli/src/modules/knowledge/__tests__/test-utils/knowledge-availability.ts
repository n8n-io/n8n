import type { ModuleRegistry } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import type { SandboxSettingsService } from '@/services/sandbox-settings.service';

import { KnowledgeAvailability } from '../../knowledge-availability';

/**
 * A real `KnowledgeAvailability` over mocked settings, so a consumer test
 * exercises its own check instead of a mocked assertion. Both inputs default to on.
 */
export function makeKnowledgeAvailability({
	sandboxEnabled = true,
	knowledgeActive = true,
}: { sandboxEnabled?: boolean; knowledgeActive?: boolean } = {}): KnowledgeAvailability {
	return new KnowledgeAvailability(
		mock<ModuleRegistry>({ isActive: (name) => name === 'knowledge' && knowledgeActive }),
		mock<SandboxSettingsService>({ isAgentSandboxEnabled: () => sandboxEnabled }),
	);
}
