import { z } from 'zod';

import type { BrowserConnection } from '../connection';
import type { SnapshotOptions, ToolDefinition } from '../types';
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
		browserDiffUrls(connection),
		browserFrame(connection),
		browserHighlight(connection),
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
		interactive: z
			.boolean()
			.optional()
			.describe('Only interactive controls (buttons, links, inputs) — smaller output'),
		compact: z.boolean().optional().describe('Remove empty structural nodes from the tree'),
		maxDepth: z.number().int().optional().describe('Maximum snapshot tree depth'),
		includeLinkUrls: z.boolean().optional().describe('Include href URLs on link elements'),
		diffMode: z
			.enum(['since_last', 'baseline'])
			.optional()
			.describe('since_last: unified diff vs previous snapshot in session; baseline: diff vs file'),
		baselineSnapshotPath: z
			.string()
			.optional()
			.describe('When diffMode is baseline, path to saved snapshot text file'),
		maxOutputChars: z
			.number()
			.optional()
			.describe('Truncate snapshot output to this many characters'),
		contentBoundaries: z
			.boolean()
			.optional()
			.describe('Wrap output in boundary markers for safer LLM consumption'),
	})
	.describe('Get ref-annotated accessibility tree of the page');

const browserSnapshotOutputSchema = z.object({
	snapshot: z.string(),
});

