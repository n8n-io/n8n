import { attachmentParts, bodyPart, getParts } from './message';
import type { MessagePart } from './types';

const part = (partID: string, overrides: Partial<MessagePart> = {}): MessagePart =>
	({ partID, type: 'TEXT', subtype: 'plain', encoding: '7BIT', ...overrides }) as MessagePart;

describe('getParts', () => {
	it('flattens a nested structure', () => {
		const struct = [{}, [[part('1')], [part('2'), [part('2.1')]]]];

		expect(getParts(struct).map((p) => p.partID)).toEqual(['1', '2', '2.1']);
	});

	it('skips entries without a part ID', () => {
		expect(getParts([{ type: 'multipart' }, part('1')])).toEqual([part('1')]);
	});

	it('is empty for a structure holding no parts', () => {
		expect(getParts([])).toEqual([]);
	});
});

describe('bodyPart', () => {
	const parts = [
		part('1', { subtype: 'plain' }),
		part('2', { subtype: 'html' }),
		part('3', { type: 'APPLICATION' as MessagePart['type'], subtype: 'pdf' }),
	];

	it.each(['plain', 'html'])('finds the text/%s part', (subtype) => {
		expect(bodyPart(parts, subtype)?.subtype).toBe(subtype);
	});

	it('matches regardless of case', () => {
		expect(bodyPart([part('1', { subtype: 'PLAIN' })], 'plain')?.partID).toBe('1');
	});

	it('is undefined when no part carries that body', () => {
		expect(bodyPart(parts, 'calendar')).toBeUndefined();
	});
});

describe('attachmentParts', () => {
	it('keeps only the parts disposed as attachments', () => {
		const parts = [
			part('1'),
			part('2', { disposition: { type: 'attachment', params: { filename: 'a.pdf' } } }),
			part('3', { disposition: { type: 'inline' } }),
			part('4', { disposition: { type: 'ATTACHMENT' } }),
		];

		expect(attachmentParts(parts).map((p) => p.partID)).toEqual(['2', '4']);
	});

	it('is empty when nothing is attached', () => {
		expect(attachmentParts([part('1')])).toEqual([]);
	});
});
