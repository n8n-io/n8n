import {
	RunnableAgentJsonConfigSchema,
	type AgentJsonConfig,
	type ResolvedSubAgentSource,
	type SubAgentSource,
} from '@n8n/api-types';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { jsonParse, UnexpectedError, UserError } from 'n8n-workflow';

import { NotFoundError } from '@n8n/errors';

import { getAgentOrThrow } from '../utils/get-agent-or-throw';
import { AgentHistoryRepository } from '../repositories/agent-history.repository';
import { AgentRepository } from '../repositories/agent.repository';
import { getAgentRuntimeAssets, type AgentRuntimeAssets } from '../utils/agent-runtime-assets';
import { SkillHubService } from '../skills-hub/skill-hub.service';

export interface ResolveSubAgentSourceContext {
	projectId: string;
	/**
	 * Resolve the published version instead of the current draft. Set for
	 * production runs, mirroring how sub-workflows and "Message an Agent"
	 * resolve referenced entities.
	 */
	usePublishedVersion?: boolean;
	/** Saved background configuration, including draft tool and skill bodies. */
	runtimeSnapshot?: string;
}

export interface ResolvedSubAgentRuntimeSource extends AgentRuntimeAssets {
	source: ResolvedSubAgentSource;
}

@Service()
export class SubAgentSourceResolver {
	constructor(
		private readonly agentRepository: AgentRepository,
		private readonly agentHistoryRepository: AgentHistoryRepository,
		private readonly skillHub: SkillHubService,
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
		if (context.runtimeSnapshot !== undefined) {
			const saved = jsonParse<ResolvedSubAgentRuntimeSource | null>(context.runtimeSnapshot, {
				fallbackValue: null,
			});
			if (
				!isRecord(saved) ||
				!isRecord(saved.source) ||
				typeof saved.source.sourceId !== 'string'
			) {
				throw new UnexpectedError('Invalid saved background task configuration');
			}
			if (saved.source.sourceId !== source.agentId) {
				throw new UserError('Saved background task configuration does not match this agent');
			}
			const result = RunnableAgentJsonConfigSchema.safeParse(saved.source.config);
			if (!result.success) {
				throw new UnexpectedError('Invalid saved background task configuration', {
					cause: result.error,
				});
			}
			return {
				...saved,
				source: { ...saved.source, config: result.data },
			};
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
				skills: await this.skillHub.resolvePinnedSkills(version.versionId),
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
				skills: await this.skillHub.resolvePinnedSkills(activeVersion.versionId),
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
			skills: await this.skillHub.resolveDraftSkills(agent.schema),
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
