import type { BuiltTool } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import type { ExecuteAgentWorkflowContext } from 'n8n-workflow';
import { z } from 'zod';

import {
	trimItems,
	queryItems,
	ITEM_SHAPE_HINT,
	QUERY_WHEN_TRUNCATED_HINT,
} from './agent-data-utils';

const DESCRIPTION =
	'Read the data passed into this agent step. ' +
	'Call without arguments for the input items (trimmed if large). ' +
	'Pass a JMESPath query to retrieve a specific part of the input, untrimmed.';

/**
 * Builds the always-on `fetch_input_data` tool for agents invoked from a
 * workflow. Exposes the calling node's own input — the current item or all
 * items, depending on how the node invokes the agent. The system instruction
 * (which carries the workflow/node identity) is merged into the agent prompt
 * by the runtime.
 */
export function createInputDataTool(context: ExecuteAgentWorkflowContext): BuiltTool {
	const items = context.inputData ?? [];
	const scope = context.inputDataScope ?? 'item';
	const workflowLabel = context.workflowName ?? context.workflowId ?? 'unknown';
	const scopeText = scope === 'all' ? 'all input items' : 'the current input item';

	return (
		new Tool('fetch_input_data')
			.description(DESCRIPTION)
			.input(
				z.object({
					query: z
						.string()
						.optional()
						.describe(
							`JMESPath query to retrieve a specific part of the input, untrimmed. ${ITEM_SHAPE_HINT} ${QUERY_WHEN_TRUNCATED_HINT}`,
						),
				}),
			)
			.systemInstruction(
				`You were invoked from the n8n workflow '${workflowLabel}' by its node '${context.callingNodeName}'. ` +
					`Call fetch_input_data to read the data passed into this step (${scopeText}); use it whenever ` +
					`the message references the input. ${ITEM_SHAPE_HINT} ${QUERY_WHEN_TRUNCATED_HINT}`,
			)
			// eslint-disable-next-line @typescript-eslint/require-await -- Tool.handler() expects an async callback
			.handler(async ({ query }) => {
				try {
					if (query) {
						return { query, ...queryItems(items, query) };
					}

					const { items: trimmed, truncated } = trimItems(items);
					return { scope, totalItems: items.length, items: trimmed, truncated };
				} catch (error) {
					return { error: `Failed to read input data: ${(error as Error).message}` };
				}
			})
			.build()
	);
}
