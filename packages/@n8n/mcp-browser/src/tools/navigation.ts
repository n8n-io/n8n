import { z } from 'zod';

import type { SessionManager } from '../session-manager';
import type { ToolDefinition } from '../types';
import { createSessionTool, pageIdField, sessionIdField } from './helpers';

const waitUntilField = z
	.enum(['load', 'domcontentloaded', 'networkidle'])
	.optional()
	.describe('When to consider navigation done (default: "load")');

export function createNavigationTools(sessionManager: SessionManager): ToolDefinition[] {
	return [
		browserNavigate(sessionManager),
		browserBack(sessionManager),
		browserForward(sessionManager),
		browserReload(sessionManager),
	];
}

function browserNavigate(sessionManager: SessionManager): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_navigate',
		'Navigate to a URL and wait for the page to load.',
		{
			sessionId: sessionIdField,
			url: z.string().describe('Full URL to navigate to'),
			waitUntil: waitUntilField,
			pageId: pageIdField,
		},
		async (session, input, pageId) => {
			const result = await session.adapter.navigate(pageId, input.url, input.waitUntil);
			return { title: result.title, url: result.url, status: result.status };
		},
	);
}

function browserBack(sessionManager: SessionManager): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_back',
		'Navigate back in browser history.',
		{
			sessionId: sessionIdField,
			pageId: pageIdField,
		},
		async (session, _input, pageId) => {
			const result = await session.adapter.back(pageId);
			return { title: result.title, url: result.url };
		},
	);
}

function browserForward(sessionManager: SessionManager): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_forward',
		'Navigate forward in browser history.',
		{
			sessionId: sessionIdField,
			pageId: pageIdField,
		},
		async (session, _input, pageId) => {
			const result = await session.adapter.forward(pageId);
			return { title: result.title, url: result.url };
		},
	);
}

function browserReload(sessionManager: SessionManager): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_reload',
		'Reload the current page.',
		{
			sessionId: sessionIdField,
			waitUntil: waitUntilField,
			pageId: pageIdField,
		},
		async (session, input, pageId) => {
			const result = await session.adapter.reload(pageId, input.waitUntil);
			return { title: result.title, url: result.url };
		},
	);
}
