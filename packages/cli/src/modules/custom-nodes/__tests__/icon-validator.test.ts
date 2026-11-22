import { createRequire } from 'node:module';

import { UserError } from '@n8n/errors';

import { MAX_ICON_BYTES, SAX_EVENTS, validateIcon } from '../icon-validator';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const pngUri = (data: Buffer) => `data:image/png;base64,${data.toString('base64')}`;
const svgUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
const svg = (body: string, attributes = '') =>
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"${attributes}>${body}</svg>`;

const plainIcon = `<?xml version="1.0" encoding="UTF-8"?>
<!-- An icon with a path, a group and a gradient -->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24" width="24" height="24">
	<title>Acme</title>
	<defs>
		<linearGradient id="fade" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
			<stop offset="0" stop-color="#ff6d5a"/>
			<stop offset="1" stop-color="#ea4b71" stop-opacity="0.8"/>
		</linearGradient>
		<clipPath id="clip"><rect width="24" height="24" rx="4"/></clipPath>
	</defs>
	<g clip-path="url(#clip)" transform="translate(0 0)">
		<path id="shape" d="M0 0h24v24H0z" fill="url(#fade)" fill-rule="evenodd"/>
		<use href="#shape" opacity="0.5"/>
		<circle cx="12" cy="12" r="4" stroke="#fff" stroke-width="2" fill="none"/>
	</g>
</svg>`;

const expectRejected = async (uri: string, message?: RegExp) => {
	const promise = validateIcon(uri);
	await expect(promise).rejects.toThrow(UserError);
	if (message) await expect(promise).rejects.toThrow(message);
};

