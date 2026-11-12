import type { AgentDto } from '@n8n/api-types';

import type { Agent } from './entities/agent.entity';

type AgentState = Pick<
	AgentDto,
	| 'config'
	| 'configHash'
	| 'isRunnable'
	| 'hasPublishHistory'
	| 'hasVersionHistory'
	| 'skills'
	| 'skillHashes'
	| 'outdatedSkillIds'
	| 'skillVersions'
>;

/** Map the composed document and allowlisted metadata for both create endpoints. */
export function mapAgentDto(agent: Agent, state: AgentState): AgentDto {
	return {
		id: agent.id,
		name: agent.name,
		projectId: agent.projectId ?? '',
		project: agent.project
			? { id: agent.project.id, name: agent.project.name, type: agent.project.type }
			: null,
		availableInMCP: agent.availableInMCP ?? false,
		isArchived: agent.isArchived ?? false,
		versionId: agent.versionId ?? null,
		activeVersionId: agent.activeVersionId ?? null,
		createdAt: agent.createdAt?.toISOString() ?? new Date(0).toISOString(),
		updatedAt: agent.updatedAt?.toISOString() ?? new Date(0).toISOString(),
		config: state.config,
		configHash: state.configHash,
		tools: agent.tools ?? {},
		activeVersion: agent.activeVersion
			? {
					versionId: agent.activeVersion.versionId,
					integrations: agent.activeVersion.schema?.integrations ?? [],
				}
			: null,
		isRunnable: state.isRunnable,
		hasPublishHistory: state.hasPublishHistory,
		hasVersionHistory: state.hasVersionHistory,
		skills: state.skills,
		skillHashes: state.skillHashes,
		outdatedSkillIds: state.outdatedSkillIds,
		skillVersions: state.skillVersions,
	};
}
