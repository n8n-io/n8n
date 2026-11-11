import type { AgentDto, AgentListItemDto, AgentSkillVersionInfo } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import type { ValidAgentConfigValidationResponse } from './agent-publish.service';
import { AgentRunnableStateService, type AgentRunnableState } from './agent-runnable-state.service';
import type { Agent } from './entities/agent.entity';

@Service()
export class AgentResponseMapper {
	constructor(private readonly runnableState: AgentRunnableStateService) {}

	async toAgentDto(
		agent: Agent,
		projectId: string,
		user: User,
		draftValidation?: ValidAgentConfigValidationResponse,
	): Promise<AgentDto> {
		const state = await this.runnableState.addRunnableState(
			agent,
			projectId,
			user,
			draftValidation,
		);
		return mapAgentDto(agent, state);
	}

	toAgentListItem(agent: Agent): AgentListItemDto {
		return mapAgentListItem(agent);
	}
}

/** Allowlisted single-agent body. Storage columns stay off the response. */
export function mapAgentDto(agent: Agent, state: AgentRunnableState): AgentDto {
	return {
		id: agent.id,
		name: agent.name ?? '',
		projectId: agent.projectId ?? '',
		project: mapProject(agent.project),
		availableInMCP: agent.availableInMCP ?? false,
		versionId: agent.versionId ?? null,
		activeVersionId: agent.activeVersionId ?? null,
		createdAt: toIsoTimestamp(agent.createdAt),
		updatedAt: toIsoTimestamp(agent.updatedAt),
		config: state.config,
		configHash: state.configHash,
		tools: agent.tools ?? {},
		activeVersion: mapActiveVersion(agent),
		isRunnable: state.isRunnable,
		hasPublishHistory: state.hasPublishHistory,
		hasVersionHistory: state.hasVersionHistory,
		skills: state.skills,
		skillHashes: state.skillHashes,
		outdatedSkillIds: state.outdatedSkillIds,
		skillVersions: state.skillVersions,
	};
}

/**
 * List row. `config` is absent so the row is not a full-replace body.
 * The list services attach `skillVersions` to the row (one batched read per
 * page), so the card can flag skill-only changes without loading the agent.
 */
export function mapAgentListItem(
	agent: Agent & { skillVersions?: Record<string, AgentSkillVersionInfo> },
): AgentListItemDto {
	return {
		id: agent.id,
		name: agent.name ?? '',
		projectId: agent.projectId ?? '',
		project: mapProject(agent.project),
		availableInMCP: agent.availableInMCP ?? false,
		versionId: agent.versionId ?? null,
		activeVersionId: agent.activeVersionId ?? null,
		createdAt: toIsoTimestamp(agent.createdAt),
		updatedAt: toIsoTimestamp(agent.updatedAt),
		personalisation: agent.schema?.personalisation ?? null,
		hasConfig: isPresent(agent.schema),
		...(agent.skillVersions === undefined ? {} : { skillVersions: agent.skillVersions }),
	};
}

function mapProject(project: Agent['project']): AgentDto['project'] {
	if (!project?.id || !project.name || !isPresent(project.type)) {
		return null;
	}
	return { id: project.id, name: project.name, type: project.type };
}

function mapActiveVersion(agent: Agent): AgentDto['activeVersion'] {
	const version = agent.activeVersion;
	if (!version?.versionId) return null;
	const integrations = version.schema?.integrations;
	return {
		versionId: version.versionId,
		integrations: Array.isArray(integrations) ? integrations : [],
	};
}

function isPresent<T>(value: T | null | undefined): value is T {
	return value !== null && value !== undefined;
}

function toIsoTimestamp(value: Date | string | undefined): string {
	if (value instanceof Date) return value.toISOString();
	if (typeof value === 'string' && value.length > 0) return value;
	return new Date(0).toISOString();
}
