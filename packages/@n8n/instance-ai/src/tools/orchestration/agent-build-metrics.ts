import { AGENT_BUILDER_TEST_TOOL_NAME, type InstanceAiAgentActivity } from '@n8n/api-types';
import { z } from 'zod';

import { hasConfigMutationMarker } from '../../stream/work-summary-accumulator';
import {
	canEmitBuilderMetric,
	detachBuilderMetricWork,
	emitBuilderMetric,
} from '../../tracing/builder-metric-event';
import type {
	AgentValidationSummary,
	BuilderTurnStream,
	InstanceAiBuilderDelegate,
	OrchestrationContext,
} from '../../types';

/**
 * A pass that suspends for user input is not recorded: like a suspended
 * `workflow_build`, it reports its real result after the resume.
 * `cancelled`: the user stopped the run before the pass settled.
 */
export type AgentBuildOutcome = 'completed' | 'failed' | 'cancelled';

/** Same `operation` values as the `workflow_build` metric, so one query can group both. */
function toBuildOperation(activity: InstanceAiAgentActivity): 'create' | 'update' {
	return activity === 'creating' ? 'create' : 'update';
}

/**
 * Records the outcome of one builder pass (`agent_build`). After a pass that
 * completed and changed the config, it also records whether the agent now passes
 * the Publish validation with at least one capability (`agent_verification`).
 * All of it runs detached: a metric must not delay the tool result or a cancel,
 * and the trace stays open until the work settles so the spans still export.
 */
export function emitAgentBuildMetrics(args: {
	context: OrchestrationContext;
	delegate: InstanceAiBuilderDelegate;
	agentId: string;
	activity: InstanceAiAgentActivity;
	outcome: AgentBuildOutcome;
	configUpdated: boolean;
	/** Time the user took to answer the suspension that this pass resumes. */
	userWaitMs?: number;
}): void {
	const { context, delegate, agentId, activity, outcome, configUpdated, userWaitMs } = args;
	// No trace, no work: the validation costs a draft read and credential checks.
	if (!canEmitBuilderMetric(context.tracing)) return;
	const operation = toBuildOperation(activity);

	detachBuilderMetricWork(context.tracing, async () => {
		await emitBuilderMetric(context.tracing, 'agent_build', {
			success: outcome === 'completed',
			outcome,
			agent_id: agentId,
			operation,
			activity,
			config_updated: configUpdated,
			user_wait_ms: userWaitMs,
		});

		if (!configUpdated || outcome !== 'completed') return;
		let validation: AgentValidationSummary | undefined;
		try {
			validation = await delegate.validateAgent?.(agentId);
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

/**
 * Wraps a builder turn so that its stream events are recorded when they stream
 * in, not when the builder pass ends:
 * - `agent_shown`: the first config change of the build. The open agent panel
 *   refetches on it, so the user first sees the built agent at this point.
 * - `agent_test`: each Preview test result.
 */
export function withAgentStreamMetrics(
	context: OrchestrationContext,
	turn: BuilderTurnStream,
	options: {
		agentId: string;
		activity: InstanceAiAgentActivity;
		/** An earlier pass of this build already changed the config, so the agent is already shown. */
		alreadyShown: boolean;
	},
): BuilderTurnStream {
	if (!canEmitBuilderMetric(context.tracing)) return turn;
	return { ...turn, fullStream: tapBuilderStream(context, turn.fullStream, options) };
}

const toolResultChunkSchema = z.object({
	type: z.literal('tool-result'),
	toolName: z.string(),
	isError: z.unknown(),
	output: z.unknown(),
});

type ToolResultChunk = z.infer<typeof toolResultChunkSchema>;

const agentTestOutputSchema = z.object({
	status: z.string().catch('unknown'),
	code: z.string().optional().catch(undefined),
});

async function* tapBuilderStream(
	context: OrchestrationContext,
	stream: AsyncIterable<unknown>,
	options: { agentId: string; activity: InstanceAiAgentActivity; alreadyShown: boolean },
): AsyncGenerator<unknown> {
	let shown = options.alreadyShown;
	for await (const chunk of stream) {
		const parsed = toolResultChunkSchema.safeParse(chunk);
		if (parsed.success) {
			const toolResult = parsed.data;
			if (!shown && toolResult.isError !== true && hasConfigMutationMarker(toolResult.output)) {
				shown = true;
				await emitBuilderMetric(context.tracing, 'agent_shown', {
					success: true,
					agent_id: options.agentId,
					operation: toBuildOperation(options.activity),
					activity: options.activity,
					tool_name: toolResult.toolName,
				});
			}
			const test = readAgentTestResult(toolResult);
			if (test) {
				await emitBuilderMetric(context.tracing, 'agent_test', {
					success: test.status === 'completed',
					status: test.status,
					code: test.code,
					agent_id: options.agentId,
				});
			}
		}
		yield chunk;
	}
}

function readAgentTestResult(
	toolResult: ToolResultChunk,
): { status: string; code?: string } | undefined {
	if (toolResult.toolName !== AGENT_BUILDER_TEST_TOOL_NAME) return undefined;
	if (toolResult.isError === true) return { status: 'error' };
	const output = agentTestOutputSchema.safeParse(toolResult.output);
	return output.success ? output.data : { status: 'unknown' };
}
