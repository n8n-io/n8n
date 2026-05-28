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
import { composeJsonConfig } from '../json-config/agent-config-composition';
import { AgentHistoryRepository } from '../repositories/agent-history.repository';
import { AgentRepository } from '../repositories/agent.repository';
import { BUILT_IN_SUB_AGENTS } from './built-in-sub-agents';

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

	async resolve(
		source: SubAgentSource,
		context: ResolveSubAgentSourceContext,
	): Promise<ResolvedSubAgentSource> {
		switch (source.type) {
			case 'inline':
				return {
					type: 'inline',
					config: this.toRunnableConfig(source.config),
				};

			case 'built-in': {
				const config = BUILT_IN_SUB_AGENTS[source.id];
				if (!config) {
					throw new NotFoundError(`Built-in sub-agent "${source.id}" not found`);
				}

				return {
					type: 'built-in',
					sourceId: source.id,
					config: this.toRunnableConfig(applySubAgentOverrides(config, source.overrides)),
				};
			}

			case 'n8n-agent':
				return await this.resolveN8nAgent(source, context);
		}
	}

	async resolveForRuntime(
		source: SubAgentSource,
		context: ResolveSubAgentSourceContext,
	): Promise<ResolvedSubAgentRuntimeSource> {
		switch (source.type) {
			case 'inline':
			case 'built-in':
				return {
					source: await this.resolve(source, context),
					toolDescriptors: {},
					toolCodeByName: {},
					skills: {},
				};

			case 'n8n-agent':
				return await this.resolveN8nAgentForRuntime(source, context);
		}
	}

	private async resolveN8nAgent(
		source: Extract<SubAgentSource, { type: 'n8n-agent' }>,
		context: ResolveSubAgentSourceContext,
	): Promise<ResolvedSubAgentSource> {
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
				type: 'n8n-agent',
				sourceId: source.agentId,
				versionId: source.versionId,
				config: this.toRunnableConfig(applySubAgentOverrides(version.schema, source.overrides)),
			};
		}

		const config = composeJsonConfig(agent);
		if (!config) {
			throw new UserError(`Agent "${source.agentId}" has no config`);
		}

		return {
			type: 'n8n-agent',
			sourceId: source.agentId,
			versionId: agent.versionId ?? undefined,
			config: this.toRunnableConfig(applySubAgentOverrides(config, source.overrides)),
		};
	}

	private async resolveN8nAgentForRuntime(
		source: Extract<SubAgentSource, { type: 'n8n-agent' }>,
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

			const resolvedSource: ResolvedSubAgentSource = {
				type: 'n8n-agent',
				sourceId: source.agentId,
				versionId: source.versionId,
				config: this.toRunnableConfig(applySubAgentOverrides(version.schema, source.overrides)),
			};

			return {
				source: resolvedSource,
				...getAgentRuntimeAssets(version),
			};
		}

		const config = composeJsonConfig(agent);
		if (!config) {
			throw new UserError(`Agent "${source.agentId}" has no config`);
		}

		const resolvedSource: ResolvedSubAgentSource = {
			type: 'n8n-agent',
			sourceId: source.agentId,
			versionId: agent.versionId ?? undefined,
			config: this.toRunnableConfig(applySubAgentOverrides(config, source.overrides)),
		};

		return {
			source: resolvedSource,
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

export function applySubAgentOverrides(
	base: AgentJsonConfig,
	overrides: Partial<AgentJsonConfig> | undefined,
): AgentJsonConfig {
	if (!overrides) return base;

	const merged = {
		...base,
		...overrides,
	};

	if (base.config === undefined && overrides.config === undefined) return merged;

	return {
		...merged,
		config: {
			...base.config,
			...overrides.config,
		},
	};
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
