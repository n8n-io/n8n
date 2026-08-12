/**
 * Pi JSON-stream → Instance AI event translation.
 *
 * Implements the mapping table frozen in `contracts.ts`:
 *
 * | pi event (JSON stream)          | Instance AI event                    |
 * | ------------------------------- | ------------------------------------ |
 * | `message_update` text deltas    | `text-delta` (sandbox agentId)       |
 * | `tool_execution_start` / `end`  | tool events in the agent branch      |
 * | milestone progress              | `status`                             |
 * | process exit + report           | task completion → report card        |
 *
 * All other pi event types are ignored. Every string is scrubbed against the
 * injected secret values before emission — this layer is the authoritative
 * redaction point (see `redaction.ts`). Process exit + report is handled by
 * the tool itself, not here.
 */
import type { InstanceAiEvent } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

import { scrub, scrubDeep, type ScrubSecret } from './redaction';

/**
 * Harness tool whose invocations are milestone progress, not raw tool
 * activity: its `message` arg becomes a transient `status` line in the main
 * view ("Creating the sheet…"). Workstream A's harness assets register the
 * extension tool under this name.
 */
export const PROGRESS_TOOL_NAME = 'report_progress';

// Pi's `message_update` carries an `AssistantMessageEvent` (pi-ai) with the
// cumulative `partial` snapshot stripped by JSON mode. Only the delta
// variants matter here; the rest of the union is ignored via the loose type.
const messageUpdateSchema = z.object({
	type: z.literal('message_update'),
	assistantMessageEvent: z.object({
		type: z.string(),
		delta: z.string().optional(),
	}),
});

const toolExecutionStartSchema = z.object({
	type: z.literal('tool_execution_start'),
	toolCallId: z.string(),
	toolName: z.string(),
	args: z.unknown().optional(),
});

const toolExecutionEndSchema = z.object({
	type: z.literal('tool_execution_end'),
	toolCallId: z.string(),
	toolName: z.string(),
	result: z.unknown().optional(),
	isError: z.boolean().optional(),
});

const progressArgsSchema = z.object({ message: z.string() });

export interface PiEventTranslatorOptions {
	runId: string;
	/** The one-off task's dedicated agent branch. */
	agentId: string;
	/** Injected secret values — every emitted string is scrubbed against these. */
	secrets: ScrubSecret[];
	publish: (event: InstanceAiEvent) => void;
}

/**
 * Returns the `onEvent` callback for `OneOffTaskSandbox.runHarness`: parses
 * each pi JSON-stream event, translates it per the mapping table, scrubs it,
 * and publishes it under the task's agent branch.
 */
export function createPiEventTranslator(options: PiEventTranslatorOptions): (raw: unknown) => void {
	const { runId, agentId, secrets, publish } = options;

	const scrubText = (text: string): string => scrub(text, secrets);

	const scrubArgs = (args: unknown): Record<string, unknown> => {
		const scrubbed = scrubDeep(args ?? {}, secrets);
		return isRecord(scrubbed) ? scrubbed : { value: scrubbed };
	};

	return (raw: unknown) => {
		const messageUpdate = messageUpdateSchema.safeParse(raw);
		if (messageUpdate.success) {
			const { type, delta } = messageUpdate.data.assistantMessageEvent;
			if (delta === undefined || delta.length === 0) return;
			if (type === 'text_delta') {
				publish({ type: 'text-delta', runId, agentId, payload: { text: scrubText(delta) } });
			} else if (type === 'thinking_delta') {
				publish({ type: 'reasoning-delta', runId, agentId, payload: { text: scrubText(delta) } });
			}
			return;
		}

		const start = toolExecutionStartSchema.safeParse(raw);
		if (start.success) {
			if (start.data.toolName === PROGRESS_TOOL_NAME) {
				const progress = progressArgsSchema.safeParse(start.data.args);
				if (progress.success) {
					publish({
						type: 'status',
						runId,
						agentId,
						payload: { message: scrubText(progress.data.message) },
					});
				}
				return;
			}
			publish({
				type: 'tool-call',
				runId,
				agentId,
				payload: {
					toolCallId: start.data.toolCallId,
					toolName: start.data.toolName,
					args: scrubArgs(start.data.args),
				},
			});
			return;
		}

		const end = toolExecutionEndSchema.safeParse(raw);
		if (end.success) {
			// Progress-tool starts became `status` lines, so there is no pending
			// tool-call entry for the end event to settle.
			if (end.data.toolName === PROGRESS_TOOL_NAME) return;
			if (end.data.isError === true) {
				const error =
					typeof end.data.result === 'string'
						? end.data.result
						: JSON.stringify(end.data.result ?? 'Tool failed');
				publish({
					type: 'tool-error',
					runId,
					agentId,
					payload: { toolCallId: end.data.toolCallId, error: scrubText(error) },
				});
				return;
			}
			publish({
				type: 'tool-result',
				runId,
				agentId,
				payload: {
					toolCallId: end.data.toolCallId,
					result: scrubDeep(end.data.result, secrets),
				},
			});
			return;
		}

		// Everything else (turn_start, agent_end, tool_execution_update, …) is
		// intentionally ignored per the contract.
	};
}
