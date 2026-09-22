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

import { getAgentOrThrow } from '../utils/get-agent-or-throw';
import { AgentHistoryRepository } from '../repositories/agent-history.repository';
import { AgentRepository } from '../repositories/agent.repository';
import { getAgentRuntimeAssets } from '../utils/agent-runtime-assets';

export interface ResolveSubAgentSourceContext {
	projectId: string;
	/**
	 * Resolve the published version instead of the current draft. Set for
	 * production runs, mirroring how sub-workflows and "Message an Agent"
	 * resolve referenced entities.
	 */
	usePublishedVersion?: boolean;
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
	 * Resolve a saved n8n agent into a runnable config plus its tool/skill
	 * assets: a pinned historical version (resumes), the published version
	 * (production runs), or the current draft (test runs).
	 */
	async resolveForRuntime(
		source: SubAgentSource,
		context: ResolveSubAgentSourceContext,
	): Promise<ResolvedSubAgentRuntimeSource> {
		const agent = await getAgentOrThrow(this.agentRepository, source.agentId, context.projectId);

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

		if (context.usePublishedVersion) {
			const activeVersion = agent.activeVersion;
			if (!activeVersion?.schema) {
				throw new UserError(
					`Sub-agent "${agent.name}" is not published. Publish it before delegating to it in a production run.`,
				);
			}

			return {
				source: {
					sourceId: source.agentId,
					versionId: activeVersion.versionId,
					config: this.toRunnableConfig(activeVersion.schema),
				},
				...getAgentRuntimeAssets(activeVersion),
			};
		}

		if (!agent.schema) {
			throw new UserError(`Sub-agent "${source.agentId}" has no config`);
		}

		return {
			source: {
				sourceId: source.agentId,
				config: this.toRunnableConfig(agent.schema),
			},
			...getAgentRuntimeAssets(agent),
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
