import { ModuleRegistry } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { NotFoundError } from '@n8n/errors';

import { SandboxSettingsService } from '@/services/sandbox-settings.service';

/**
 * Answers whether knowledge is available on this instance. Consumers ask here
 * before they call into the module and derive their own availability flags from
 * these answers instead of computing them.
 */
@Service()
export class KnowledgeAvailabilityService {
	constructor(
		private readonly moduleRegistry: ModuleRegistry,
		private readonly sandboxSettingsService: SandboxSettingsService,
	) {}

	/**
	 * Whether the knowledge module is active. `N8N_DISABLED_MODULES=knowledge`
	 * skips its `init()` and `entities()`. Consumers check this before every
	 * knowledge call so the feature switches off cleanly; once the module owns its
	 * entities, an unguarded repository call would fail with a TypeORM metadata
	 * error instead.
	 */
	isModuleActive(): boolean {
		return this.moduleRegistry.isActive('knowledge');
	}

	/** Uploaded-file knowledge needs the module and a sandbox for retrieval. */
	isFileKnowledgeEnabled(): boolean {
		return this.isModuleActive() && this.sandboxSettingsService.isAgentSandboxEnabled();
	}

	/** For calls that need the module's entities but not the sandbox, such as file cleanup. */
	assertModuleActive(): void {
		if (!this.isModuleActive()) {
			throw new NotFoundError('The knowledge module is not active');
		}
	}
}
