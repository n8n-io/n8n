import { Service } from '@n8n/di';

import { SkillAgentsProxy } from './skill-agents-proxy.service';

/**
 * Whether the skills hub is on: the skills module started, and the agents module registered
 * its `SkillAgentsProvider`. Every entry point (REST, MCP, n8n Assistant) and every agent read
 * checks this one gate.
 *
 * The skills module calls `init` once at startup, before the agents module starts. With the
 * skills module off, the hub stays off and agents run their inline skills. With the agents
 * module off, the hub stays off too: only agents use skills today, and only they can tell
 * which agents use one, which the delete guard needs.
 */
@Service()
export class SkillsHubRollout {
	private started = false;

	constructor(private readonly skillAgents: SkillAgentsProxy) {}

	init(): void {
		this.started = true;
	}

	get isEnabled(): boolean {
		return this.started && this.skillAgents.hasProvider;
	}
}
