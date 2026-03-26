import { z } from 'zod';

import type { SessionManager } from '../session-manager';
import type { ToolDefinition } from '../types';
import { formatCallToolResult, formatImageResponse } from '../utils';
import { createSessionTool, elementTargetSchema, pageIdField, sessionIdField } from './helpers';

export function createInspectionTools(
	sessionManager: SessionManager,
	toolGroupId: string,
): ToolDefinition[] {
	return [
		browserSnapshot(sessionManager, toolGroupId),
		browserScreenshot(sessionManager, toolGroupId),
		browserText(sessionManager, toolGroupId),
		browserEvaluate(sessionManager, toolGroupId),
		browserConsole(sessionManager, toolGroupId),
		browserErrors(sessionManager, toolGroupId),
		browserPdf(sessionManager, toolGroupId),
		browserNetwork(sessionManager, toolGroupId),
	];
}

// ---------------------------------------------------------------------------
// browser_snapshot — PRIMARY observation tool
// ---------------------------------------------------------------------------

const browserSnapshotSchema = z
	.object({
		sessionId: sessionIdField,
		scope: elementTargetSchema
			.optional()
			.describe('Optionally scope to a subtree rooted at this element'),
		pageId: pageIdField,
	})
	.describe('Get ref-annotated accessibility tree of the page');

const browserSnapshotOutputSchema = z.object({
	snapshot: z.string(),
});

function browserSnapshot(sessionManager: SessionManager, toolGroupId: string): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_snapshot',
		'Use this tool as your primary way to observe the page. Returns a ref-annotated accessibility tree — a compact text representation of all visible elements. Each interactive element gets a numeric ref for use in subsequent tool calls (browser_click, browser_type, etc.). Snapshots are small and fast. Prefer this over browser_screenshot unless you specifically need visual/layout information.',
		browserSnapshotSchema,
		async (session, input, pageId) => {
			const result = await session.adapter.snapshot(pageId, input.scope);
			return formatCallToolResult({ snapshot: result.tree });
		},
		browserSnapshotOutputSchema,
		toolGroupId,
	);
}

// ---------------------------------------------------------------------------
// browser_screenshot
// ---------------------------------------------------------------------------

const browserScreenshotSchema = z
	.object({
		sessionId: sessionIdField,
		element: elementTargetSchema
			.optional()
			.describe('Optionally target a specific element to screenshot'),
		fullPage: z.boolean().optional().describe('Capture full scrollable page'),
		pageId: pageIdField,
	})
	.describe('Take a screenshot of the page or a specific element');

function browserScreenshot(sessionManager: SessionManager, toolGroupId: string): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_screenshot',
		'Take a screenshot of the page or a specific element. Returns a base64-encoded PNG image. Note: Prefer browser_snapshot for most tasks — it is smaller, faster, and returns refs for element targeting. Use screenshots only when you need visual information (layout, images, charts).',
		browserScreenshotSchema,
		async (session, input, pageId) => {
			const base64 = await session.adapter.screenshot(pageId, input.element, {
				fullPage: input.fullPage,
			});

			return formatImageResponse(base64, {
				hint: 'Prefer browser_snapshot for element discovery and interaction — it returns refs and uses less context.',
			});
		},
		undefined,
		toolGroupId,
	);
}

// ---------------------------------------------------------------------------
// browser_text
// ---------------------------------------------------------------------------

const browserTextSchema = z
	.object({
		sessionId: sessionIdField,
		selector: z
			.string()
			.optional()
			.describe('Element to get text from. If omitted, returns full page text'),
		pageId: pageIdField,
	})
	.describe('Get the text content of an element or the full page body');

const browserTextOutputSchema = z.object({
	text: z.string(),
});

function browserText(sessionManager: SessionManager, toolGroupId: string): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_text',
		'Get the text content of an element or the full page body.',
		browserTextSchema,
		async (session, input, pageId) => {
			const target = input.selector ? { selector: input.selector } : undefined;
			const text = await session.adapter.getText(pageId, target);
			return formatCallToolResult({ text });
		},
		browserTextOutputSchema,
		toolGroupId,
	);
}

// ---------------------------------------------------------------------------
// browser_evaluate
// ---------------------------------------------------------------------------

const browserEvaluateSchema = z
	.object({
		sessionId: sessionIdField,
		script: z.string().describe('JavaScript to execute'),
		pageId: pageIdField,
	})
	.describe('Execute JavaScript in the page context');

const browserEvaluateOutputSchema = z.object({
	result: z.unknown(),
});

