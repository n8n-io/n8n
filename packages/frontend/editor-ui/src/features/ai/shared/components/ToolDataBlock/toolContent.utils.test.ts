import { describe, expect, it } from 'vitest';
import { extractToolContent, toolContentFileName } from './toolContent.utils';

describe('extractToolContent', () => {
	it('reads an MCP result as the agents runtime stores it', () => {
		expect(
			extractToolContent({
				type: 'content',
				value: [
					{
						type: 'text',
						text: '<untrusted_data source="mcp:Test" label="get-tiny-image">\nHere you go:\n</untrusted_data>',
					},
					{ type: 'file', data: { type: 'data', data: 'iVBOR' }, mediaType: 'image/png' },
					{ type: 'file', data: { type: 'data', data: 'JVBER' }, mediaType: 'application/pdf' },
				],
			}),
		).toEqual([
			{ type: 'text', text: 'Here you go:' },
			{ type: 'image', data: 'iVBOR', mimeType: 'image/png' },
			{ type: 'file', data: 'JVBER', mimeType: 'application/pdf' },
		]);
	});

	it('reads a raw MCP result', () => {
		expect(
			extractToolContent({
				content: [
					{ type: 'image', data: 'R0lG', mimeType: 'image/gif' },
					{
						type: 'resource',
						resource: { uri: 'file:///a.csv', blob: 'YSxi', mimeType: 'text/csv' },
					},
				],
			}),
		).toEqual([
			{ type: 'image', data: 'R0lG', mimeType: 'image/gif' },
			{ type: 'file', data: 'YSxi', mimeType: 'text/csv' },
		]);
	});

	it.each([
		['a plain object', { ok: true }],
		['a string', 'done'],
		['an empty content list', { type: 'content', value: [] }],
		[
			'an unknown part',
			{ type: 'content', value: [{ type: 'text', text: 'a' }, { type: 'audio' }] },
		],
		['a file without a MIME type', { content: [{ type: 'image', data: 'R0lG' }] }],
	])('returns null for %s', (_, value) => {
		expect(extractToolContent(value)).toBeNull();
	});
});

describe('toolContentFileName', () => {
	it.each([
		['application/pdf', 'tool-file.pdf'],
		['text/csv; charset=utf-8', 'tool-file.csv'],
		['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'tool-file'],
	])('names a %s file %s', (mimeType, fileName) => {
		expect(toolContentFileName(mimeType)).toBe(fileName);
	});
});
