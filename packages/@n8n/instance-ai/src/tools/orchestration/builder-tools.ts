import type { BuiltTool } from '@n8n/agents';
import { isRecord } from '@n8n/utils/is-record';

import {
	resolveAgentBuilderTarget,
	saveAgentBuilderTarget,
	type AgentBuilderTarget,
} from './agent-target-binding';
import {
	emitAgentSnapshotTraceEvent,
	type AgentSnapshotArtifact,
	type AgentSnapshotReason,
} from '../../tracing/agent-snapshot-event';
import type { InstanceAiBuilderDelegate, OrchestrationContext } from '../../types';

/** Emit an `agent-snapshot` for the builder's target. Best-effort at both ends. */
export async function snapshotAgent(
	context: OrchestrationContext,
	delegate: InstanceAiBuilderDelegate,
	target: AgentBuilderTarget,
	reason: AgentSnapshotReason,
): Promise<void> {
	// No trace, no read — the delegate read costs a scope check and two queries.
	if (!context.tracing) return;
	let artifact: AgentSnapshotArtifact | null = null;
	try {
		artifact = (await delegate.readAgentArtifact?.(target.agentId)) ?? null;
	} catch (error) {
		context.logger.debug(
			`[agent-snapshot] ${reason} read for ${target.agentId} failed: ${error instanceof Error ? error.message : String(error)}`,
		);
		return;
	}
	if (!artifact) return;
	await emitAgentSnapshotTraceEvent(context.tracing, {
		agentId: target.agentId,
		projectId: target.projectId,
		reason,
		artifact,
		logger: context.logger,
	});
}

/** The agents module stamps `configMutated: true` and the agent id on a successful config change. */
function mutatedAgentId(result: unknown): string | undefined {
	if (!isRecord(result) || result.configMutated !== true) return undefined;
	return typeof result.agentId === 'string' ? result.agentId : undefined;
}

/**
 * Refresh the target's display name after a config change. The build names
 * and renames the agent through its config, so the binding and the artifact
 * label would otherwise keep a stale name. Best-effort: a stale label is cosmetic.
 */
async function refreshTargetName(
	context: OrchestrationContext,
	delegate: InstanceAiBuilderDelegate,
	target: AgentBuilderTarget,
): Promise<AgentBuilderTarget> {
	const domainContext = context.domainContext;
	try {
		const name = await delegate.resolveAgentName(target.agentId);
		if (!name || name === target.name || !domainContext) return target;
		const renamed = { ...target, name };
		domainContext.agentBuilderTarget = renamed;
		await saveAgentBuilderTarget(domainContext, renamed);
		return renamed;
	} catch (error) {
		context.logger.warn('Failed to refresh agent name after a builder config change', {
			agentId: target.agentId,
			error: error instanceof Error ? error.message : String(error),
		});
		return target;
	}
}

async function onAgentConfigMutated(
	context: OrchestrationContext,
	delegate: InstanceAiBuilderDelegate,
	agentId: string,
): Promise<{ agentName?: string; projectId?: string }> {
	const domainContext = context.domainContext;
	if (!domainContext) return {};
	const bound = await resolveAgentBuilderTarget(domainContext);
	if (bound?.agentId !== agentId) return {};

	const target = await refreshTargetName(context, delegate, bound);
	await snapshotAgent(context, delegate, target, 'config-updated');
	await domainContext.onArtifactChanged?.({
		type: 'agent',
		id: target.agentId,
		projectId: target.projectId,
		...(target.name ? { name: target.name } : {}),
	});
	return { ...(target.name ? { agentName: target.name } : {}), projectId: target.projectId };
}

/**
 * The agents-module builder tools, bound to the thread's selected Agent. A
 * successful config change refreshes the agent name, emits a trace snapshot,
 * and shows the agent artifact, then stamps the name and project on the
 * result so the frontend can label the artifact.
 */
export function createAgentBuilderTools(
	context: OrchestrationContext,
	delegate: InstanceAiBuilderDelegate,
): BuiltTool[] {
	const domainContext = context.domainContext;
	const tools = delegate.getBuilderTools(
		async () =>
			domainContext ? (await resolveAgentBuilderTarget(domainContext))?.agentId : undefined,
		{ threadId: context.threadId, runId: context.runId },
	);

	return tools.map((tool) => {
		const handler = tool.handler;
		if (!handler) return tool;
		return {
			...tool,
			handler: async (input, ctx) => {
				const result = await handler(input, ctx);
				const agentId = mutatedAgentId(result);
				if (!agentId || !isRecord(result)) return result;
				return { ...result, ...(await onAgentConfigMutated(context, delegate, agentId)) };
			},
		};
	});
}
