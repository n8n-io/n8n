import { NodeOperationError } from 'n8n-workflow';

import {
	buildBodyEnvelope,
	envelopeHasContent,
	readBodyEnvelope,
} from '../../../actions/page/bodyEnvelope';
import { mockExecuteCtx } from '../../shared';

describe('buildBodyEnvelope', () => {
	describe('plainText', () => {
		it.each([
			['wraps a single line in a paragraph block', 'Hello world', '<p>Hello world</p>'],
			[
				'wraps each non-blank line in its own paragraph',
				'First\nSecond\n\n  \nThird',
				'<p>First</p><p>Second</p><p>Third</p>',
			],
			[
				'escapes markup so text cannot inject storage format',
				'<script>1 & 2 > "0"</script>',
				'<p>&lt;script&gt;1 &amp; 2 &gt; &quot;0&quot;&lt;/script&gt;</p>',
			],
			['produces an empty value for empty input', '', ''],
			['coerces number expression results instead of dropping them', 42, '<p>42</p>'],
			['coerces boolean expression results instead of dropping them', true, '<p>true</p>'],
		])('%s', (_name, input, value) => {
			expect(buildBodyEnvelope('plainText', input)).toEqual({ representation: 'storage', value });
		});

		it('rejects object content instead of creating an empty page', () => {
			expect(() => buildBodyEnvelope('plainText', { some: 'object' })).toThrow(
				'must be text, got an object',
			);
		});
	});

	describe('storage', () => {
		it('passes storage markup through verbatim', () => {
			const html = '<h2>Title</h2><table><tr><td>x</td></tr></table>';
			expect(buildBodyEnvelope('storage', html)).toEqual({
				representation: 'storage',
				value: html,
			});
		});

		it('rejects non-string content', () => {
			expect(() => buildBodyEnvelope('storage', { html: '<p>x</p>' })).toThrow(
				'Storage (HTML) body must be a string',
			);
		});
	});

	describe('atlas_doc_format', () => {
		const doc = { type: 'doc', version: 1, content: [] };

		it.each([
			['serializes an already-parsed document object', doc],
			['parses and re-serializes a JSON string', JSON.stringify(doc)],
		])('%s', (_name, input) => {
			expect(buildBodyEnvelope('atlas_doc_format', input)).toEqual({
				representation: 'atlas_doc_format',
				value: JSON.stringify(doc),
			});
		});

		it.each([
			['invalid JSON', '{not json', 'not valid JSON'],
			['an empty string', '  ', 'empty'],
			['an array document', JSON.stringify([1, 2]), 'must be a JSON object'],
			['a null document', 'null', 'must be a JSON object'],
			['a scalar document', '"text"', 'must be a JSON object'],
		])('rejects %s', (_name, input, message) => {
			expect(() => buildBodyEnvelope('atlas_doc_format', input)).toThrow(message);
		});
	});
});

