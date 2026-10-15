import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { detectBrowserUseExtension } from '../browserUseExtension';
import { BROWSER_USE_EXTENSION_ID } from '../../constants';

const PROBEABLE_ORIGINS = [
	'http://localhost:5678/home/workflows',
	'https://localhost/home/workflows',
	'http://127.0.0.1:5678/home/workflows',
	'https://acme.app.n8n.cloud/home/workflows',
	'https://acme.stage-app.n8n.cloud/home/workflows',
];

const originalLocation = window.location;

function setLocation(href: string) {
	Object.defineProperty(window, 'location', {
		value: new URL(href),
		writable: true,
		configurable: true,
	});
}

afterEach(() => {
	vi.restoreAllMocks();
	Object.defineProperty(window, 'location', {
		value: originalLocation,
		writable: true,
		configurable: true,
	});
});

describe('detectBrowserUseExtension', () => {
	it('reports the extension as installed when the connect page is reachable', async () => {
		setLocation('https://acme.app.n8n.cloud/home/workflows');
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true } as Response);

		await expect(detectBrowserUseExtension()).resolves.toBe('installed');
		expect(fetchSpy).toHaveBeenCalledWith(
			'chrome-extension://cegmdpndekdfpnafgacidejijecomlhh/connect.html',
			{ method: 'HEAD' },
		);
	});

	it('reports the extension as missing when the connect page is unreachable', async () => {
		setLocation('https://acme.app.n8n.cloud/home/workflows');
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

		await expect(detectBrowserUseExtension()).resolves.toBe('not-installed');
	});

	it.each(PROBEABLE_ORIGINS)('probes the extension on the allowed origin %s', async (href) => {
		setLocation(href);
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true } as Response);

		await expect(detectBrowserUseExtension()).resolves.toBe('installed');
		expect(fetchSpy).toHaveBeenCalled();
	});

	// The connect page is only web-accessible to the origins in the extension manifest, so
	// anywhere else a failure means nothing and must not disable the connect flow.
	it.each([
		'https://n8n.selfhosted.example.com/home/workflows',
		'http://acme.app.n8n.cloud/home/workflows',
		'https://evil-app.n8n.cloud/home/workflows',
		// Bare apex hosts and non-http schemes are absent from the manifest.
		'https://app.n8n.cloud/home/workflows',
		'https://stage-app.n8n.cloud/home/workflows',
		'file://localhost/home/workflows',
	])('stays inconclusive without probing on %s', async (href) => {
		setLocation(href);
		const fetchSpy = vi.spyOn(globalThis, 'fetch');

		await expect(detectBrowserUseExtension()).resolves.toBe('unknown');
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('stays inconclusive when the probe returns an unexpected response', async () => {
		setLocation('https://acme.app.n8n.cloud/home/workflows');
		vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as Response);

		await expect(detectBrowserUseExtension()).resolves.toBe('unknown');
	});
});

describe('probeable origins vs. the extension manifest', () => {
	// Read lazily: a missing or moved manifest should fail only these cases, not the probe
	// tests above. `process.cwd()` is the package root, per the convention in
	// @n8n/composables/src/__tests__/packageBoundary.test.ts (jsdom gives no `file:` URL).
	function readManifest() {
		const manifestPath = path.resolve(
			process.cwd(),
			'../../@n8n/mcp-browser-extension/manifest.json',
		);
		return JSON.parse(readFileSync(manifestPath, 'utf8')) as {
			key: string;
			web_accessible_resources: Array<{ resources: string[]; matches: string[] }>;
		};
	}

	function connectPageMatches(): string[] {
		const entry = readManifest().web_accessible_resources.find((it) =>
			it.resources.includes('connect.html'),
		);
		if (!entry) throw new Error('connect.html is no longer a web_accessible_resource');
		return entry.matches;
	}

	// `isProbeableOrigin` must stay a subset of these: probing an origin the manifest no longer
	// covers reports a confident "not installed" to users who do have the extension. CI only runs
	// this suite when editor-ui itself changes, so drift surfaces on the next change here rather
	// than in the PR that edits the manifest.
	it.each([
		'https://*.app.n8n.cloud/*',
		'https://*.stage-app.n8n.cloud/*',
		'http://localhost/*',
		'https://localhost/*',
		'http://127.0.0.1/*',
		'https://127.0.0.1/*',
	])('the manifest still covers %s', (pattern) => {
		expect(connectPageMatches()).toContain(pattern);
	});

	// Chrome derives the ID from the manifest `key`, so a key rotation would silently break both
	// the probe URL and the web-store link.
	it('derives the extension ID we hardcode from the manifest key', () => {
		const digest = createHash('sha256')
			.update(Buffer.from(readManifest().key, 'base64'))
			.digest('hex')
			.slice(0, 32);
		const derivedId = [...digest]
			.map((char) => String.fromCharCode('a'.charCodeAt(0) + parseInt(char, 16)))
			.join('');

		expect(derivedId).toBe(BROWSER_USE_EXTENSION_ID);
	});
});
