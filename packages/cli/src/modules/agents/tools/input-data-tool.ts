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
						.describe(
							'JMESPath query to retrieve a specific part of the input, untrimmed. The data is a ' +
								'JSON array of item objects (index the first item as `[0]`, not `items[0]`; there is ' +
								'no `json` wrapper) — e.g. `[0]`, `[0].fieldName`, `[*].fieldName`. Use only when a ' +
								'previous non-query result came back truncated.',
						),
				}),
			)
			.systemInstruction(
				`You were invoked from the n8n workflow '${workflowLabel}' by its node '${context.callingNodeName}'. ` +
					`Call fetch_input_data to read the data passed into this step (${scopeText}); use it whenever ` +
					'the message references the input. The returned data is a JSON array of item objects (index the ' +
					'first item as `[0]`, not `items[0]`; there is no `json` wrapper). Only pass a JMESPath query ' +
					'when a previous result came back truncated — never re-query data you already received in full.',
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
