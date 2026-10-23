import { JSDOM } from 'jsdom';

import { analyzeHtmlSensitivity } from './analyze-html';
import { elementText } from './dom-matchers';
import { REDACTION_MARKER_PATTERN } from '../redaction/redact';
import { applyRedactions } from '../redaction/redaction-applier';
import { createCredentialTools } from '../tools/credential';
import {
	createMockConnection,
	findTool,
	htmlProbe,
	textOf,
	TOOL_CONTEXT,
} from '../tools/test-helpers';
import type { CallToolResult } from '../types';

// Patterns go stale, so this corpus pins the shapes providers issue *today*:
// every one must survive snapshot → marker → capture byte-exact and leave no
// fragment in what the model reads.
const KEY_SHAPES: Array<{ name: string; key: string }> = [
	{
		name: 'google (dot-prefixed)',
		key: `AQ.${'Ab8RN6Jr7xQfP2mKdW9tZsLyVc4hEuNgT3iBoXaQwMzRkJvSpH'}`,
	},
	// Longer than the fixed-count pattern matches, which covers only a prefix.
	{
		name: 'google (legacy, over-long)',
		key: `AIza${'SyC7mQ2xR9tKdW4vLpZ8bNfH3jEuXaGoT5wPqYs1Bc'}`,
	},
	{
		name: 'jwt',
		key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0N2FjMzhkOWJmIiwiaWF0IjoxNzE2Mzk5MDIyfQ.9tKdW4vLpZ8bNfH3jEuXaGoT5wPqYs1BcRmZxQ',
	},
	{ name: 'telegram (colon-separated)', key: '7845123096:AAHd9tKdW4vLpZ8bNfH3jEuXaGoT5wPqYs1' },
	{ name: 'azure (tilde-separated)', key: 'xY8~Q9tKdW4vLpZ8bNfH3jEuXaGoT5wPqYs1Bc7mR2' },
	{ name: 'sendgrid (two dots)', key: 'SG.9tKdW4vLpZ8bNfH.3jEuXaGoT5wPqYs1BcRmZxQ2vLp' },
	// No pattern knows this shape — stands in for the next format change.
	{ name: 'unknown dotted shape', key: 'Zt7.9tKdW4vLpZ8bNfH3jEuXaGoT5wPqYs1BcRmZxQ' },
];

// How a provider console renders a fresh key: a text node in a panel with
// copy/reveal affordances, so there is no ref to capture from.
function revealPanel(key: string): string {
	return `<html><body><section>
			<span>Your API key</span>
			<div>${key}</div>
			<button aria-label="Copy API key">Copy</button>
			<button aria-label="Show API key">Show</button>
		</section></body></html>`;
}

// The same panel as a real console ships it: no whitespace between tags, so
// `textContent` runs the sibling text together.
function minifiedRevealPanel(key: string): string {
	return revealPanel(key).replace(/>\s+</g, '><');
}

/**
 * Derived from the page, not hand-written: a value the detector reports but that
 * never appears in what the model reads would otherwise pass unnoticed.
 */
function visibleText(html: string): string {
	return elementText(new JSDOM(html).window.document.body);
}

/** What must remain once every marker is stripped: the page without the key. */
function textWithoutKey(render: (key: string) => string): string {
	return visibleText(render(''));
}

function residue(html: string): string {
	return redactedSnapshot(html)
		.replace(new RegExp(REDACTION_MARKER_PATTERN, 'g'), '')
		.replace(/\s+/g, ' ')
		.trim();
}

/** The redacted page text the model reads for a page rendering a key. */
function redactedSnapshot(html: string): string {
	const sensitivity = analyzeHtmlSensitivity(htmlProbe(html));
	if (!sensitivity.ok) throw new Error(sensitivity.error);
	const result: CallToolResult = { content: [{ type: 'text', text: visibleText(html) }] };
	return textOf(applyRedactions(result, sensitivity));
}

function markerFor(html: string): string {
	const marker = REDACTION_MARKER_PATTERN.exec(redactedSnapshot(html))?.[0];
	if (!marker) throw new Error('No redaction marker found');
	return marker;
}

/** Run `browser_capture_secret` for a marker and return what it buffered. */
async function capturedVia(marker: string, html: string): Promise<string | undefined> {
	const capture = vi.fn();
	const mockConn = createMockConnection();
	mockConn.adapter.probePageHtml.mockResolvedValue(htmlProbe(html));

	await findTool(createCredentialTools(mockConn.connection), 'browser_capture_secret').execute(
		{ credentialsKey: 'k1', field: 'apiKey', element: { redactedKey: marker } },
		{ ...TOOL_CONTEXT, secretsBuffer: { capture, getFields: vi.fn(), clear: vi.fn() } },
	);

	return capture.mock.calls[0]?.[2] as string | undefined;
}

describe('current provider key shapes', () => {
	it.each(KEY_SHAPES)('leaves nothing of a $name key visible', ({ key }) => {
		expect(residue(revealPanel(key))).toBe(textWithoutKey(revealPanel));
	});

	it.each(KEY_SHAPES)('captures a $name key whole via its marker', async ({ key }) => {
		const html = revealPanel(key);

		expect(await capturedVia(markerFor(html), html)).toBe(key);
	});

	// A key with entropy below the 4.5 gate is found by its provider pattern
	// alone, so the pattern's own span is all that stands between it and the model.
	it('redacts a low-entropy key that only the provider pattern finds', () => {
		const key = `AQ.${'AbCdEfGhIj'.repeat(3)}Ab`;

		expect(residue(minifiedRevealPanel(key))).toBe(textWithoutKey(minifiedRevealPanel));
	});

	it.each(KEY_SHAPES)('leaves nothing of a $name key visible in minified markup', ({ key }) => {
		expect(residue(minifiedRevealPanel(key))).toBe(textWithoutKey(minifiedRevealPanel));
	});

	// Both renderings must be masked, not just whichever the merge kept.
	it('leaves nothing visible when two tokens share a fragment', () => {
		const fragment = 'Zt7vLpQ9mKdW4xR2bNfH3jEuXaGoT5wPqYs1BcRmZxQ';
		const panel = (key: string) => revealPanel(`alpha.${key}</div><div>bravo.${key}`);

		expect(residue(panel(fragment))).not.toContain(fragment);
	});

	// An open-ended provider pattern covers the whole key, so the marker keeps the
	// specific type rather than being subsumed by a wider entropy span.
	it('labels an over-long key with its provider type', () => {
		const { key } = KEY_SHAPES[1];
		const snapshot = redactedSnapshot(revealPanel(key));

		expect(snapshot).toContain('[REDACTED:google_api_key:');
		expect(snapshot).not.toContain(key.slice(-7));
	});
});
