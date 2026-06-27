import {
	type AgentSkill,
	RunnableAgentJsonConfigSchema,
	type AgentJsonConfig,
	type ResolvedSubAgentSource,
	type SubAgentSource,
} from '@n8n/api-types';
import type { ToolDescriptor } from '@n8n/agents';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { AgentHistory } from '../entities/agent-history.entity';
import type { Agent } from '../entities/agent.entity';
import { AgentSkillsService } from '../agent-skills.service';
import { composeJsonConfig } from '../json-config/agent-config-composition';
import { AgentHistoryRepository } from '../repositories/agent-history.repository';
import { AgentRepository } from '../repositories/agent.repository';

export interface ResolveSubAgentSourceContext {
	projectId: string;
}

export interface ResolvedSubAgentRuntimeSource {
	source: ResolvedSubAgentSource;
	toolDescriptors: Record<string, ToolDescriptor>;
	toolCodeByName: Record<string, string>;
	skills: Record<string, AgentSkill>;
}

@Service()
export class SubAgentSourceResolver {
	constructor(
		private readonly agentRepository: AgentRepository,
		private readonly agentHistoryRepository: AgentHistoryRepository,
		private readonly agentSkillsService: AgentSkillsService,
	) {}

	/**
	 * Resolve a saved n8n agent (its current draft, or a pinned published
	 * version) into a runnable config plus its tool/skill assets.
	 */
	async resolveForRuntime(
		source: SubAgentSource,
		context: ResolveSubAgentSourceContext,
	): Promise<ResolvedSubAgentRuntimeSource> {
		const agent = await this.agentRepository.findByIdAndProjectId(
			source.agentId,
			context.projectId,
		);
		if (!agent) {
			throw new NotFoundError(`Agent "${source.agentId}" not found`);
		}

		if (source.versionId) {
			const version = await this.agentHistoryRepository.findByVersionAndAgentId(
				source.versionId,
				source.agentId,
			);
			if (!version) {
				throw new NotFoundError(
					`Version "${source.versionId}" not found for agent "${source.agentId}"`,
				);
			}
			if (!version.schema) {
				throw new UserError(
					`Agent "${source.agentId}" version "${source.versionId}" has no config`,
				);
			}

			return {
				source: {
					sourceId: source.agentId,
					versionId: source.versionId,
					config: this.toRunnableConfig(version.schema),
				},
				...getAgentToolAssets(version),
				skills: await this.agentSkillsService.getSkillMapForVersion(source.versionId),
			};
		}

		const config = composeJsonConfig(agent);
		if (!config) {
			throw new UserError(`Agent "${source.agentId}" has no config`);
		}

		return {
			source: {
				sourceId: source.agentId,
				versionId: agent.versionId ?? undefined,
				config: this.toRunnableConfig(config),
			},
			...getAgentToolAssets(agent),
			skills: await this.agentSkillsService.getSkillMapForAgent(agent.id),
		};
	}

	private toRunnableConfig(config: AgentJsonConfig): ResolvedSubAgentSource['config'] {
		const result = RunnableAgentJsonConfigSchema.safeParse(config);
		if (!result.success) {
			throw new UserError(
				`Invalid sub-agent config: ${result.error.issues[0]?.message ?? 'Invalid config'}`,
			);
		}

		return result.data;
	}
}

function getAgentToolAssets(
	agent: Pick<Agent | AgentHistory, 'tools'>,
): Pick<ResolvedSubAgentRuntimeSource, 'toolDescriptors' | 'toolCodeByName'> {
	const toolDescriptors: Record<string, ToolDescriptor> = {};
	const toolCodeByName: Record<string, string> = {};

	for (const [toolId, toolEntry] of Object.entries(agent.tools ?? {})) {
		toolDescriptors[toolId] = toolEntry.descriptor;
		toolCodeByName[toolEntry.descriptor.name] = toolEntry.code;
	}

	return {
		toolDescriptors,
		toolCodeByName,
	};
}
