import { describe, it, expect } from 'vitest';

import { createClient } from '../client';

describe('createClient', () => {
	it('returns an object that exposes service accessors', () => {
		const n8n = createClient({ baseUrl: 'http://x', token: 't' });
		// L2 proxy is built around a callable so accessing a service yields a function-shaped proxy.
		expect(typeof (n8n as Record<string, unknown>).slack).toBe('function');
	});

	it('throws if token is missing', () => {
		expect(() => createClient({ baseUrl: 'http://x', token: '' })).toThrow();
	});

	it('throws if baseUrl is missing', () => {
		expect(() => createClient({ baseUrl: '', token: 't' })).toThrow();
	});
});
