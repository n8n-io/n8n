import { z } from 'zod';

import type { BrowserConnection } from '../connection';
import type { ToolDefinition } from '../types';
import { formatCallToolResult, formatImageResponse } from '../utils';
import { createConnectedTool, elementTargetSchema, pageIdField } from './helpers';

export function createInspectionTools(connection: BrowserConnection): ToolDefinition[] {
	return [
		browserSnapshot(connection),
		browserScreenshot(connection),
		browserContent(connection),
		browserEvaluate(connection),
		browserConsole(connection),
		browserPdf(connection),
		browserNetwork(connection),
	];
}

// ---------------------------------------------------------------------------
// browser_snapshot — PRIMARY observation tool
// ---------------------------------------------------------------------------

const browserSnapshotSchema = z
	.object({
		scope: elementTargetSchema
			.optional()
			.describe('Optionally scope to a subtree rooted at this element'),
		pageId: pageIdField,
	})
	.describe('Get ref-annotated accessibility tree of the page');

const browserSnapshotOutputSchema = z.object({
	snapshot: z.string(),
});

function browserSnapshot(connection: BrowserConnection): ToolDefinition {
	return createConnectedTool(
		connection,
		'browser_snapshot',
		'Use this tool as your primary way to observe the page. Returns a ref-annotated accessibility tree — a compact text representation of all visible elements. Each interactive element gets a numeric ref for use in subsequent tool calls (browser_click, browser_type, etc.). Snapshots are small and fast. Prefer this over browser_screenshot unless you specifically need visual/layout information.',
		browserSnapshotSchema,
		async (state, input, pageId) => {
			const result = await state.adapter.snapshot(pageId, input.scope);
			return formatCallToolResult({ snapshot: result.tree });
		},
		browserSnapshotOutputSchema,
	);
}

// ---------------------------------------------------------------------------
// browser_screenshot
// ---------------------------------------------------------------------------

const browserScreenshotSchema = z
	.object({
		element: elementTargetSchema
			.optional()
			.describe('Optionally target a specific element to screenshot'),
		fullPage: z.boolean().optional().describe('Capture full scrollable page'),
		pageId: pageIdField,
	})
	.describe('Take a screenshot of the page or a specific element');

function browserScreenshot(connection: BrowserConnection): ToolDefinition {
	return createConnectedTool(
		connection,
		'browser_screenshot',
		'Take a screenshot of the page or a specific element. Returns a base64-encoded PNG image. Note: Prefer browser_snapshot for most tasks — it is smaller, faster, and returns refs for element targeting. Use screenshots only when you need visual information (layout, images, charts).',
		browserScreenshotSchema,
		async (state, input, pageId) => {
			const base64 = await state.adapter.screenshot(pageId, input.element, {
				fullPage: input.fullPage,
			});

			return formatImageResponse(base64, {
				hint: 'Prefer browser_snapshot for element discovery and interaction — it returns refs and uses less context.',
			});
		},
	);
}

// ---------------------------------------------------------------------------
// browser_content — structured markdown extraction
// ---------------------------------------------------------------------------

const browserContentSchema = z
	.object({
		selector: z
			.string()
			.optional()
			.describe(
				'CSS selector to scope extraction to a specific element. If omitted, extracts full page',
			),
		pageId: pageIdField,
	})
	.describe('Extract page content as structured markdown');

const browserContentOutputSchema = z.object({
	title: z.string(),
	content: z.string(),
	url: z.string(),
});

function browserContent(connection: BrowserConnection): ToolDefinition {
	return createConnectedTool(
		connection,
		'browser_content',
		'Extract page content as structured markdown with headings, links, lists, and tables preserved. Uses readability extraction to strip navigation, ads, and boilerplate. Prefer browser_snapshot for element discovery and interaction; use this when you need to read and understand page text content.',
		browserContentSchema,
		async (state, input, pageId) => {
			const { html, url } = await state.adapter.getContent(pageId, input.selector);

			const [{ JSDOM, VirtualConsole }, { Readability }, TurndownModule, { gfm }] =
				await Promise.all([
					import('jsdom'),
					import('@mozilla/readability'),
					import('turndown'),
					import('@joplin/turndown-plugin-gfm'),
				]);

			const TurndownService = TurndownModule.default;

			const virtualConsole = new VirtualConsole();
			const dom = new JSDOM(html, { url, virtualConsole });
			const article = new Readability(dom.window.document, { keepClasses: true }).parse();

			const title = article?.title ?? '';
			const articleHtml = article?.content ?? '';

			const turndownService = new TurndownService({
				headingStyle: 'atx',
				codeBlockStyle: 'fenced',
			});
			turndownService.use(gfm);

			const content = articleHtml ? turndownService.turndown(articleHtml) : '';

			return formatCallToolResult({ title, content, url });
		},
		browserContentOutputSchema,
	);
}

