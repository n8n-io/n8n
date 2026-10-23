import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import { SkillAgentsProxy } from './skill-agents-proxy.service';

/**
 * Whether the skills hub is on: `N8N_AGENTS_SKILLS_HUB_ENABLED` is set, and the agents module
 * registered its `SkillAgentsProvider`. Every entry point (REST, MCP, n8n Assistant) and
 * every agent read checks this one gate.
 *
 * The skills module calls `init` once at startup, before the agents module starts, and the
 * setting holds for the life of the process, so the startup copy and every read agree. A
 * change needs a restart. With the skills module off, the hub stays off and agents run their
 * inline skills. With the agents module off, the hub stays off too: only agents use skills
 * today, and only they can tell which agents use one, which the delete guard needs.
 */
@Service()
export class SkillsHubRollout {
	private enabled = false;

	constructor(
		private readonly agentsConfig: AgentsConfig,
		private readonly logger: Logger,
		private readonly skillAgents: SkillAgentsProxy,
	) {}

	init(): void {
		this.enabled = this.agentsConfig.skillsHubEnabled;
		this.logger.debug('Read the skills hub setting', { enabled: this.enabled });
	}

	get isEnabled(): boolean {
		return this.enabled && this.skillAgents.hasProvider;
	}
}
