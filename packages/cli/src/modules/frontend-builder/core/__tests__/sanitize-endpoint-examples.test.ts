import { sanitizeEndpointExamples } from '../sanitize-endpoint-examples';

describe('sanitizeEndpointExamples', () => {
	it('truncates arrays to the first 20 items', () => {
		const input = { items: Array.from({ length: 50 }, (_, i) => ({ i })) };
		const out = sanitizeEndpointExamples(input) as { items: unknown[] };
		expect(out.items).toHaveLength(20);
	});

	it('drops n8n binary-shaped values', () => {
		const input = {
			file: { data: 'AAAABBBB', mimeType: 'application/octet-stream', fileName: 'x.bin' },
			ok: true,
		};
		const out = sanitizeEndpointExamples(input) as Record<string, unknown>;
		expect(out.file).toBeUndefined();
		expect(out.ok).toBe(true);
	});

	it('drops binary keys outright', () => {
		const input = { json: { name: 'x' }, binary: { file: { data: 'AAAA' } } };
		const out = sanitizeEndpointExamples(input) as Record<string, unknown>;
		expect(out.binary).toBeUndefined();
		expect(out.json).toEqual({ name: 'x' });
	});

	it('is a no-op for scalars and null', () => {
		expect(sanitizeEndpointExamples(null)).toBeNull();
		expect(sanitizeEndpointExamples(42)).toBe(42);
		expect(sanitizeEndpointExamples('hello')).toBe('hello');
		expect(sanitizeEndpointExamples(true)).toBe(true);
	});

	it('caps recursion past MAX_DEPTH and replaces deeper values', () => {
		let deep: unknown = 'leaf';
		for (let i = 0; i < 10; i += 1) deep = { nested: deep };
		const out = sanitizeEndpointExamples(deep) as Record<string, unknown>;
		// Walk down past MAX_DEPTH (6) and assert the next level is the cap sentinel.
		let cursor: unknown = out;
		for (let i = 0; i < 7; i += 1) {
			cursor = (cursor as Record<string, unknown>).nested;
		}
		expect(cursor).toBe('…');
	});

	it('handles nested arrays inside objects with both rules in play', () => {
		const input = {
			rows: Array.from({ length: 30 }, (_, i) => ({ id: i })),
			file: { data: 'A', mimeType: 'text/plain', fileName: 'a.txt' },
		};
		const out = sanitizeEndpointExamples(input) as { rows: unknown[]; file?: unknown };
		expect(out.rows).toHaveLength(20);
		expect(out.file).toBeUndefined();
	});
});
