import { z } from 'zod';

import type { BrowserConnection } from '../connection';
import type { ToolDefinition } from '../types';
import { formatCallToolResult } from '../utils';
import { createConnectedTool, pageIdField, withSnapshotEnvelope } from './helpers';

export function createWaitTools(connection: BrowserConnection): ToolDefinition[] {
	return [browserWait(connection)];
}

const browserWaitSchema = z.object({
	selector: z.string().optional().describe('CSS/text/role selector to wait for'),
	url: z.string().optional().describe('URL pattern (glob) to wait for'),
	loadState: z
		.enum(['load', 'domcontentloaded', 'networkidle'])
		.optional()
		.describe('Wait for load state'),
	predicate: z.string().optional().describe('JavaScript expression that must return truthy'),
	text: z.string().optional().describe('Text content to wait for on the page'),
	timeoutMs: z.number().optional().describe('Timeout in ms (default: 30000)'),
	pageId: pageIdField,
});

const browserWaitOutputSchema = withSnapshotEnvelope({
	waited: z.boolean(),
	elapsedMs: z.number(),
});

function browserWait(connection: BrowserConnection): ToolDefinition {
	return createConnectedTool(
		connection,
		'browser_wait',
		'Wait for one or more conditions. Conditions can be combined — all must be satisfied.',
		browserWaitSchema,
		async (state, input, pageId) => {
			const elapsedMs = await state.adapter.wait(pageId, {
				selector: input.selector,
				url: input.url,
				loadState: input.loadState,
				predicate: input.predicate,
				text: input.text,
				timeoutMs: input.timeoutMs,
			});
			return formatCallToolResult({ waited: true, elapsedMs });
		},
		browserWaitOutputSchema,
		{ autoSnapshot: true },
	);
}
