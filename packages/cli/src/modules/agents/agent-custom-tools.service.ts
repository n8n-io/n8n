import { type ToolDescriptor } from '@n8n/agents';
import {
	type AgentJsonConfig,
	type AgentJsonToolConfig,
	CUSTOM_TOOL_ID_REGEX,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import isEqual from 'lodash/isEqual';
import { UserError } from 'n8n-workflow';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import {
	AgentModificationTelemetryService,
	type AgentMutationTelemetryContext,
	diffAgentConfigParts,
} from './agent-modification-telemetry.service';
import { AgentRuntimeCacheService } from './agent-runtime-cache.service';
import type { Agent } from './entities/agent.entity';
import { AgentRepository } from './repositories/agent.repository';
import { isUnconfiguredAgent } from './utils/agent-capabilities';
import { markAgentDraftDirty } from './utils/agent-draft.utils';

type AgentToolEntries = Agent['tools'];

@Service()
export class AgentCustomToolsService {
	constructor(
		private readonly logger: Logger,
		private readonly agentRepository: AgentRepository,
		private readonly runtimeCacheService: AgentRuntimeCacheService,
		private readonly modificationTelemetry: AgentModificationTelemetryService,
	) {}

	/**
	 * Validate and persist a custom tool for an agent.
	 * The tool code is described in an isolate, and the descriptor + code
	 * are stored in the agent's `tools` column.
	 */
	async buildCustomTool(
		agentId: string,
		projectId: string,
		code: string,
		descriptor: ToolDescriptor,
		context: AgentMutationTelemetryContext,
		options: { recordTelemetry?: boolean } = {},
	): Promise<{ ok: boolean; id: string; descriptor: ToolDescriptor }> {
		const entity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!entity) throw new NotFoundError('Agent not found');

		if (!CUSTOM_TOOL_ID_REGEX.test(descriptor.name)) {
			throw new UserError(
				`Custom tool name "${descriptor.name}" contains invalid characters. Only letters, numbers, and underscores are allowed.`,
			);
		}

		const toolId = descriptor.name;
		const nextEntry = { code, descriptor };
		if (isEqual(entity.tools?.[toolId], nextEntry)) {
			return { ok: true, id: toolId, descriptor };
		}

		const previousSchema = entity.schema ?? null;
		const previousIntegrations = entity.integrations ?? [];
		const wasUnconfigured = isUnconfiguredAgent(previousSchema, previousIntegrations);

		entity.tools = {
			...entity.tools,
			[toolId]: nextEntry,
		};

		markAgentDraftDirty(entity);
		this.runtimeCacheService.clearRuntimes(agentId);
		const saved = await this.agentRepository.save(entity);
		if (options.recordTelemetry !== false) {
			this.modificationTelemetry.record({
				agent: saved,
				projectId,
				user: context.user,
				by: context.modifiedBy,
				changedParts: diffAgentConfigParts(
					previousSchema,
					saved.schema,
					previousIntegrations,
					saved.integrations ?? [],
					{ tools: true },
				),
				wasUnconfigured,
			});
		}

		this.logger.debug('Built custom tool', { agentId, projectId, toolId });

		return { ok: true, id: toolId, descriptor };
	}

	/**
	 * Remove a custom tool from an agent.
	 */
	async deleteCustomTool(
		agentId: string,
		projectId: string,
		toolId: string,
		context: AgentMutationTelemetryContext,
	): Promise<void> {
		const entity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!entity) throw new NotFoundError('Agent not found');
		if (!entity.tools?.[toolId]) return;

		const previousSchema = entity.schema ?? null;
		const previousIntegrations = entity.integrations ?? [];
		const wasUnconfigured = isUnconfiguredAgent(previousSchema, previousIntegrations);

		const tools = { ...entity.tools };
		delete tools[toolId];
		entity.tools = tools;

		if (entity.schema?.tools) {
			entity.schema.tools = entity.schema.tools.filter(
				(t: AgentJsonToolConfig) => !(t.type === 'custom' && 'id' in t && t.id === toolId),
			);
		}

		markAgentDraftDirty(entity);
		this.runtimeCacheService.clearRuntimes(agentId);
		const saved = await this.agentRepository.save(entity);
		this.modificationTelemetry.record({
			agent: saved,
			projectId,
			user: context.user,
			by: context.modifiedBy,
			changedParts: diffAgentConfigParts(
				previousSchema,
				saved.schema,
				previousIntegrations,
				saved.integrations ?? [],
				{ tools: true },
			),
			wasUnconfigured,
		});

		this.logger.debug('Deleted custom tool', { agentId, projectId, toolId });
	}

	private getMissingCustomToolIds(
		config: AgentJsonConfig | null,
		tools: AgentToolEntries,
	): string[] {
		const refs = (config?.tools ?? []).filter(
			(ref): ref is Extract<AgentJsonToolConfig, { type: 'custom' }> => ref.type === 'custom',
		);
		const seen = new Set<string>();
		const missing: string[] = [];

		for (const ref of refs) {
			if (seen.has(ref.id)) continue;
			seen.add(ref.id);
			if (!tools[ref.id]) missing.push(ref.id);
		}

		return missing;
	}

	snapshotConfiguredTools(
		config: AgentJsonConfig | null,
		tools: AgentToolEntries,
	): AgentToolEntries | null {
		if (!config) return null;
		const missing = this.getMissingCustomToolIds(config, tools);
		if (missing.length > 0) {
			throw new UserError(`Cannot publish agent with missing custom tools: ${missing.join(', ')}`);
		}

		const snapshot: AgentToolEntries = {};
		for (const ref of config.tools ?? []) {
			if (ref.type !== 'custom') continue;
			const tool = tools[ref.id];
			if (tool) snapshot[ref.id] = tool;
		}
		return snapshot;
	}
}
