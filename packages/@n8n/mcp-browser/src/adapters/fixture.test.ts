import { describe, expect, it, beforeEach } from 'vitest';

import { FixtureAdapter, type FixtureBundle } from './fixture';
import { UnsupportedOperationError } from '../errors';

const bundle: FixtureBundle = {
	version: 1,
	initialStateId: 's0',
	states: [
		{
			id: 's0',
			url: 'https://news.ycombinator.com',
			ariaTree: '- list:\n  - listitem "1. A [ref=e1]"\n  - listitem "2. B [ref=e2]"',
			html: '<ul><li>1. A</li><li>2. B</li></ul>',
		},
		{
			id: 's1',
			url: 'https://news.ycombinator.com/newest',
			ariaTree: '- textbox "token" [ref=e9]',
			elementValues: { e9: 'sk-ant-secret-value' },
			redactedSecrets: { '[REDACTED:anthropic_api_key:1]': 'sk-ant-redacted-value' },
		},
	],
	transitions: [{ from: 's0', action: { tool: 'browser_click', selector: 'text=More' }, to: 's1' }],
};

describe('FixtureAdapter', () => {
	let adapter: FixtureAdapter;
	beforeEach(async () => {
		adapter = new FixtureAdapter(bundle);
		await adapter.launch({ browser: 'chrome' });
	});

	it('serves the initial page-state tree, refCount and url', async () => {
		const snap = await adapter.snapshot();
		expect(snap.tree).toBe(bundle.states[0].ariaTree);
		expect(snap.refCount).toBe(2);
		expect(adapter.getPageUrl()).toBe('https://news.ycombinator.com');
	});

	it('serves recorded HTML from probePageHtml (drives real sensitivity/redaction)', async () => {
		const probe = await adapter.probePageHtml();
		expect(probe.ok).toBe(true);
		expect(probe.root?.html).toBe('<ul><li>1. A</li><li>2. B</li></ul>');
	});

	it('advances state on a matching click transition and captures the recorded value', async () => {
		await adapter.click('p', { selector: 'text=More' });
		const snap = await adapter.snapshot();
		expect(snap.tree).toBe('- textbox "token" [ref=e9]');
		expect(await adapter.getElementValue('p', { ref: 'e9' })).toBe('sk-ant-secret-value');
	});

	it('navigate falls back to a recorded state with the matching url', async () => {
		const res = await adapter.navigate('p', 'https://news.ycombinator.com/newest');
		expect(res.status).toBe(200);
		expect(adapter.getPageUrl()).toBe('https://news.ycombinator.com/newest');
	});

	it('resolves a redacted-key marker to its synthetic secret', async () => {
		await adapter.click('p', { selector: 'text=More' }); // advance to s1
		expect(await adapter.resolveRedactedSecret('p', '[REDACTED:anthropic_api_key:1]')).toBe(
			'sk-ant-redacted-value',
		);
		// Unknown marker ⇒ undefined (caller falls back to the HTML path).
		expect(await adapter.resolveRedactedSecret('p', '[REDACTED:nope:9]')).toBeUndefined();
	});

	it('dead-ends legibly when the agent leaves the recorded trajectory', async () => {
		await adapter.click('p', { selector: 'text=does-not-exist' });
		const snap = await adapter.snapshot();
		expect(snap.tree).toContain('No fixture page for this state');
		expect(snap.refCount).toBe(0);
		await expect(adapter.getElementValue('p', { ref: 'e9' })).rejects.toBeInstanceOf(
			UnsupportedOperationError,
		);
	});

	it('re-launch resets to the initial state', async () => {
		await adapter.click('p', { selector: 'text=More' });
		expect(adapter.getPageUrl()).toBe('https://news.ycombinator.com/newest');
		await adapter.launch({ browser: 'chrome' });
		expect(adapter.getPageUrl()).toBe('https://news.ycombinator.com');
	});
});
