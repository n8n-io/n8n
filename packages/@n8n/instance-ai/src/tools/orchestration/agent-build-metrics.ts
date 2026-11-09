import { AGENT_BUILDER_TEST_TOOL_NAME } from '@n8n/api-types';
import { z } from 'zod';

import {
	canEmitBuilderMetric,
	detachBuilderMetricWork,
	emitBuilderMetric,
} from '../../tracing/builder-metric-event';
import type { AgentValidationSummary, OrchestrationContext } from '../../types';

/**
 * Agent builder metrics for the inline builder tools. Each one is emitted from
 * the builder tool call that caused it, so it shares the tool span's trace.
 *
 * - `agent_shown`: the first config change of each agent in the run.
 * - `agent_build`: each successful config change.
 * - `agent_verification`: after each successful config change, whether the
 *   agent passes the Publish validation with at least one capability.
 * - `agent_test`: each Preview test result.
 */

/** Same values as the old build-agent `activity` input, derived from what the run did. */
type AgentBuildActivity = 'creating' | 'working' | 'testing' | 'exploring';

interface AgentBuildState {
	created: boolean;
	configUpdated: boolean;
	tested: boolean;
}

interface RunBuildState {
	agents: Map<string, AgentBuildState>;
	suspendedAt?: number;
	/** Time the user took to answer the builder suspensions since the last config change. */
	userWaitMs?: number;
}

const runStates = new WeakMap<OrchestrationContext, RunBuildState>();

function runStateFor(context: OrchestrationContext): RunBuildState {
	let state = runStates.get(context);
	if (!state) {
		state = { agents: new Map() };
		runStates.set(context, state);
	}
	return state;
}

function agentStateFor(context: OrchestrationContext, agentId: string): AgentBuildState {
	const { agents } = runStateFor(context);
	let state = agents.get(agentId);
	if (!state) {
		state = { created: false, configUpdated: false, tested: false };
		agents.set(agentId, state);
	}
	return state;
}

function activityFor(state: AgentBuildState): AgentBuildActivity {
	if (state.created) return 'creating';
	if (state.configUpdated) return 'working';
	if (state.tested) return 'testing';
	return 'exploring';
}

/** Same `operation` values as the `workflow_build` metric, so one query can group both. */
function operationFor(state: AgentBuildState): 'create' | 'update' {
	return state.created ? 'create' : 'update';
}

/** A resume that rebuilds the orchestration context continues the same run. */
export function carryAgentBuildRunState(
	previous: OrchestrationContext,
	rebuilt: OrchestrationContext,
): void {
	const state = runStates.get(previous);
	if (!state || previous === rebuilt) return;
	runStates.delete(previous);
	runStates.set(rebuilt, state);
}

export function recordAgentSelected(
	context: OrchestrationContext,
	agentId: string,
	options: { created: boolean },
): void {
	const state = agentStateFor(context, agentId);
	if (options.created) state.created = true;
}

export function recordAgentBuilderSuspended(context: OrchestrationContext): void {
	runStateFor(context).suspendedAt = Date.now();
}

export function recordAgentBuilderResumed(context: OrchestrationContext): void {
	const state = runStateFor(context);
	// A resume after a restart rebuilds the context, so the suspension time is unknown.
	if (state.suspendedAt === undefined) return;
	state.userWaitMs = (state.userWaitMs ?? 0) + Math.max(0, Date.now() - state.suspendedAt);
	state.suspendedAt = undefined;
}

const agentTestOutputSchema = z.object({
	status: z.string().catch('unknown'),
	code: z.string().optional().catch(undefined),
});

function readAgentTestResult(result: {
	isError: boolean;
	output?: unknown;
}): { status: string; code?: string } {
	if (result.isError) return { status: 'error' };
	const output = agentTestOutputSchema.safeParse(result.output);
	return output.success ? output.data : { status: 'unknown' };
}

/** Records one settled (not suspended) builder tool call on `agentId`. */
export function recordAgentBuilderToolResult(
	context: OrchestrationContext,
	agentId: string,
	toolCall: { toolName: string; isError: boolean; output?: unknown; configMutated: boolean },
): void {
	const runState = runStateFor(context);
	const state = agentStateFor(context, agentId);
	const firstChange = toolCall.configMutated && !state.configUpdated;
	if (toolCall.configMutated) state.configUpdated = true;
	const isTest = toolCall.toolName === AGENT_BUILDER_TEST_TOOL_NAME;
	if (isTest) state.tested = true;

	if (!toolCall.configMutated && !isTest) return;
	if (!canEmitBuilderMetric(context.tracing)) return;
	const activity = activityFor(state);
	const operation = operationFor(state);
	const userWaitMs = toolCall.configMutated ? runState.userWaitMs : undefined;
	if (toolCall.configMutated) runState.userWaitMs = undefined;

	detachBuilderMetricWork(context.tracing, async () => {
		// The open agent panel refetches on the first change, so the user first sees the built agent here.
		if (firstChange) {
			await emitBuilderMetric(context.tracing, 'agent_shown', {
				success: true,
				agent_id: agentId,
				operation,
				activity,
				tool_name: toolCall.toolName,
			});
		}
		if (toolCall.configMutated) {
			await emitBuilderMetric(context.tracing, 'agent_build', {
				success: true,
				outcome: 'completed',
				agent_id: agentId,
				operation,
				activity,
				config_updated: true,
				tool_name: toolCall.toolName,
				user_wait_ms: userWaitMs,
			});
			await emitAgentVerification(context, agentId, { operation, activity });
		}
		if (isTest) {
			const test = readAgentTestResult(toolCall);
			await emitBuilderMetric(context.tracing, 'agent_test', {
				success: test.status === 'completed',
				status: test.status,
				code: test.code,
				agent_id: agentId,
			});
		}
	});
}

async function emitAgentVerification(
	context: OrchestrationContext,
	agentId: string,
	fields: { operation: 'create' | 'update'; activity: AgentBuildActivity },
): Promise<void> {
	let validation: AgentValidationSummary | undefined;
	try {
		validation = await context.domainContext?.builderDelegate?.validateAgent?.(agentId);
	} catch (error) {
		context.logger.debug(
			`[agent-build-metrics] validation for ${agentId} failed: ${error instanceof Error ? error.message : String(error)}`,
		);
		return;
	}
	if (!validation) return;
	await emitBuilderMetric(context.tracing, 'agent_verification', {
		success: validation.valid && validation.capabilityCount > 0,
		valid: validation.valid,
		issue_codes: validation.issueCodes.join(','),
		issue_count: validation.issueCount,
		capability_count: validation.capabilityCount,
		agent_id: agentId,
		...fields,
	});
}
