import { extractText } from '../doc-page-text';

describe('extractText', () => {
	it('joins every text field of a Tiptap document', () => {
		const doc = {
			type: 'doc',
			content: [
				{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Overview' }] },
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'Returns the ab' },
						{ type: 'text', text: 'sen', marks: [{ type: 'bold' }] },
						{ type: 'text', text: 'ce of a user.' },
					],
				},
				{ type: 'horizontalRule' },
				{
					type: 'bulletList',
					content: [
						{
							type: 'listItem',
							content: [{ type: 'paragraph', content: [{ type: 'text', text: 'GET only' }] }],
						},
					],
				},
			],
		};

		expect(extractText(doc)).toBe('Overview Returns the absence of a user. GET only');
	});

	it('returns an empty string for an empty or invalid document', () => {
		expect(extractText({ type: 'doc', content: [] })).toBe('');
		expect(extractText(null)).toBe('');
	});
});
