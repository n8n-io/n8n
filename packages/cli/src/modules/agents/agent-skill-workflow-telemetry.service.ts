import type { BuiltTool } from '@n8n/agents';
import { TelemetryProxy } from '@n8n/backend-services';
import { Service } from '@n8n/di';
import { TELEMETRY_EVENT, type InferTelemetryProps } from '@n8n/telemetry';
import { isRecord } from '@n8n/utils/is-record';
import { ExecutionCancelledError } from 'n8n-workflow';

import { CallableWorkflowUnavailableError } from '@/workflows/callable/callable-workflow-unavailable.error';

type SkillWorkflowRunProps = InferTelemetryProps<
	typeof TELEMETRY_EVENT.AGENTS.AGENT_RAN_SKILL_WORKFLOW
>;

export type SkillWorkflowRun = Omit<SkillWorkflowRunProps, 'status' | 'failure_reason'>;

type RunOutcome = Pick<SkillWorkflowRunProps, 'status' | 'failure_reason'>;

const pending: RunOutcome = { status: 'pending' };

const outcomeByExecutionStatus = new Map<string, RunOutcome>([
	['success', { status: 'success' }],
	['error', { status: 'failure', failure_reason: 'workflow_error' }],
	['canceled', { status: 'failure', failure_reason: 'canceled' }],
	['unknown', { status: 'failure', failure_reason: 'unexpected' }],
]);

function outcomeOf(output: unknown): RunOutcome {
	const status = isRecord(output) && typeof output.status === 'string' ? output.status : undefined;
	return (status && outcomeByExecutionStatus.get(status)) || pending;
}

function failureOf(error: unknown, aborted: boolean): RunOutcome {
	if (error instanceof CallableWorkflowUnavailableError) {
		return { status: 'failure', failure_reason: error.reason };
	}
	const canceled = aborted || error instanceof ExecutionCancelledError;
	return { status: 'failure', failure_reason: canceled ? 'canceled' : 'unexpected' };
}

@Service()
export class AgentSkillWorkflowTelemetry {
	constructor(private readonly telemetry: TelemetryProxy) {}

	withRunTracking(tool: BuiltTool, run: SkillWorkflowRun): BuiltTool {
		const { handler } = tool;
		if (!handler) return tool;
		return {
			...tool,
			handler: async (input, ctx) => {
				if ('continuation' in ctx && ctx.continuation !== undefined) {
					return await handler(input, ctx);
				}
				try {
					const output = await handler(input, ctx);
					this.track(run, outcomeOf(output));
					return output;
				} catch (error) {
					this.track(run, failureOf(error, ctx.abortSignal?.aborted === true));
					throw error;
				}
			},
		};
	}

	private track(run: SkillWorkflowRun, outcome: RunOutcome) {
		this.telemetry.track(TELEMETRY_EVENT.AGENTS.AGENT_RAN_SKILL_WORKFLOW, { ...run, ...outcome });
	}
}
