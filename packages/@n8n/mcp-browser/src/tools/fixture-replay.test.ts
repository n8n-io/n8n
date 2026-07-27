import { describe, expect, it, beforeEach } from 'vitest';

import { createBrowserTools } from './index';
import { findTool, structuredOf } from './test-helpers';
import type { FixtureBundle } from '../adapters/fixture';
import type { ToolContext } from '../types';

// End-to-end (X-mode) proof: a browser tool call runs through the REAL tool
// pipeline (createConnectedTool → enrichment → jsdom sensitivity → redaction)
// backed by the deterministic FixtureAdapter — no real browser, extension, CDP
// relay, or daemon. Goal: computer-use-evals.

const bundle: FixtureBundle = {
	version: 1,
	initialStateId: 's0',
	states: [
		{
			id: 's0',
			url: 'https://news.ycombinator.com',
			ariaTree:
				'- list:\n  - listitem "1. First post [ref=e1]"\n  - listitem "2. Second [ref=e2]"\n  - listitem "3. Third [ref=e3]"',
			html: '<ol><li>1. First post</li><li>2. Second</li><li>3. Third</li></ol>',
		},
		{
			id: 's1',
			url: 'https://news.ycombinator.com/newest',
			ariaTree: '- heading "Newest"',
			html: '<h1>Newest</h1>',
		},
	],
	transitions: [{ from: 's0', action: { tool: 'browser_click', selector: 'text=More' }, to: 's1' }],
};

const ctx: ToolContext = { dir: '/tmp' };

describe('fixture replay through the real browser tool pipeline', () => {
	let toolkit: ReturnType<typeof createBrowserTools>;

	beforeEach(async () => {
		toolkit = createBrowserTools({ adapter: 'fixture' }, { fixtures: bundle });
		await toolkit.connection.connect(); // no real browser required for fixtures
	});

	it('browser_snapshot returns the recorded aria tree via the tool pipeline', async () => {
		const snapshot = findTool(toolkit.tools, 'browser_snapshot');
		const result = await snapshot.execute({}, ctx);
		expect(structuredOf(result).snapshot).toBe(bundle.states[0].ariaTree);
	});

	it('browser_click advances the page-state; the next snapshot reflects it', async () => {
		const click = findTool(toolkit.tools, 'browser_click');
		await click.execute({ element: { selector: 'text=More' } }, ctx);

		const snapshot = findTool(toolkit.tools, 'browser_snapshot');
		const result = await snapshot.execute({}, ctx);
		expect(structuredOf(result).snapshot).toBe(bundle.states[1].ariaTree);
	});
});
