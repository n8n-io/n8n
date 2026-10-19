import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { Service } from '@n8n/di';

/**
 * Whether agents use the skills hub, from `N8N_AGENTS_SKILLS_HUB_ENABLED`. The skills module
 * calls `init` once at startup, before the agents module starts, and the value holds for
 * the life of the process, so the startup copy and every read agree. A change needs a
 * restart. With the skills module off, the hub stays off and agents run their inline skills.
 */
@Service()
export class SkillsHubRollout {
	private enabled = false;

	constructor(
		private readonly agentsConfig: AgentsConfig,
		private readonly logger: Logger,
	) {}

	init(): void {
		this.enabled = this.agentsConfig.skillsHubEnabled;
		this.logger.debug('Read the skills hub setting', { enabled: this.enabled });
	}

	get isEnabled(): boolean {
		return this.enabled;
	}
}
