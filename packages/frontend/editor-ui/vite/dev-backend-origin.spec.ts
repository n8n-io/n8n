import { describe, expect, it } from 'vitest';

import { resolveDevBackendOrigin } from './dev-backend-origin';

describe('resolveDevBackendOrigin', () => {
	it('keeps the historical default when VUE_APP_URL_BASE_API is unset', () => {
		expect(resolveDevBackendOrigin(undefined)).toBe('//localhost:5678');
		expect(resolveDevBackendOrigin('')).toBe('//localhost:5678');
	});

	// The regression this guards: with the origin hardcoded to //localhost:5678, the
	// three /static/* tags 404 for anyone running the backend on another port —
	// isolated worktrees, two branches side by side.
	it('follows a non-default backend port instead of pinning 5678', () => {
		expect(resolveDevBackendOrigin('http://localhost:5846/')).toBe('http://localhost:5846');
	});

	it('leaves the `pnpm dev:fe` default pointing at the same host and port', () => {
		// editor-ui's `serve` script sets exactly this value.
		expect(resolveDevBackendOrigin('http://localhost:5678/')).toBe('http://localhost:5678');
	});

	it('strips any number of trailing slashes and tolerates none', () => {
		expect(resolveDevBackendOrigin('http://localhost:5846')).toBe('http://localhost:5846');
		expect(resolveDevBackendOrigin('http://localhost:5846///')).toBe('http://localhost:5846');
	});

	it('accepts a remote or protocol-relative backend', () => {
		expect(resolveDevBackendOrigin('https://n8n.internal/')).toBe('https://n8n.internal');
		expect(resolveDevBackendOrigin('//localhost:5846/')).toBe('//localhost:5846');
	});

	// A relative value would rewrite the tags to a path Vite serves itself, and all
	// three would 404 — worse than the default, so fall back instead.
	it.each(['/', '/api/', 'rest/'])('falls back for the relative value %j', (value) => {
		expect(resolveDevBackendOrigin(value)).toBe('//localhost:5678');
	});
});
