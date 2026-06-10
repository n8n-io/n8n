// Explicit vitest imports: the renderer tsconfig deliberately has `types: []`,
// so the vitest globals are not ambiently typed here.
import { describe, expect, it } from 'vitest';

import { toSignInPrefill } from './sign-in-prefill';

describe('toSignInPrefill', () => {
	it('returns null when no URL is remembered', () => {
		expect(toSignInPrefill(null)).toBeNull();
		expect(toSignInPrefill('')).toBeNull();
	});

	it('extracts the slug from a cloud instance URL', () => {
		expect(toSignInPrefill('https://my-workspace.app.n8n.cloud')).toEqual({
			kind: 'cloud',
			slug: 'my-workspace',
		});
	});

	it('returns a self-hosted URL as custom', () => {
		expect(toSignInPrefill('https://n8n.example.com')).toEqual({
			kind: 'custom',
			url: 'https://n8n.example.com',
		});
	});

	it('treats lookalike URLs that do not fit the slug field as custom', () => {
		// Nested subdomain: the slug input only holds a single label.
		expect(toSignInPrefill('https://a.b.app.n8n.cloud')).toEqual({
			kind: 'custom',
			url: 'https://a.b.app.n8n.cloud',
		});
		// Plain http never composes back from the cloud field (it hardcodes https).
		expect(toSignInPrefill('http://my.app.n8n.cloud')).toEqual({
			kind: 'custom',
			url: 'http://my.app.n8n.cloud',
		});
		// Suffix-only URL would leave an empty slug.
		expect(toSignInPrefill('https://.app.n8n.cloud')).toEqual({
			kind: 'custom',
			url: 'https://.app.n8n.cloud',
		});
	});
});
