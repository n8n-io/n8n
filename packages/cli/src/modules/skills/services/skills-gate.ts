import { Service } from '@n8n/di';

import { SkillUsageProxy } from './skill-usage-proxy.service';

/**
 * Whether skills are on. Every entry point (REST, MCP, n8n Assistant) checks this gate.
 * Skills need the agents module: without it, the delete and move guards cannot see the
 * agents that use a skill.
 */
@Service()
export class SkillsGate {
	constructor(private readonly skillUsage: SkillUsageProxy) {}

	get isEnabled(): boolean {
		return this.skillUsage.isRegistered;
	}
}
