import type { BuiltTool } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import type { ExecuteAgentWorkflowContext } from 'n8n-workflow';
import { z } from 'zod';

import { trimItems, runQuery } from './agent-data-utils';

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
						.describe('JMESPath query to extract a specific part of the input data, untrimmed.'),
				}),
			)
			.systemInstruction(
				`You were invoked from the n8n workflow '${workflowLabel}' by its node '${context.callingNodeName}'. ` +
					`Call fetch_input_data to read the data passed into this step (${scopeText}). ` +
					'Pass a JMESPath query to retrieve a specific part of large data. ' +
					'Use it whenever the message references the input data.',
			)
			// eslint-disable-next-line @typescript-eslint/require-await -- Tool.handler() expects an async callback
			.handler(async (input) => {
				const { query } = input as { query?: string };

				if (query) {
					return {
						query,
						...runQuery(
							items.map((item) => item.json),
							query,
						),
					};
				}

				const { items: trimmed, truncated } = trimItems(items);
				return { scope, totalItems: items.length, items: trimmed, truncated };
			})
			.build()
	);
}
