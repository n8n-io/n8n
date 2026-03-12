import { z } from 'zod';

import type { SessionManager } from '../session-manager';
import type { ToolDefinition } from '../types';
import { createSessionTool, pageIdField, sessionIdField } from './helpers';

export function createWaitTools(sessionManager: SessionManager): ToolDefinition[] {
	return [browserWait(sessionManager)];
}

function browserWait(sessionManager: SessionManager): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_wait',
		'Wait for one or more conditions. Conditions can be combined — all must be satisfied.',
		{
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
		},
		async (session, input, pageId) => {
			const elapsedMs = await session.adapter.wait(pageId, {
				selector: input.selector,
				url: input.url,
				loadState: input.loadState,
				predicate: input.predicate,
				text: input.text,
				timeoutMs: input.timeoutMs,
			});
			return { waited: true, elapsedMs };
		},
	);
}
