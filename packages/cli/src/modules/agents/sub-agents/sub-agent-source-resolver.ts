import type { ToolDescriptor } from '@n8n/agents';
import {
	type AgentSkill,
	RunnableAgentJsonConfigSchema,
	type AgentJsonConfig,
	type ResolvedSubAgentSource,
	type SubAgentSource,
} from '@n8n/api-types';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { AgentHistory } from '../entities/agent-history.entity';
import type { Agent } from '../entities/agent.entity';
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
	) {}

	/**
	 * Resolve a saved n8n agent (its current published version, or a pinned
	 * specific version) into a runnable config plus its tool/skill assets.
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
				...getAgentRuntimeAssets(version),
			};
		}

		// No pinned version: resolve the child's current published version at
		// delegation time, not its draft. Reading `agent.activeVersion` fresh
		// (rather than trusting a version baked into the parent's cached
		// runtime) means a re-publish of the child takes effect on the very
		// next delegation, without needing to clear the parent's cache.
		const publishedVersion = agent.activeVersion;
		if (!agent.activeVersionId || !publishedVersion?.schema) {
			throw new UserError(`Sub-agent "${source.agentId}" is not published`);
		}

		return {
			source: {
				sourceId: source.agentId,
				versionId: agent.activeVersionId,
				config: this.toRunnableConfig(publishedVersion.schema),
			},
			...getAgentRuntimeAssets(publishedVersion),
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

function getAgentRuntimeAssets(
	agent: Pick<Agent | AgentHistory, 'tools' | 'skills'>,
): Omit<ResolvedSubAgentRuntimeSource, 'source'> {
	const toolDescriptors: Record<string, ToolDescriptor> = {};
	const toolCodeByName: Record<string, string> = {};

	for (const [toolId, toolEntry] of Object.entries(agent.tools ?? {})) {
		toolDescriptors[toolId] = toolEntry.descriptor;
		toolCodeByName[toolEntry.descriptor.name] = toolEntry.code;
	}

	return {
		toolDescriptors,
		toolCodeByName,
		skills: agent.skills ?? {},
	};
}
