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

import {
	type AgentMutationTelemetryContext,
	type AgentMutationSnapshot,
	buildAgentMutationEvent,
	captureAgentMutation,
} from './agent-modification-telemetry.service';
import { AgentSaveCompletionService } from './agent-save-completion.service';
import type { Agent } from './entities/agent.entity';
import { AgentRepository } from './repositories/agent.repository';
import { getAgentOrThrow } from './utils/get-agent-or-throw';
import { markAgentDraftDirty, saveAgentDraftFenced } from './utils/agent-draft.utils';

type AgentToolEntries = Agent['tools'];

@Service()
export class AgentCustomToolsService {
	constructor(
		private readonly logger: Logger,
		private readonly agentRepository: AgentRepository,
		private readonly saveCompletion: AgentSaveCompletionService,
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
	): Promise<{ ok: boolean; id: string; descriptor: ToolDescriptor; changed: boolean }> {
		const entity = await getAgentOrThrow(
			this.agentRepository,
			agentId,
			projectId,
			'Agent not found',
		);

		if (!CUSTOM_TOOL_ID_REGEX.test(descriptor.name)) {
			throw new UserError(
				`Custom tool name "${descriptor.name}" contains invalid characters. Only letters, numbers, and underscores are allowed.`,
			);
		}

		const toolId = descriptor.name;
		const nextEntry = { code, descriptor };
		if (isEqual(entity.tools?.[toolId], nextEntry)) {
			return { ok: true, id: toolId, descriptor, changed: false };
		}

		const previous = captureAgentMutation(entity);

		entity.tools = {
			...entity.tools,
			[toolId]: nextEntry,
		};

		await this.saveToolChanges(entity, projectId, context, previous, options.recordTelemetry);

		this.logger.debug('Built custom tool', { agentId, projectId, toolId });

		return { ok: true, id: toolId, descriptor, changed: true };
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
		const entity = await getAgentOrThrow(
			this.agentRepository,
			agentId,
			projectId,
			'Agent not found',
		);
		if (!entity.tools?.[toolId]) return;

		const previous = captureAgentMutation(entity);

		const tools = { ...entity.tools };
		delete tools[toolId];
		entity.tools = tools;

		if (entity.schema?.tools) {
			entity.schema.tools = entity.schema.tools.filter(
				(t: AgentJsonToolConfig) => !(t.type === 'custom' && 'id' in t && t.id === toolId),
			);
		}

		await this.saveToolChanges(entity, projectId, context, previous);

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
			if (ref.enabled === false) continue;
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
	private async saveToolChanges(
		entity: Agent,
		projectId: string,
		context: AgentMutationTelemetryContext,
		previous: AgentMutationSnapshot,
		recordTelemetry = true,
	): Promise<void> {
		markAgentDraftDirty(entity);
		const saved = await saveAgentDraftFenced(this.agentRepository, entity);
		await this.saveCompletion.bodySaved(
			buildAgentMutationEvent(saved, projectId, context, previous, { tools: true }),
			context.pushRef,
			recordTelemetry,
		);
	}
}
