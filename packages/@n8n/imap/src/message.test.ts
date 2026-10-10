import type { MessageStructureObject } from 'imapflow';

import { attachmentPartIDs, bodyPartID } from './message';

const SINGLE_PART: MessageStructureObject = {
	type: 'text/plain',
	parameters: { charset: 'UTF-8' },
	encoding: '7bit',
	size: 1152,
	lineCount: 23,
};

const MIXED: MessageStructureObject = {
	childNodes: [
		{
			part: '1',
			type: 'text/plain',
			parameters: { charset: 'UTF-8' },
			encoding: '7bit',
			size: 33,
			lineCount: 2,
		},
		{ part: '2', type: 'text', size: 0, lineCount: 0 },
		{
			part: '3',
			type: 'application/pdf',
			parameters: { name: 'invoice.pdf' },
			encoding: 'base64',
			size: 34584,
			disposition: 'attachment',
			dispositionParameters: { filename: 'invoice.pdf' },
		},
		{ part: '4', type: 'image/png', encoding: 'base64', size: 8342, disposition: 'attachment' },
	],
	type: 'multipart/mixed',
	parameters: { boundary: '----=_Part_9128_1502938' },
};

const NESTED: MessageStructureObject = {
	childNodes: [
		{
			childNodes: [
				{
					childNodes: [
						{ part: '1.1.1', type: 'text/plain', parameters: { charset: 'UTF-8' } },
						{ part: '1.1.2', type: 'text/html', parameters: { charset: 'UTF-8' } },
					],
					part: '1.1',
					type: 'multipart/alternative',
					parameters: { boundary: 'b3' },
				},
				{
					part: '1.2',
					type: 'image/gif',
					parameters: { name: 'inline.gif' },
					disposition: 'inline',
					dispositionParameters: { filename: 'inline.gif' },
				},
			],
			part: '1',
			type: 'multipart/related',
			parameters: { boundary: 'b2' },
		},
		{
			part: '2',
			type: 'application/zip',
			parameters: { name: 'bundle.zip' },
			disposition: 'attachment',
			dispositionParameters: { filename: 'bundle.zip' },
		},
	],
	type: 'multipart/mixed',
	parameters: { boundary: 'b1' },
};

/** An attached message: encapsulated parts hang off childNodes but are never fetched alone. */
const FORWARDED: MessageStructureObject = {
	childNodes: [
		{ part: '1', type: 'text/plain', parameters: { charset: 'UTF-8' } },
		{
			part: '2',
			type: 'message/rfc822',
			parameters: { name: 'forwarded.eml' },
			childNodes: [
				{
					part: '2',
					childNodes: [
						{ part: '2.1', type: 'text/plain' },
						{ part: '2.2', type: 'text/html' },
					],
					type: 'multipart/alternative',
					parameters: { boundary: '----=_inner' },
				},
			],
			disposition: 'attachment',
			dispositionParameters: { filename: 'forwarded.eml' },
		},
	],
	type: 'multipart/mixed',
	parameters: { boundary: '----=_Part_fwd2' },
};

describe('bodyPartID', () => {
	it('answers "1" for a single-part message, which imapflow leaves unnumbered', () => {
		expect(bodyPartID(SINGLE_PART, 'plain')).toBe('1');
	});

	it('finds the part of the requested subtype', () => {
		expect(bodyPartID(NESTED, 'plain')).toBe('1.1.1');
		expect(bodyPartID(NESTED, 'html')).toBe('1.1.2');
	});

	it('matches the subtype case-insensitively', () => {
		expect(bodyPartID(NESTED, 'HTML')).toBe('1.1.2');
	});

	it('answers nothing when no part has the subtype', () => {
		expect(bodyPartID(NESTED, 'calendar')).toBeUndefined();
	});

	it('ignores a subtype-less leaf, which is a malformed multipart', () => {
		expect(bodyPartID(MIXED, '')).toBeUndefined();
	});

	it('does not reach into an encapsulated message', () => {
		expect(bodyPartID(FORWARDED, 'html')).toBeUndefined();
		expect(bodyPartID(FORWARDED, 'plain')).toBe('1');
	});
});

describe('attachmentPartIDs', () => {
	it('collects the attachment-disposition parts', () => {
		expect(attachmentPartIDs(MIXED)).toEqual(['3', '4']);
	});

	it('leaves inline parts out', () => {
		expect(attachmentPartIDs(NESTED)).toEqual(['2']);
	});

	it('treats an attached message as one part', () => {
		expect(attachmentPartIDs(FORWARDED)).toEqual(['2']);
	});

	it('answers nothing for a message without parts to attach', () => {
		expect(attachmentPartIDs(SINGLE_PART)).toEqual([]);
	});

	it('orders by part number rather than by how the tree is walked', () => {
		const manyParts: MessageStructureObject = {
			type: 'multipart/mixed',
			childNodes: [2, 10, 1, 3].map((n) => ({
				part: String(n),
				type: 'application/pdf',
				disposition: 'attachment',
			})),
		};

		expect(attachmentPartIDs(manyParts)).toEqual(['1', '2', '3', '10']);
	});

	it('answers the same however the server ordered the child nodes', () => {
		const shuffled: MessageStructureObject = {
			...NESTED,
			childNodes: [...(NESTED.childNodes ?? [])].reverse(),
		};

		expect(attachmentPartIDs(shuffled)).toEqual(attachmentPartIDs(NESTED));
		expect(bodyPartID(shuffled, 'html')).toBe(bodyPartID(NESTED, 'html'));
	});
});
