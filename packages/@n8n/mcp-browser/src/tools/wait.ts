import { z } from 'zod';

import type { SessionManager } from '../session-manager';
import type { ToolDefinition } from '../types';
import { formatCallToolResult } from '../utils';
import { createSessionTool, pageIdField, sessionIdField } from './helpers';

export function createWaitTools(
	sessionManager: SessionManager,
	toolGroupId: string,
): ToolDefinition[] {
	return [browserWait(sessionManager, toolGroupId)];
}

const browserWaitSchema = z.object({
	sessionId: sessionIdField,
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

const browserWaitOutputSchema = z.object({
	waited: z.boolean(),
	elapsedMs: z.number(),
});

function browserWait(sessionManager: SessionManager, toolGroupId: string): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_wait',
		'Wait for one or more conditions. Conditions can be combined — all must be satisfied.',
		browserWaitSchema,
		async (session, input, pageId) => {
			const elapsedMs = await session.adapter.wait(pageId, {
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
		toolGroupId,
	);
}
