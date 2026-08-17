import { NodeOperationError } from 'n8n-workflow';

import { buildBodyEnvelope, readBodyEnvelope } from '../../../actions/page/bodyEnvelope';
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
