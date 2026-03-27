import { z } from 'zod';

import type { SessionManager } from '../session-manager';
import type { ToolDefinition } from '../types';
import { formatCallToolResult } from '../utils';
import { createSessionTool, extractDomain, pageIdField, sessionIdField } from './helpers';

const waitUntilField = z
	.enum(['load', 'domcontentloaded', 'networkidle'])
	.optional()
	.describe('When to consider navigation done (default: "load")');

export function createNavigationTools(
	sessionManager: SessionManager,
	toolGroupId: string,
): ToolDefinition[] {
	return [
		browserNavigate(sessionManager, toolGroupId),
		browserBack(sessionManager, toolGroupId),
		browserForward(sessionManager, toolGroupId),
		browserReload(sessionManager, toolGroupId),
	];
}

const browserNavigateSchema = z.object({
	sessionId: sessionIdField,
	url: z.string().describe('Full URL to navigate to'),
	waitUntil: waitUntilField,
	pageId: pageIdField,
});

const browserNavigateOutputSchema = z.object({
	title: z.string(),
	url: z.string(),
	status: z.number(),
});

function browserNavigate(sessionManager: SessionManager, toolGroupId: string): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_navigate',
		'Navigate to a URL and wait for the page to load.',
		browserNavigateSchema,
		async (session, input, pageId) => {
			const result = await session.adapter.navigate(pageId, input.url, input.waitUntil);
			return formatCallToolResult({ title: result.title, url: result.url, status: result.status });
		},
		browserNavigateOutputSchema,
		toolGroupId,
		(args) => extractDomain(args.url),
	);
}

const browserBackSchema = z.object({
	sessionId: sessionIdField,
	pageId: pageIdField,
});

const browserBackOutputSchema = z.object({
	title: z.string(),
	url: z.string(),
});

function browserBack(sessionManager: SessionManager, toolGroupId: string): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_back',
		'Navigate back in browser history.',
		browserBackSchema,
		async (session, _input, pageId) => {
			const result = await session.adapter.back(pageId);
			return formatCallToolResult({ title: result.title, url: result.url });
		},
		browserBackOutputSchema,
		toolGroupId,
	);
}

const browserForwardSchema = z.object({
	sessionId: sessionIdField,
	pageId: pageIdField,
});

const browserForwardOutputSchema = z.object({
	title: z.string(),
	url: z.string(),
});

function browserForward(sessionManager: SessionManager, toolGroupId: string): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_forward',
		'Navigate forward in browser history.',
		browserForwardSchema,
		async (session, _input, pageId) => {
			const result = await session.adapter.forward(pageId);
			return formatCallToolResult({ title: result.title, url: result.url });
		},
		browserForwardOutputSchema,
		toolGroupId,
	);
}

const browserReloadSchema = z.object({
	sessionId: sessionIdField,
	waitUntil: waitUntilField,
	pageId: pageIdField,
});

const browserReloadOutputSchema = z.object({
	title: z.string(),
	url: z.string(),
});

function browserReload(sessionManager: SessionManager, toolGroupId: string): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_reload',
		'Reload the current page.',
		browserReloadSchema,
		async (session, input, pageId) => {
			const result = await session.adapter.reload(pageId, input.waitUntil);
			return formatCallToolResult({ title: result.title, url: result.url });
		},
		browserReloadOutputSchema,
		toolGroupId,
	);
}
