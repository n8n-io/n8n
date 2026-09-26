/**
 * Agent Builder tools on the orchestrator. The agents module owns the tool
 * implementations (config reads and writes, skills, tasks, channels,
 * credentials, test runs, publishing); this module binds them to the target
 * Agent that `select-agent` resolved for the thread.
 *
 * The target is resolved on every call, not when the tools are built: the
 * model can create or switch Agents between two builder calls in one run, and
 * a suspended builder tool can resume in a later process.
 */
import type { BuiltTool } from '@n8n/agents';
import { isRecord } from '@n8n/utils/is-record';

import {
	resolveAgentBuilderTarget,
	saveAgentBuilderTarget,
	type AgentBuilderTarget,
} from './agent-target-binding';
import { snapshotAgent } from '../../tracing/agent-snapshot-event';
import type { InstanceAiToolRegistry, OrchestrationContext } from '../../types';
import { ORCHESTRATION_TOOL_IDS } from '../tool-ids';

const NO_TARGET_ERROR = `No Agent is selected in this conversation. Call \`${ORCHESTRATION_TOOL_IDS.SELECT_AGENT}\` first.`;

function isConfigMutation(result: unknown): boolean {
	return isRecord(result) && result.configMutated === true;
}

export function createAgentBuilderTools(context: OrchestrationContext): InstanceAiToolRegistry {
	const registry: InstanceAiToolRegistry = new Map();
	const domainContext = context.domainContext;
	const delegate = domainContext?.builderDelegate;
	if (!domainContext || !delegate) return registry;

	const resolveTarget = async () => await resolveAgentBuilderTarget(domainContext);
	// The build names and renames the agent through its config, so the binding's
	// name (which labels the agent artifact) can go stale. Best-effort: a stale
	// label is cosmetic and must not fail a successful config write.
	const refreshTargetName = async (target: AgentBuilderTarget) => {
		try {
			const name = await delegate.resolveAgentName(target.agentId);
			if (!name || name === target.name) return;
			const renamed = { ...target, name };
			domainContext.agentBuilderTarget = renamed;
			await saveAgentBuilderTarget(domainContext, renamed);
		} catch (error) {
			context.logger.warn('Failed to refresh agent name after a config change', {
				agentId: target.agentId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	};
	const tools = delegate.createBuilderTools({
		resolveTargetAgentId: async () => (await resolveTarget())?.agentId,
		threadId: context.threadId,
		runId: context.runId,
	});

	for (const tool of tools) {
		const handler = tool.handler;
		if (!handler) continue;
		const wrapped: BuiltTool = {
			...tool,
			handler: async (input, ctx) => {
				const target = await resolveTarget();
				if (!target) return { ok: false, errors: [{ message: NO_TARGET_ERROR }] };
				const result = await handler(input, ctx);
				if (isConfigMutation(result)) {
					await refreshTargetName(target);
					await snapshotAgent(context, delegate, target, 'config-updated');
				}
				return result;
			},
		};
		registry.set(tool.name, wrapped);
	}
	return registry;
}