function browserEvaluate(sessionManager: SessionManager, toolGroupId: string): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_evaluate',
		'Execute JavaScript in the page context and return the result. The script must be an expression or IIFE. The result is JSON-serialized.',
		browserEvaluateSchema,
		async (session, input, pageId) => {
			const result = await session.adapter.evaluate(pageId, input.script);
			return formatCallToolResult({ result });
		},
		browserEvaluateOutputSchema,
		toolGroupId,
	);
}

// ---------------------------------------------------------------------------
// browser_console
// ---------------------------------------------------------------------------

const browserConsoleSchema = z
	.object({
		sessionId: sessionIdField,
		level: z
			.enum(['log', 'warn', 'error', 'info', 'debug'])
			.optional()
			.describe('Filter by log level'),
		clear: z.boolean().optional().describe('Clear buffer after reading'),
		pageId: pageIdField,
	})
	.describe('Get console log entries');

const browserConsoleOutputSchema = z.object({
	entries: z.array(
		z.object({
			level: z.string(),
			text: z.string(),
			timestamp: z.number(),
		}),
	),
});

function browserConsole(sessionManager: SessionManager, toolGroupId: string): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_console',
		'Get console log entries from the page.',
		browserConsoleSchema,
		async (session, input, pageId) => {
			const entries = await session.adapter.getConsole(pageId, input.level, input.clear);
			return formatCallToolResult({ entries });
		},
		browserConsoleOutputSchema,
		toolGroupId,
	);
}

// ---------------------------------------------------------------------------
// browser_errors
// ---------------------------------------------------------------------------

const browserErrorsSchema = z
	.object({
		sessionId: sessionIdField,
		clear: z.boolean().optional().describe('Clear buffer after reading'),
		pageId: pageIdField,
	})
	.describe('Get page errors (uncaught exceptions)');

const browserErrorsOutputSchema = z.object({
	errors: z.array(
		z.object({
			message: z.string(),
			stack: z.string().optional(),
			timestamp: z.number(),
		}),
	),
});

function browserErrors(sessionManager: SessionManager, toolGroupId: string): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_errors',
		'Get page errors (uncaught exceptions).',
		browserErrorsSchema,
		async (session, input, pageId) => {
			const errors = await session.adapter.getErrors(pageId, input.clear);
			return formatCallToolResult({ errors });
		},
		browserErrorsOutputSchema,
		toolGroupId,
	);
}

// ---------------------------------------------------------------------------
// browser_pdf
// ---------------------------------------------------------------------------

const browserPdfSchema = z
	.object({
		sessionId: sessionIdField,
		format: z.enum(['A4', 'Letter', 'Legal']).optional().describe('Page format (default: "A4")'),
		landscape: z.boolean().optional().describe('Landscape orientation'),
		pageId: pageIdField,
	})
	.describe('Generate a PDF of the current page');

const browserPdfOutputSchema = z.object({
	pdf: z.string(),
	pages: z.number(),
});

function browserPdf(sessionManager: SessionManager, toolGroupId: string): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_pdf',
		'Generate a PDF of the current page. Playwright only.',
		browserPdfSchema,
		async (session, input, pageId) => {
			const result = await session.adapter.pdf(pageId, {
				format: input.format,
				landscape: input.landscape,
			});
			return formatCallToolResult({ pdf: result.data, pages: result.pages });
		},
		browserPdfOutputSchema,
		toolGroupId,
	);
}

// ---------------------------------------------------------------------------
// browser_network
// ---------------------------------------------------------------------------

const browserNetworkSchema = z
	.object({
		sessionId: sessionIdField,
		filter: z.string().optional().describe('URL pattern filter (glob)'),
		clear: z.boolean().optional().describe('Clear buffer after reading'),
		pageId: pageIdField,
	})
	.describe('Get recent network requests and responses');

const browserNetworkOutputSchema = z.object({
	requests: z.array(
		z.object({
			url: z.string(),
			method: z.string(),
			status: z.number(),
			contentType: z.string().optional(),
			timestamp: z.number(),
		}),
	),
});

function browserNetwork(sessionManager: SessionManager, toolGroupId: string): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_network',
		'Get recent network requests and responses.',
		browserNetworkSchema,
		async (session, input, pageId) => {
			const requests = await session.adapter.getNetwork(pageId, input.filter, input.clear);
			return formatCallToolResult({ requests });
		},
		browserNetworkOutputSchema,
		toolGroupId,
	);
}