// ---------------------------------------------------------------------------
// browser_evaluate
// ---------------------------------------------------------------------------

const browserEvaluateSchema = z
	.object({
		script: z.string().describe('JavaScript to execute'),
		pageId: pageIdField,
	})
	.describe('Execute JavaScript in the page context');

const browserEvaluateOutputSchema = z.object({
	result: z.unknown(),
});

function browserEvaluate(connection: BrowserConnection): ToolDefinition {
	return createConnectedTool(
		connection,
		'browser_evaluate',
		'Execute JavaScript in the page context and return the result. The script must be an expression or IIFE. The result is JSON-serialized.',
		browserEvaluateSchema,
		async (state, input, pageId) => {
			const result = await state.adapter.evaluate(pageId, input.script);
			return formatCallToolResult({ result });
		},
		browserEvaluateOutputSchema,
	);
}

// ---------------------------------------------------------------------------
// browser_console
// ---------------------------------------------------------------------------

const browserConsoleSchema = z
	.object({
		level: z
			.enum(['log', 'warn', 'error', 'info', 'debug'])
			.optional()
			.describe(
				'Filter by log level. Each level includes more severe levels (e.g. "info" includes errors and warnings)',
			),
		clear: z.boolean().optional().describe('Clear buffer after reading'),
		pageId: pageIdField,
	})
	.describe('Get console messages and page errors');

const browserConsoleOutputSchema = z.object({
	entries: z.array(
		z.object({
			level: z.string(),
			text: z.string(),
			timestamp: z.number(),
		}),
	),
});

function browserConsole(connection: BrowserConnection): ToolDefinition {
	return createConnectedTool(
		connection,
		'browser_console',
		'Get console messages and page errors (uncaught exceptions). Page errors appear as entries with level "error". Use level filter to narrow results.',
		browserConsoleSchema,
		async (state, input, pageId) => {
			const entries = await state.adapter.getConsole(pageId, input.level, input.clear);
			return formatCallToolResult({ entries });
		},
		browserConsoleOutputSchema,
	);
}

// ---------------------------------------------------------------------------
// browser_pdf
// ---------------------------------------------------------------------------

const browserPdfSchema = z
	.object({
		format: z.enum(['A4', 'Letter', 'Legal']).optional().describe('Page format (default: "A4")'),
		landscape: z.boolean().optional().describe('Landscape orientation'),
		pageId: pageIdField,
	})
	.describe('Generate a PDF of the current page');

const browserPdfOutputSchema = z.object({
	pdf: z.string(),
	pages: z.number(),
});

function browserPdf(connection: BrowserConnection): ToolDefinition {
	return createConnectedTool(
		connection,
		'browser_pdf',
		'Generate a PDF of the current page.',
		browserPdfSchema,
		async (state, input, pageId) => {
			const result = await state.adapter.pdf(pageId, {
				format: input.format,
				landscape: input.landscape,
			});
			return formatCallToolResult({ pdf: result.data, pages: result.pages });
		},
		browserPdfOutputSchema,
	);
}

// ---------------------------------------------------------------------------
// browser_network
// ---------------------------------------------------------------------------

const browserNetworkSchema = z
	.object({
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

function browserNetwork(connection: BrowserConnection): ToolDefinition {
	return createConnectedTool(
		connection,
		'browser_network',
		'Get recent network requests and responses.',
		browserNetworkSchema,
		async (state, input, pageId) => {
			const requests = await state.adapter.getNetwork(pageId, input.filter, input.clear);
			return formatCallToolResult({ requests });
		},
		browserNetworkOutputSchema,
	);
}
