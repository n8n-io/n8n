import { AGENT_BUILDER_TEST_TOOL_NAME } from '@n8n/api-types';
import { z } from 'zod';

import {
	canEmitBuilderMetric,
	detachBuilderMetricWork,
	emitBuilderMetric,
} from '../../tracing/builder-metric-event';
import type { AgentValidationSummary, OrchestrationContext } from '../../types';

/**
 * Agent builder metrics for the inline builder tools. One orchestrator run is
 * one build pass: it spans the run's HITL suspensions, because a resumed run
 * reuses its orchestration context.
 *
 * - `agent_shown`: the first config change of each agent in the run.
 * - `agent_test`: each Preview test result.
 * - `agent_build`: the run outcome for each agent that the run selected or changed.
 * - `agent_verification`: after a completed run that changed the config, whether
 *   the agent passes the Publish validation with at least one capability.
 */

export type AgentBuildRunStatus = 'completed' | 'cancelled' | 'errored';
type AgentBuildOutcome = 'completed' | 'failed' | 'cancelled';
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
	/** Time the user took to answer the builder suspensions of this run. */
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
	const state = agentStateFor(context, agentId);
	const firstChange = toolCall.configMutated && !state.configUpdated;
	if (toolCall.configMutated) state.configUpdated = true;
	const isTest = toolCall.toolName === AGENT_BUILDER_TEST_TOOL_NAME;
	if (isTest) state.tested = true;

	if (!firstChange && !isTest) return;
	if (!canEmitBuilderMetric(context.tracing)) return;
	const activity = activityFor(state);
	const operation = operationFor(state);
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

function toOutcome(status: AgentBuildRunStatus): AgentBuildOutcome {
	return status === 'errored' ? 'failed' : status;
}

/**
 * Records `agent_build` and `agent_verification` for each agent of the run.
 * Call it on a terminal run status, before the run trace is finalized. A
 * suspended run is not recorded: it reports its real result after the resume.
 * Only the first call for a run records: later calls are no-ops.
 */
export function recordAgentBuildRunOutcome(
	context: OrchestrationContext,
	status: AgentBuildRunStatus,
): void {
	const runState = runStates.get(context);
	runStates.delete(context);
	if (!runState || runState.agents.size === 0) return;
	// No trace, no work: the validation costs a draft read and credential checks.
	if (!canEmitBuilderMetric(context.tracing)) return;
	const outcome = toOutcome(status);
	const delegate = context.domainContext?.builderDelegate;

	for (const [agentId, state] of runState.agents) {
		const activity = activityFor(state);
		const operation = operationFor(state);
		detachBuilderMetricWork(context.tracing, async () => {
			await emitBuilderMetric(context.tracing, 'agent_build', {
				success: outcome === 'completed',
				outcome,
				agent_id: agentId,
				operation,
				activity,
				config_updated: state.configUpdated,
				user_wait_ms: runState.userWaitMs,
			});

			if (!state.configUpdated || outcome !== 'completed') return;
			let validation: AgentValidationSummary | undefined;
			try {
				validation = await delegate?.validateAgent?.(agentId);
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
				operation,
				activity,
			});
		});
	}
}