describe('validateIcon', () => {
	it('accepts a PNG', async () => {
		const data = Buffer.concat([PNG_SIGNATURE, Buffer.from('rest of the image')]);

		await expect(validateIcon(pngUri(data))).resolves.toEqual({ mimeType: 'image/png', data });
	});

	it('accepts a plain icon with path, group and gradient', async () => {
		await expect(validateIcon(svgUri(plainIcon))).resolves.toEqual({
			mimeType: 'image/svg+xml',
			data: Buffer.from(plainIcon),
		});
	});

	it('accepts accessibility and editor attributes that design tools add', async () => {
		const icon = svg(
			'<g data-name="Layer 1"><path d="M0 0h24v24H0z" aria-hidden="true"/></g>',
			' role="img" aria-label="Acme" aria-labelledby="t" focusable="false" xml:space="preserve"',
		);

		await expect(validateIcon(svgUri(icon))).resolves.toMatchObject({ mimeType: 'image/svg+xml' });
	});

	it('rejects url() in an accessibility attribute', async () => {
		const icon = svg('', ' aria-label="url(https://example.test/x)"');

		await expect(validateIcon(svgUri(icon))).rejects.toThrow('url()');
	});

	it('accepts an icon of exactly 256 KiB', async () => {
		const data = Buffer.concat([
			PNG_SIGNATURE,
			Buffer.alloc(MAX_ICON_BYTES - PNG_SIGNATURE.length),
		]);

		expect((await validateIcon(pngUri(data))).data).toHaveLength(256 * 1024);
	});

	it('rejects an icon of 257 KiB', async () => {
		const data = Buffer.concat([PNG_SIGNATURE, Buffer.alloc(257 * 1024 - PNG_SIGNATURE.length)]);

		await expectRejected(pngUri(data));
	});

	it('rejects a PNG without the PNG signature', async () => {
		await expectRejected(pngUri(Buffer.from('GIF89a not a png')));
	});

	it.each([
		['a JPEG data URI', 'data:image/jpeg;base64,/9j/4AAQ'],
		['a data URI that is not base64', `data:image/svg+xml,${svg('')}`],
		['a URL', 'https://example.com/icon.svg'],
		['invalid base64', 'data:image/png;base64,***'],
		['an empty image', 'data:image/png;base64,'],
	])('rejects %s', async (_, uri) => {
		await expectRejected(uri);
	});

	it.each([
		['a script element', svg('<script>x()</script>'), /<script>/],
		[
			'a foreignObject element',
			svg('<foreignObject><div>x</div></foreignObject>'),
			/foreignObject/,
		],
		['a style element', svg('<style>path { fill: red; }</style>'), /<style>/],
		['an image element', svg('<image href="#a" width="1" height="1"/>'), /<image>/],
		['an anchor element', svg('<a href="#shape"><path d="M0 0"/></a>'), /<a>/],
		['a text element', svg('<text x="0" y="10">Acme</text>'), /<text>/],
		['an unknown element', svg('<blink/>'), /<blink>/],
		['an event attribute', svg('<path d="M0 0" onclick="x()"/>'), /"onclick"/],
		['an event attribute on the root', svg('', ' onload="x()"'), /"onload"/],
		['a style attribute', svg('<path d="M0 0" style="fill:red"/>'), /"style"/],
		['an href with a scheme', svg('<use href="https://example.com/a.svg#x"/>'), /"href"/],
		[
			'an xlink:href with a scheme',
			svg(
				'<use xlink:href="data:image/svg+xml;base64,AAAA"/>',
				' xmlns:xlink="http://www.w3.org/1999/xlink"',
			),
			/"xlink:href"/,
		],
		[
			'an href written with character references',
			svg('<use href="&#106;&#97;vascript:x()"/>'),
			/"href"/,
		],
		[
			'a url() that points outside the document',
			svg('<path d="M0 0" fill="url(https://example.com/a.svg#g)"/>'),
			/url\(\)/,
		],
		[
			'a url() with a CSS escape',
			svg('<path d="M0 0" fill="\\75 rl(https://example.com)"/>'),
			/backslash/,
		],
		['a document type declaration', `<!DOCTYPE svg>${svg('')}`, /document type/],
		[
			'an entity declaration',
			`<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY x "y">]>${svg('')}`,
			/document type|entities/,
		],
		['a processing instruction', `<?xml-stylesheet href="a.css"?>${svg('')}`, /processing/],
		[
			'a root element that is not svg',
			'<g xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></g>',
			/root element/,
		],
		['text that is not well-formed XML', '<svg><g></svg>', /well-formed/],
		['an undefined entity', svg('<title>&x;</title>'), /well-formed/],
	])('rejects an SVG with %s', async (_, text, message) => {
		await expectRejected(svgUri(text), message);
	});

	it.each([
		['a second element after the root element', `${svg('')}<svg onload="x()"></svg>`],
		['an unquoted element after the root element', `${svg('')}<img src=x onerror=x()>`],
		['a script element after the root element', `${svg('')}<script>`],
		['text after the root element', `${svg('')}garbage <b>`],
		['a CDATA section after the root element', `${svg('')}<![CDATA[x]]>`],
		['text before the root element', `x${svg('')}`],
		['a second XML declaration', `<?xml version="1.0"?><?xml version="1.0"?>${svg('')}`],
		['an XML declaration after a comment', `<!-- c --><?xml version="1.0"?>${svg('')}`],
		['an unclosed root element', '<svg xmlns="http://www.w3.org/2000/svg">'],
		['an empty document', '   '],
	])('rejects an SVG with %s', async (_, text) => {
		await expectRejected(svgUri(text));
	});

	it('rejects a second root element even when it has only allowed content', async () => {
		await expectRejected(svgUri(`${svg('')}${svg('<path d="M0 0"/>')}`), /after the root element/);
	});

	it('rejects an attribute named __proto__', async () => {
		await expectRejected(svgUri(svg('<path d="M0 0" __proto__="x"/>')), /"__proto__"/);
		await expectRejected(svgUri(svg('', ' __proto__="x"')), /"__proto__"/);
	});

	it('accepts a trailing comment and trailing whitespace after the root element', async () => {
		const text = `${svg('<path d="M0 0"/>')}\n<!-- end -->\n  \n`;

		await expect(validateIcon(svgUri(text))).resolves.toMatchObject({ mimeType: 'image/svg+xml' });
	});

	it('accepts an XML declaration and a comment before the root element', async () => {
		const text = `<?xml version="1.0" encoding="UTF-8"?>\n<!-- made by hand -->\n${svg('')}`;

		await expect(validateIcon(svgUri(text))).resolves.toMatchObject({ mimeType: 'image/svg+xml' });
	});

	it('accepts text inside title and desc', async () => {
		const text = svg('<title>Acme &amp; Co</title><desc>Logo</desc><path d="M0 0"/>');

		await expect(validateIcon(svgUri(text))).resolves.toMatchObject({ mimeType: 'image/svg+xml' });
	});

	describe('markup outside the drawing', () => {
		const note = '<!-- Generator: Example 1.0 -->';

		it.each([
			['before the root element', `${note}\n${svg('<path d="M0 0"/>')}`],
			['inside the root element', svg(`${note}<g>${note}<path d="M0 0"/></g>`)],
			['after the root element', `${svg('<path d="M0 0"/>')}\n${note}\n`],
		])('accepts a plain comment %s', async (_, text) => {
			await expect(validateIcon(svgUri(text))).resolves.toMatchObject({
				mimeType: 'image/svg+xml',
			});
		});

		it.each([
			['before the root element', `<!FOO>${svg('')}`],
			['inside the root element', svg('<!FOO bar>')],
			['after the root element', `${svg('')}<!FOO>`],
		])('rejects an SGML declaration %s', async (_, text) => {
			await expectRejected(svgUri(text), /well-formed/);
		});

		it.each([
			['element-like text', svg('<!-- <script>x()</script> --><path d="M0 0"/>')],
			['element-like text before the root element', `<!-- <img> -->${svg('')}`],
			['element-like text after the root element', `${svg('')}<!-- <svg onload="x()"> -->`],
			['text that starts with >', svg('<!-->x--><path d="M0 0"/>')],
			['text that starts with ->', svg('<!--->x--><path d="M0 0"/>')],
		])('rejects a comment with %s', async (_, text) => {
			await expectRejected(svgUri(text));
		});

		it.each([
			['inside title', svg('<title><![CDATA[Acme]]></title>')],
			['inside g', svg('<g><![CDATA[x]]></g>')],
			['after the root element', `${svg('')}<![CDATA[x]]>`],
		])('rejects a CDATA section %s', async (_, text) => {
			await expectRejected(svgUri(text));
		});

		it.each([
			['directly inside g', svg('<g>Acme</g>')],
			['directly inside svg', svg('Acme<path d="M0 0"/>')],
		])('rejects text %s', async (_, text) => {
			await expectRejected(svgUri(text), /text inside/);
		});

		it('rejects whitespace before the XML declaration', async () => {
			await expectRejected(svgUri(`\n<?xml version="1.0"?>${svg('')}`));
			await expectRejected(svgUri(` <?xml version="1.0"?>${svg('')}`));
		});
	});

	it('handles every event that the installed XML parser can emit', () => {
		// `sax` is not a direct dependency of packages/cli. Load the copy that xml2js uses.
		const requireFromHere = createRequire(__filename);
		const requireFromXml2js = createRequire(requireFromHere.resolve('xml2js'));
		const sax = requireFromXml2js('sax') as { EVENTS: string[] };

		expect(sax.EVENTS.length).toBeGreaterThan(0);
		expect([...SAX_EVENTS].sort()).toEqual([...sax.EVENTS].sort());
	});

	it('names the element that is not allowed in the error', async () => {
		await expect(validateIcon(svgUri(svg('<script>x()</script>')))).rejects.toThrow(
			'The SVG icon has the element <script>, which is not allowed.',
		);
	});

	it('rejects an SVG that is not UTF-8 text', async () => {
		const data = Buffer.from([0x3c, 0x73, 0x76, 0x67, 0xff, 0xfe, 0x3e]);

		await expectRejected(`data:image/svg+xml;base64,${data.toString('base64')}`);
	});
});
