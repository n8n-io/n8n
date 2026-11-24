import { Service } from '@n8n/di';

export type AgentDirectoryEntry = { name: string; projectId: string };

/** Finds agents by ID. The agents module registers it, so core code does not import that module. */
export interface AgentDirectorySource {
	findAgents(agentIds: string[]): Promise<Map<string, AgentDirectoryEntry>>;
}

/** Without a registered source, no agent is found. */
@Service()
export class AgentDirectory {
	private source?: AgentDirectorySource;

	register(source: AgentDirectorySource) {
		this.source = source;
	}

	async findAgents(agentIds: string[]): Promise<Map<string, AgentDirectoryEntry>> {
		if (!this.source || agentIds.length === 0) return new Map();
		return await this.source.findAgents(agentIds);
	}
}