function browserSnapshot(connection: BrowserConnection): ToolDefinition {
	return createConnectedTool(
		connection,
		'browser_snapshot',
		'Use this tool as your primary way to observe the page. Returns a ref-annotated accessibility tree (agent-browser format with @eN refs). Prefer interactive+compact for fewer tokens. Use diffMode since_last after an action to verify what changed. Prefer this over browser_screenshot unless you need pixels.',
		browserSnapshotSchema,
		async (state, input, pageId) => {
			const opts: SnapshotOptions = {
				interactive: input.interactive,
				compact: input.compact,
				maxDepth: input.maxDepth,
				includeLinkUrls: input.includeLinkUrls,
				maxOutputChars: input.maxOutputChars,
				contentBoundaries: input.contentBoundaries,
			};
			if (input.diffMode === 'since_last') {
				opts.diffMode = 'since_last';
			} else if (input.diffMode === 'baseline') {
				opts.diffMode = 'baseline';
				opts.baselineFilePath = input.baselineSnapshotPath;
			}
			const result = await state.adapter.snapshot(pageId, input.scope, opts);
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
		annotate: z
			.boolean()
			.optional()
			.describe('Overlay numbered labels [N] mapped to @eN refs (strong visual+ref pairing)'),
		format: z.enum(['png', 'jpeg']).optional().describe('Image format (default png)'),
		quality: z.number().min(1).max(100).optional().describe('JPEG quality when format is jpeg'),
		screenshotDir: z
			.string()
			.optional()
			.describe('Directory to persist screenshots when supported'),
		diffBaselinePath: z
			.string()
			.optional()
			.describe('Baseline image path for pixel diff (returns diff image as PNG)'),
		diffOutputPath: z.string().optional().describe('Where to write diff image when diffing'),
		diffThreshold: z
			.number()
			.optional()
			.describe('Pixel diff color distance threshold 0–1 (default agent-browser 0.1)'),
		pageId: pageIdField,
	})
	.describe('Take a screenshot of the page or a specific element');

function browserScreenshot(connection: BrowserConnection): ToolDefinition {
	return createConnectedTool(
		connection,
		'browser_screenshot',
		'Take a screenshot (PNG/JPEG). Annotated screenshots pair pixels with @eN refs. Use diffBaselinePath for visual regression. Prefer browser_snapshot for structure unless you need layout, charts, or canvas.',
		browserScreenshotSchema,
		async (state, input, pageId) => {
			const base64 = await state.adapter.screenshot(pageId, input.element, {
				fullPage: input.fullPage,
				annotate: input.annotate,
				format: input.format,
				quality: input.quality,
				screenshotDir: input.screenshotDir,
				diffBaselinePath: input.diffBaselinePath,
				diffOutputPath: input.diffOutputPath,
				diffThreshold: input.diffThreshold,
				element: input.element,
			});

			const mime = input.format === 'jpeg' ? 'image/jpeg' : 'image/png';
			let hint =
				'Prefer browser_snapshot for element discovery — it returns @eN refs and uses less context.';
			if (input.annotate) {
				hint = 'Annotated: numbered labels map to @eN refs in snapshots.';
			} else if (input.diffBaselinePath) {
				hint = 'Pixel diff image vs baseline.';
			}
			return formatImageResponse(base64, { hint }, mime);
		},
	);
}

// ---------------------------------------------------------------------------
// browser_diff_urls — compare two URLs (staging vs prod)
// ---------------------------------------------------------------------------

const browserDiffUrlsSchema = z.object({
	urlA: z.string().min(1).describe('First URL to load and snapshot'),
	urlB: z.string().min(1).describe('Second URL (browser ends on this page)'),
	includeScreenshot: z.boolean().optional().describe('Also compare screenshots'),
	fullPage: z.boolean().optional().describe('Full-page screenshots when includeScreenshot'),
	waitUntil: z
		.enum(['load', 'domcontentloaded', 'networkidle'])
		.optional()
		.describe('Per-navigation wait strategy'),
	scope: z.string().optional().describe('CSS selector or @ref to scope snapshots'),
	compact: z.boolean().optional(),
	maxDepth: z.number().optional(),
	pageId: pageIdField,
});

const browserDiffUrlsOutputSchema = z.object({
	snapshotDiff: z.string(),
});

function browserDiffUrls(connection: BrowserConnection): ToolDefinition {
	return createConnectedTool(
		connection,
		'browser_diff_urls',
		'Compare two URLs in one step (agent-browser diff url): snapshot diff and optional screenshot diff. Ends with urlB loaded.',
		browserDiffUrlsSchema,
		async (state, input, _pageId) => {
			const result = await state.adapter.diffUrls(input.urlA, input.urlB, {
				includeScreenshot: input.includeScreenshot,
				fullPage: input.fullPage,
				waitUntil: input.waitUntil,
				scope: input.scope,
				compact: input.compact,
				maxDepth: input.maxDepth,
			});
			return formatCallToolResult({ snapshotDiff: result.snapshotDiff });
		},
		browserDiffUrlsOutputSchema,
	);
}

// ---------------------------------------------------------------------------
// browser_frame — iframe context
// ---------------------------------------------------------------------------

const browserFrameSchema = z.object({
	target: z
		.union([elementTargetSchema, z.literal('main')])
		.describe('Iframe: CSS selector or @eN ref. Use "main" for top document.'),
	pageId: pageIdField,
});

const browserFrameOutputSchema = z.object({
	ok: z.boolean(),
});

function browserFrame(connection: BrowserConnection): ToolDefinition {
	return createConnectedTool(
		connection,
		'browser_frame',
		'Switch snapshot/interaction context to an iframe or back to the main frame (agent-browser frame).',
		browserFrameSchema,
		async (state, input, pageId) => {
			await state.adapter.setFrameContext(pageId, input.target === 'main' ? 'main' : input.target);
			return formatCallToolResult({ ok: true });
		},
		browserFrameOutputSchema,
	);
}

// ---------------------------------------------------------------------------
// browser_highlight — debug outline
// ---------------------------------------------------------------------------

const browserHighlightSchema = z.object({
	element: elementTargetSchema.describe('Element to highlight'),
	pageId: pageIdField,
});

const browserHighlightOutputSchema = z.object({
	highlighted: z.boolean(),
});

function browserHighlight(connection: BrowserConnection): ToolDefinition {
	return createConnectedTool(
		connection,
		'browser_highlight',
		'Highlight an element on the page (outline) for debugging or before screenshots.',
		browserHighlightSchema,
		async (state, input, pageId) => {
			await state.adapter.highlight(pageId, input.element);
			return formatCallToolResult({ highlighted: true });
		},
		browserHighlightOutputSchema,
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
