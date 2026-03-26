import { z } from 'zod';

import type { BrowserConnection } from '../connection';
import type { ToolDefinition } from '../types';
import { formatCallToolResult } from '../utils';
import { createConnectedTool, extractDomain, pageIdField, withSnapshotEnvelope } from './helpers';

const waitUntilField = z
	.enum(['load', 'domcontentloaded', 'networkidle'])
	.optional()
	.describe('When to consider navigation done (default: "load")');

export function createNavigationTools(connection: BrowserConnection): ToolDefinition[] {
	return [
		browserNavigate(connection),
		browserBack(connection),
		browserForward(connection),
		browserReload(connection),
	];
}

const browserNavigateSchema = z.object({
	url: z.string().describe('Full URL to navigate to'),
	waitUntil: waitUntilField,
	pageId: pageIdField,
});

const browserNavigateOutputSchema = withSnapshotEnvelope({
	title: z.string(),
	url: z.string(),
	status: z.number(),
});

function browserNavigate(connection: BrowserConnection): ToolDefinition {
	return createConnectedTool(
		connection,
		'browser_navigate',
		'Navigate to a URL and wait for the page to load.',
		browserNavigateSchema,
		async (state, input, pageId) => {
			const result = await state.adapter.navigate(pageId, input.url, input.waitUntil);
			return formatCallToolResult({ title: result.title, url: result.url, status: result.status });
		},
		browserNavigateOutputSchema,
		{ autoSnapshot: true, waitForCompletion: true },
		(args) => extractDomain(args.url),
	);
}

const browserBackSchema = z.object({
	pageId: pageIdField,
});

const browserBackOutputSchema = withSnapshotEnvelope({
	title: z.string(),
	url: z.string(),
});

function browserBack(connection: BrowserConnection): ToolDefinition {
	return createConnectedTool(
		connection,
		'browser_back',
		'Navigate back in browser history.',
		browserBackSchema,
		async (state, _input, pageId) => {
			const result = await state.adapter.back(pageId);
			return formatCallToolResult({ title: result.title, url: result.url });
		},
		browserBackOutputSchema,
		{ autoSnapshot: true, waitForCompletion: true },
	);
}

const browserForwardSchema = z.object({
	pageId: pageIdField,
});

const browserForwardOutputSchema = withSnapshotEnvelope({
	title: z.string(),
	url: z.string(),
});

function browserForward(connection: BrowserConnection): ToolDefinition {
	return createConnectedTool(
		connection,
		'browser_forward',
		'Navigate forward in browser history.',
		browserForwardSchema,
		async (state, _input, pageId) => {
			const result = await state.adapter.forward(pageId);
			return formatCallToolResult({ title: result.title, url: result.url });
		},
		browserForwardOutputSchema,
		{ autoSnapshot: true, waitForCompletion: true },
	);
}

const browserReloadSchema = z.object({
	waitUntil: waitUntilField,
	pageId: pageIdField,
});

const browserReloadOutputSchema = withSnapshotEnvelope({
	title: z.string(),
	url: z.string(),
});

function browserReload(connection: BrowserConnection): ToolDefinition {
	return createConnectedTool(
		connection,
		'browser_reload',
		'Reload the current page.',
		browserReloadSchema,
		async (state, input, pageId) => {
			const result = await state.adapter.reload(pageId, input.waitUntil);
			return formatCallToolResult({ title: result.title, url: result.url });
		},
		browserReloadOutputSchema,
		{ autoSnapshot: true, waitForCompletion: true },
	);
}
