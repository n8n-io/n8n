import { UserError } from '@n8n/errors';

import { MAX_ICON_BYTES, validateIcon } from '../icon-validator';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const pngUri = (data: Buffer) => `data:image/png;base64,${data.toString('base64')}`;
const svgUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

const plainSvg =
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="#ff6d5a"/></svg>';

describe('validateIcon', () => {
	it('accepts a PNG', () => {
		const data = Buffer.concat([PNG_SIGNATURE, Buffer.from('rest of the image')]);

		expect(validateIcon(pngUri(data))).toEqual({ mimeType: 'image/png', data });
	});

	it('accepts a plain SVG', () => {
		expect(validateIcon(svgUri(plainSvg))).toEqual({
			mimeType: 'image/svg+xml',
			data: Buffer.from(plainSvg),
		});
	});

	it('accepts an icon of exactly 256 KiB', () => {
		const data = Buffer.concat([
			PNG_SIGNATURE,
			Buffer.alloc(MAX_ICON_BYTES - PNG_SIGNATURE.length),
		]);

		expect(validateIcon(pngUri(data)).data).toHaveLength(256 * 1024);
	});

	it('rejects an icon of 257 KiB', () => {
		const data = Buffer.concat([PNG_SIGNATURE, Buffer.alloc(257 * 1024 - PNG_SIGNATURE.length)]);

		expect(() => validateIcon(pngUri(data))).toThrow(UserError);
	});

	it('rejects a PNG without the PNG signature', () => {
		expect(() => validateIcon(pngUri(Buffer.from('GIF89a not a png')))).toThrow(UserError);
	});

	it.each([
		['a JPEG data URI', 'data:image/jpeg;base64,/9j/4AAQ'],
		['a data URI that is not base64', `data:image/svg+xml,${plainSvg}`],
		['a URL', 'https://example.com/icon.svg'],
		['invalid base64', 'data:image/png;base64,***'],
		['an empty image', 'data:image/png;base64,'],
	])('rejects %s', (_, uri) => {
		expect(() => validateIcon(uri)).toThrow(UserError);
	});

	it.each([
		['a script element', '<svg xmlns="http://www.w3.org/2000/svg"><script>x()</script></svg>'],
		[
			'a script element in upper case',
			'<svg xmlns="http://www.w3.org/2000/svg"><SCRIPT>x()</SCRIPT></svg>',
		],
		['an onload attribute', '<svg xmlns="http://www.w3.org/2000/svg" onload="x()"></svg>'],
		[
			'an event attribute after a line break',
			'<svg xmlns="http://www.w3.org/2000/svg"\nOnClick="x()"></svg>',
		],
		[
			'a javascript: link',
			'<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:x()"><path d="M0 0"/></a></svg>',
		],
		[
			'a foreignObject element',
			'<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div>x</div></foreignObject></svg>',
		],
	])('rejects an SVG with %s', (_, svg) => {
		expect(() => validateIcon(svgUri(svg))).toThrow(UserError);
	});

	it('rejects an SVG that is not text', () => {
		const data = Buffer.from([0x3c, 0x73, 0x76, 0x67, 0xff, 0xfe, 0x3e]);

		expect(() => validateIcon(`data:image/svg+xml;base64,${data.toString('base64')}`)).toThrow(
			UserError,
		);
	});

	it('rejects an SVG without an svg element', () => {
		expect(() => validateIcon(svgUri('<html></html>'))).toThrow(UserError);
	});
});
