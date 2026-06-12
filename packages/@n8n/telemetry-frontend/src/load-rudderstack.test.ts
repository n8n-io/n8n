import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadRudderStack } from './load-rudderstack';

function getCalls(method: string): unknown[][] {
	const buffer: unknown[] = window.rudderanalytics ?? [];
	return buffer.filter((entry): entry is unknown[] => Array.isArray(entry) && entry[0] === method);
}

function removeAllScripts() {
	for (const script of Array.from(document.getElementsByTagName('script'))) {
		script.remove();
	}
}

describe('loadRudderStack', () => {
	beforeEach(() => {
		delete window.rudderanalytics;
		removeAllScripts();
	});

	afterEach(() => {
		delete window.rudderanalytics;
		removeAllScripts();
	});

	it('installs the stub, calls load with the SDK args, and injects the script tag', () => {
		loadRudderStack({
			writeKey: 'wk',
			dataPlaneUrl: 'https://n8n.example.com/proxy',
			options: {
				configUrl: 'https://n8n.example.com/source',
				// eslint-disable-next-line @typescript-eslint/naming-convention
				integrations: { All: false },
				loadIntegration: false,
			},
		});

		expect(window.rudderanalytics).toBeDefined();
		expect(getCalls('load')).toEqual([
			[
				'load',
				'wk',
				'https://n8n.example.com/proxy',
				{
					configUrl: 'https://n8n.example.com/source',
					// eslint-disable-next-line @typescript-eslint/naming-convention
					integrations: { All: false },
					loadIntegration: false,
				},
			],
		]);

		const scripts = Array.from(document.getElementsByTagName('script'));
		const injected = scripts.find((s) => s.src.endsWith('/v1/ra.min.js'));
		expect(injected).toBeDefined();
		expect(injected?.src).toBe('https://cdn-rs.n8n.io/v1/ra.min.js');
		expect(injected?.async).toBe(true);
	});

	it('honours a custom cdnOrigin', () => {
		loadRudderStack({
			writeKey: 'wk',
			dataPlaneUrl: 'https://n8n.example.com/proxy',
			cdnOrigin: 'https://cdn.example.com',
		});

		const scripts = Array.from(document.getElementsByTagName('script'));
		const injected = scripts.find((s) => s.src.endsWith('/v1/ra.min.js'));
		expect(injected?.src).toBe('https://cdn.example.com/v1/ra.min.js');
	});

	it('exposes the queued methods on the stub so callers can invoke them before the SDK loads', () => {
		loadRudderStack({ writeKey: 'wk', dataPlaneUrl: 'https://n8n.example.com/proxy' });

		window.rudderanalytics?.track('Test event', { key: 'value' });
		window.rudderanalytics?.identify('user-1', { plan: 'pro' });
		window.rudderanalytics?.reset();

		expect(getCalls('track')).toEqual([['track', 'Test event', { key: 'value' }]]);
		expect(getCalls('identify')).toEqual([['identify', 'user-1', { plan: 'pro' }]]);
		expect(getCalls('reset')).toEqual([['reset']]);
	});

	it('falls back to document.head when no existing script tag is present', () => {
		expect(document.getElementsByTagName('script').length).toBe(0);

		loadRudderStack({ writeKey: 'wk', dataPlaneUrl: 'https://n8n.example.com/proxy' });

		const injected = document.head.querySelector('script[src$="/v1/ra.min.js"]');
		expect(injected).not.toBeNull();
	});
});
