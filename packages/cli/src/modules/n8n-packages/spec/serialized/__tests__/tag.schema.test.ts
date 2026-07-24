import { serializedTagSchema } from '../tag.schema';

describe('serializedTagSchema', () => {
	it('accepts an id/name pair', () => {
		const tag = { id: 'tag-1', name: 'production' };

		expect(() => serializedTagSchema.parse(tag)).not.toThrow();
	});

	it('rejects unknown keys such as timestamps', () => {
		const tag = { id: 'tag-1', name: 'production', createdAt: '2026-01-01T00:00:00.000Z' };

		expect(() => serializedTagSchema.parse(tag)).toThrow();
	});

	it('rejects an empty name', () => {
		const tag = { id: 'tag-1', name: '' };

		expect(() => serializedTagSchema.parse(tag)).toThrow();
	});

	it('accepts a supplementary-plane name', () => {
		const tag = { id: 'tag-1', name: '😀'.repeat(13) };

		expect(() => serializedTagSchema.parse(tag)).not.toThrow();
	});
});
