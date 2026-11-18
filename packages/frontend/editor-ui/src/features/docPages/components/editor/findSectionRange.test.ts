import { Schema } from '@tiptap/pm/model';

import { findSectionRange } from './findSectionRange';

const schema = new Schema({
	nodes: {
		doc: { content: 'block+' },
		paragraph: { group: 'block', content: 'text*' },
		heading: { group: 'block', content: 'text*', attrs: { level: { default: 1 } } },
		text: {},
	},
});

const h = (level: number, text: string) => schema.node('heading', { level }, schema.text(text));
const p = (text: string) => schema.node('paragraph', null, schema.text(text));

const doc = schema.node('doc', null, [
	h(2, 'Overview'),
	p('intro'),
	h(2, 'Endpoint'),
	p('GET /absence'),
	h(3, 'Path'),
	p('details'),
	h(2, 'Authentication'),
	p('header auth'),
]);

const textIn = (range: { from: number; to: number }) => doc.textBetween(range.from, range.to, '|');

describe('findSectionRange', () => {
	it('selects from the heading to the next heading of the same level', () => {
		const range = findSectionRange(doc, 'Endpoint');
		expect(range).not.toBeNull();
		expect(textIn(range!)).toBe('Endpoint|GET /absence|Path|details');
	});

	it('stops at a heading of a higher level', () => {
		const range = findSectionRange(doc, 'Path');
		expect(textIn(range!)).toBe('Path|details');
	});

	it('runs to the doc end for the last section', () => {
		const range = findSectionRange(doc, 'Authentication');
		expect(range!.to).toBe(doc.content.size);
		expect(textIn(range!)).toBe('Authentication|header auth');
	});

	it('ignores markdown hashes and case in the heading', () => {
		expect(findSectionRange(doc, '## endpoint')).toEqual(findSectionRange(doc, 'Endpoint'));
	});

	it('returns null when the heading is not found', () => {
		expect(findSectionRange(doc, 'Responses')).toBeNull();
	});
});
