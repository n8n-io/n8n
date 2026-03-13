import { z } from 'zod';

import type { SessionManager } from '../session-manager';
import type { ToolDefinition, ToolResponse } from '../types';
import { formatImageResponse, resolveElementTarget } from '../utils';
import { createSessionTool, pageIdField, refField, selectorField, sessionIdField } from './helpers';

export function createInspectionTools(sessionManager: SessionManager): ToolDefinition[] {
	return [
		browserSnapshot(sessionManager),
		browserScreenshot(sessionManager),
		browserText(sessionManager),
		browserEvaluate(sessionManager),
		browserConsole(sessionManager),
		browserErrors(sessionManager),
		browserPdf(sessionManager),
		browserNetwork(sessionManager),
	];
}

// ---------------------------------------------------------------------------
// browser_snapshot — PRIMARY observation tool
// ---------------------------------------------------------------------------

function browserSnapshot(sessionManager: SessionManager): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_snapshot',
		'Use this tool as your primary way to observe the page. Returns a ref-annotated accessibility tree — a compact text representation of all visible elements. Each interactive element gets a numeric ref for use in subsequent tool calls (browser_click, browser_type, etc.). Snapshots are small and fast. Prefer this over browser_screenshot unless you specifically need visual/layout information.',
		{
			sessionId: sessionIdField,
			ref: refField.describe('Scope to a subtree rooted at this ref'),
			selector: selectorField.describe('Scope to a subtree via selector (fallback)'),
			pageId: pageIdField,
		},
		async (session, input, pageId) => {
			const hasTarget = input.ref !== undefined || input.selector !== undefined;
			const target = hasTarget
				? resolveElementTarget({ ref: input.ref, selector: input.selector })
				: undefined;
			const result = await session.adapter.snapshot(pageId, target);
			return { snapshot: result.tree };
		},
	);
}

// ---------------------------------------------------------------------------
// browser_screenshot
// ---------------------------------------------------------------------------

function browserScreenshot(sessionManager: SessionManager): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_screenshot',
		'Take a screenshot of the page or a specific element. Returns a base64-encoded PNG image. Note: Prefer browser_snapshot for most tasks — it is smaller, faster, and returns refs for element targeting. Use screenshots only when you need visual information (layout, images, charts).',
		{
			sessionId: sessionIdField,
			ref: refField.describe('Element ref to screenshot'),
			selector: selectorField.describe('Element selector to screenshot (fallback)'),
			fullPage: z.boolean().optional().describe('Capture full scrollable page'),
			pageId: pageIdField,
		},
		async (session, input, pageId): Promise<Record<string, unknown> | ToolResponse> => {
			const hasTarget = input.ref !== undefined || input.selector !== undefined;
			const target = hasTarget
				? resolveElementTarget({ ref: input.ref, selector: input.selector })
				: undefined;

			const base64 = await session.adapter.screenshot(pageId, target, {
				fullPage: input.fullPage,
			});

			return formatImageResponse(base64, {
				hint: 'Prefer browser_snapshot for element discovery and interaction — it returns refs and uses less context.',
			});
		},
	);
}

// ---------------------------------------------------------------------------
// browser_text
// ---------------------------------------------------------------------------

function browserText(sessionManager: SessionManager): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_text',
		'Get the text content of an element or the full page body.',
		{
			sessionId: sessionIdField,
			selector: z
				.string()
				.optional()
				.describe('Element to get text from. If omitted, returns full page text'),
			pageId: pageIdField,
		},
		async (session, input, pageId) => {
			const target = input.selector ? { selector: input.selector } : undefined;
			const text = await session.adapter.getText(pageId, target);
			return { text };
		},
	);
}

// ---------------------------------------------------------------------------
// browser_evaluate
// ---------------------------------------------------------------------------

function browserEvaluate(sessionManager: SessionManager): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_evaluate',
		'Execute JavaScript in the page context and return the result. The script must be an expression or IIFE. The result is JSON-serialized.',
		{
			sessionId: sessionIdField,
			script: z.string().describe('JavaScript to execute'),
			pageId: pageIdField,
		},
		async (session, input, pageId) => {
			const result = await session.adapter.evaluate(pageId, input.script);
			return { result };
		},
	);
}

// ---------------------------------------------------------------------------
// browser_console
// ---------------------------------------------------------------------------

function browserConsole(sessionManager: SessionManager): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_console',
		'Get console log entries from the page.',
		{
			sessionId: sessionIdField,
			level: z
				.enum(['log', 'warn', 'error', 'info', 'debug'])
				.optional()
				.describe('Filter by log level'),
			clear: z.boolean().optional().describe('Clear buffer after reading'),
			pageId: pageIdField,
		},
		async (session, input, pageId) => {
			const entries = await session.adapter.getConsole(pageId, input.level, input.clear);
			return { entries };
		},
	);
}

// ---------------------------------------------------------------------------
// browser_errors
// ---------------------------------------------------------------------------

function browserErrors(sessionManager: SessionManager): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_errors',
		'Get page errors (uncaught exceptions).',
		{
			sessionId: sessionIdField,
			clear: z.boolean().optional().describe('Clear buffer after reading'),
			pageId: pageIdField,
		},
		async (session, input, pageId) => {
			const errors = await session.adapter.getErrors(pageId, input.clear);
			return { errors };
		},
	);
}

// ---------------------------------------------------------------------------
// browser_pdf
// ---------------------------------------------------------------------------

function browserPdf(sessionManager: SessionManager): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_pdf',
		'Generate a PDF of the current page. Playwright only.',
		{
			sessionId: sessionIdField,
			format: z.enum(['A4', 'Letter', 'Legal']).optional().describe('Page format (default: "A4")'),
			landscape: z.boolean().optional().describe('Landscape orientation'),
			pageId: pageIdField,
		},
		async (session, input, pageId) => {
			const result = await session.adapter.pdf(pageId, {
				format: input.format,
				landscape: input.landscape,
			});
			return { pdf: result.data, pages: result.pages };
		},
	);
}

// ---------------------------------------------------------------------------
// browser_network
// ---------------------------------------------------------------------------

function browserNetwork(sessionManager: SessionManager): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_network',
		'Get recent network requests and responses.',
		{
			sessionId: sessionIdField,
			filter: z.string().optional().describe('URL pattern filter (glob)'),
			clear: z.boolean().optional().describe('Clear buffer after reading'),
			pageId: pageIdField,
		},
		async (session, input, pageId) => {
			const requests = await session.adapter.getNetwork(pageId, input.filter, input.clear);
			return { requests };
		},
	);
}