describe('envelopeHasContent', () => {
	const adf = (content: unknown[]) =>
		buildBodyEnvelope('atlas_doc_format', { type: 'doc', version: 1, content });

	it.each([
		['storage markup', buildBodyEnvelope('storage', '<p>x</p>'), true],
		['a whitespace-only storage body', buildBodyEnvelope('storage', '  \n '), false],
		[
			'a storage body of only empty paragraphs',
			buildBodyEnvelope('storage', '<p></p><p> </p>'),
			false,
		],
		[
			'a storage body of only nested structural markup',
			buildBodyEnvelope(
				'storage',
				'<div><br /><ul><li></li></ul><table><tr><td></td></tr></table></div>',
			),
			false,
		],
		[
			'a storage body of only non-breaking spaces',
			buildBodyEnvelope('storage', '<p>&nbsp;</p>'),
			false,
		],
		[
			'a storage body of only numeric non-breaking-space entities',
			buildBodyEnvelope('storage', '<p>&#160;</p><p>&#xa0;</p>'),
			false,
		],
		[
			'CDATA text as the only storage content',
			buildBodyEnvelope('storage', '<p><![CDATA[hello]]></p>'),
			true,
		],
		[
			'a storage body with only a blank CDATA section',
			buildBodyEnvelope('storage', '<p><![CDATA[  ]]></p>'),
			false,
		],
		['a storage body with a visible entity', buildBodyEnvelope('storage', '<p>&amp;</p>'), true],
		[
			'text nested in structural storage markup',
			buildBodyEnvelope('storage', '<div><p>hi</p></div>'),
			true,
		],
		[
			'an emoticon as the only storage content',
			buildBodyEnvelope('storage', '<p><ac:emoticon ac:name="smile" /></p>'),
			true,
		],
		[
			'a macro as the only storage content',
			buildBodyEnvelope('storage', '<ac:structured-macro ac:name="toc" />'),
			true,
		],
		[
			'an attached image as the only storage content',
			buildBodyEnvelope(
				'storage',
				'<p><ac:image><ri:attachment ri:filename="x.png" /></ac:image></p>',
			),
			true,
		],
		['a horizontal rule as the only storage content', buildBodyEnvelope('storage', '<hr />'), true],
		['a plain-text body', buildBodyEnvelope('plainText', 'Hello'), true],
		['an empty plain-text body', buildBodyEnvelope('plainText', ' \n '), false],
		['an empty ADF document', adf([]), false],
		[
			'an ADF document with only empty paragraphs',
			adf([{ type: 'paragraph', content: [] }]),
			false,
		],
		[
			'an ADF document with only whitespace text',
			adf([{ type: 'paragraph', content: [{ type: 'text', text: '   ' }] }]),
			false,
		],
		[
			'an ADF document with text',
			adf([{ type: 'paragraph', content: [{ type: 'text', text: 'Hi' }] }]),
			true,
		],
		[
			'text nested in list structure',
			adf([
				{
					type: 'bulletList',
					content: [
						{
							type: 'listItem',
							content: [{ type: 'paragraph', content: [{ type: 'text', text: 'item' }] }],
						},
					],
				},
			]),
			true,
		],
		[
			'a non-text node as the only content',
			adf([{ type: 'paragraph', content: [{ type: 'emoji', attrs: { shortName: ':+1:' } }] }]),
			true,
		],
		[
			'an expand whose only text is its title',
			adf([
				{
					type: 'expand',
					attrs: { title: 'Read me' },
					content: [{ type: 'paragraph', content: [] }],
				},
			]),
			true,
		],
		[
			'an expand with a blank title and no body text',
			adf([{ type: 'expand', attrs: { title: '  ' }, content: [{ type: 'paragraph' }] }]),
			false,
		],
		['malformed entries in the content array', adf([null, 'text', 42]), false],
	])('%s → %s', (_name, envelope, expected) => {
		expect(envelopeHasContent(envelope)).toBe(expected);
	});
});

describe('readBodyEnvelope', () => {
	it('reads the field matching the selected format', () => {
		const ctx = mockExecuteCtx({
			bodyFormat: 'storage',
			bodyStorage: '<p>from storage field</p>',
			bodyPlainText: 'from the wrong field',
		});
		expect(readBodyEnvelope(ctx, 0).value).toBe('<p>from storage field</p>');
	});

	it('defaults to plain text', () => {
		const ctx = mockExecuteCtx({ bodyPlainText: 'Hello' });
		expect(readBodyEnvelope(ctx, 0)).toEqual({ representation: 'storage', value: '<p>Hello</p>' });
	});

	it('wraps envelope errors in a NodeOperationError carrying the item index', () => {
		const ctx = mockExecuteCtx({ bodyFormat: 'atlas_doc_format', bodyAdf: '{broken' });
		try {
			readBodyEnvelope(ctx, 3);
			throw new Error('expected readBodyEnvelope to throw');
		} catch (error) {
			expect(error).toBeInstanceOf(NodeOperationError);
			expect((error as NodeOperationError).context.itemIndex).toBe(3);
		}
	});
});
