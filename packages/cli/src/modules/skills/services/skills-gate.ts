import { ModuleRegistry } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { SkillUsageProxy } from './skill-usage-proxy.service';

/**
 * Whether skills are on. Every entry point (REST, MCP, n8n Assistant) checks this gate.
 * Skills have no toggle of their own: they are on while agents, n8n Assistant or instance
 * MCP access is on. Skills also need the agents module: without it, the delete and move
 * guards cannot see the agents that use a skill.
 */
@Service()
export class SkillsGate {
	constructor(
		private readonly skillUsage: SkillUsageProxy,
		private readonly moduleRegistry: ModuleRegistry,
	) {}

	get isEnabled(): boolean {
		const { settings } = this.moduleRegistry;
		return (
			this.skillUsage.isRegistered &&
			(settings.get('agents')?.enabled === true ||
				settings.get('instance-ai')?.enabled === true ||
				settings.get('mcp')?.mcpAccessEnabled === true)
		);
	}
}
