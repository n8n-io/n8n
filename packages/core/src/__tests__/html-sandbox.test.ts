import { Readable } from 'stream';

import {
	bufferEscapeHtml,
	createHtmlSandboxTransformStream,
	isHtmlRenderedContentType,
	sandboxHtmlResponse,
} from '../html-sandbox';

// Utility function to consume a stream into a buffer
async function consumeStreamToString(stream: NodeJS.ReadableStream): Promise<string> {
	const chunks: Buffer[] = [];

	return await new Promise((resolve, reject) => {
		stream.on('data', (chunk: Buffer) => chunks.push(chunk));
		stream.on('end', () => resolve(Buffer.concat(chunks).toString()));
		stream.on('error', reject);
	});
}

describe('sandboxHtmlResponse', () => {
	it('should replace ampersands and double quotes in HTML', () => {
		const html = '<div class="test">Content & more</div>';
		expect(sandboxHtmlResponse(html)).toMatchSnapshot();
	});

	it('should handle empty HTML', () => {
		const html = '';
		expect(sandboxHtmlResponse(html)).toMatchSnapshot();
	});

	it('should handle HTML with special characters', () => {
		const html = '<p>Special characters: <>&"\'</p>';
		expect(sandboxHtmlResponse(html)).toMatchSnapshot();
	});
});

describe('isHtmlRenderedContentType', () => {
	it('should return true for text/html content type', () => {
		const contentType = 'text/html';
		expect(isHtmlRenderedContentType(contentType)).toBe(true);
	});

	it('should return true for application/xhtml+xml content type', () => {
		const contentType = 'application/xhtml+xml';
		expect(isHtmlRenderedContentType(contentType)).toBe(true);
	});

	it('should return false for other content types', () => {
		const contentType = 'application/json';
		expect(isHtmlRenderedContentType(contentType)).toBe(false);
	});

	describe('should handle various HTML content types', () => {
		test.each([
			'text/html',
			'TEXT/HTML',
			'text/html; charset=utf-8',
			'text/html; charset=iso-8859-1',
			'application/xhtml+xml',
			'APPLICATION/XHTML+XML',
			'application/xhtml+xml; charset=utf-8',
		])('should return true for %s', (contentType) => {
			expect(isHtmlRenderedContentType(contentType)).toBe(true);
		});
	});

	describe('should handle non-HTML content types', () => {
		test.each([
			'text/plain',
			'application/xml',
			'text/css',
			'application/javascript',
			'image/png',
			'application/pdf',
			'',
			'html',
			'xhtml',
		])('should return false for %s', (contentType) => {
			expect(isHtmlRenderedContentType(contentType)).toBe(false);
		});
	});

	it('should handle edge cases', () => {
		expect(isHtmlRenderedContentType('text/htmlsomething')).toBe(true);
		expect(isHtmlRenderedContentType('application/xhtml+xmlsomething')).toBe(true);
		expect(isHtmlRenderedContentType(' text/html')).toBe(false);
		expect(isHtmlRenderedContentType('text/html ')).toBe(true);
	});
});

describe('bufferEscapeHtml', () => {
	it('should return the same buffer when no escaping is needed', () => {
		const input = Buffer.from('Hello World', 'utf8');
		const result = bufferEscapeHtml(input);

		expect(result).toEqual(input);
		expect(result.toString()).toBe('Hello World');
	});

	it('should handle empty buffer', () => {
		const input = Buffer.alloc(0);
		const result = bufferEscapeHtml(input);

		expect(result).toEqual(input);
		expect(result.length).toBe(0);
	});

	describe('should escape special characters', () => {
		test.each([
			['&', '&amp;'],
			['"', '&quot;'],
			['&"', '&amp;&quot;'],
			['Hello & World', 'Hello &amp; World'],
			['Hello "World"', 'Hello &quot;World&quot;'],
			['Hello & "World"', 'Hello &amp; &quot;World&quot;'],
			['Hello && World', 'Hello &amp;&amp; World'],
			['Hello ""World""', 'Hello &quot;&quot;World&quot;&quot;'],
			['&"Hello"&"World"&', '&amp;&quot;Hello&quot;&amp;&quot;World&quot;&amp;'],
		])('should escape %s to %s', (input, expected) => {
			const buffer = Buffer.from(input, 'utf8');
			const result = bufferEscapeHtml(buffer);
			expect(result.toString()).toBe(expected);
		});
	});

	it('should handle unicode characters with special characters', () => {
		const input = Buffer.from('Hello & 世界 "World" & こんにちは', 'utf8');
		const result = bufferEscapeHtml(input);

		expect(result.toString()).toBe('Hello &amp; 世界 &quot;World&quot; &amp; こんにちは');
	});

	it('should not modify other special characters', () => {
		const input = Buffer.from('Hello <World> & "Test"', 'utf8');
		const result = bufferEscapeHtml(input);

		expect(result.toString()).toBe('Hello <World> &amp; &quot;Test&quot;');
		expect(result.toString()).toContain('<');
		expect(result.toString()).toContain('>');
	});
});

describe('createHtmlSandboxTransformStream', () => {
	const getComparableHtml = (input: Buffer | string) =>
		sandboxHtmlResponse(input.toString()).replace(/\s+/g, ' ');

	it('should wrap single chunk in iframe with proper escaping', async () => {
		const input = Buffer.from('Hello & "World"', 'utf8');
		const transform = createHtmlSandboxTransformStream();
		const readable = new Readable();
		readable.push(input);
		readable.push(null);

		const result = await consumeStreamToString(readable.pipe(transform));

		expect(result).toEqual(getComparableHtml(input));
	});

	it('should handle multiple chunks correctly', async () => {
		const transform = createHtmlSandboxTransformStream();
		const readable = new Readable();
		const inputChunks = ['Hello & ', '"World"', ' & Test'];

		for (const chunk of inputChunks) {
			readable.push(Buffer.from(chunk, 'utf8'));
		}
		readable.push(null);

		const result = await consumeStreamToString(readable.pipe(transform));

		expect(result).toEqual(getComparableHtml(inputChunks.join('')));
	});

	it('should handle empty input', async () => {
		const transform = createHtmlSandboxTransformStream();
		const readable = new Readable();
		readable.push(null);

		const result = await consumeStreamToString(readable.pipe(transform));

		expect(result).toEqual(getComparableHtml(''));
	});

	it('should handle empty chunks', async () => {
		const transform = createHtmlSandboxTransformStream();
		const readable = new Readable();

		readable.push(Buffer.alloc(0));
		readable.push(Buffer.from('Hello', 'utf8'));
		readable.push(Buffer.alloc(0));
		readable.push(null);

		const result = await consumeStreamToString(readable.pipe(transform));

		expect(result).toEqual(getComparableHtml('Hello'));
	});

	it('should handle string chunks by converting to buffer', async () => {
		const transform = createHtmlSandboxTransformStream();
		const readable = new Readable();
		readable.push('Hello & "World"');
		readable.push(null);

		const result = await consumeStreamToString(readable.pipe(transform));

		expect(result).toEqual(getComparableHtml('Hello & "World"'));
	});

	it('should handle unicode characters correctly', async () => {
		const input = Buffer.from('Hello & 世界 "World" & こんにちは', 'utf8');
		const transform = createHtmlSandboxTransformStream();
		const readable = new Readable();
		readable.push(input);
		readable.push(null);

		const result = await consumeStreamToString(readable.pipe(transform));

		expect(result).toEqual(getComparableHtml(input));
	});

	it('should handle large content in chunks', async () => {
		const baseString = 'Hello & World "Test" & Another "Quote"';
		const largeContent = baseString.repeat(100);
		const transform = createHtmlSandboxTransformStream();
		const readable = new Readable();

		// Split into chunks
		const chunkSize = 1000;
		for (let i = 0; i < largeContent.length; i += chunkSize) {
			const chunk = largeContent.slice(i, i + chunkSize);
			readable.push(Buffer.from(chunk, 'utf8'));
		}
		readable.push(null);

		const result = await consumeStreamToString(readable.pipe(transform));

		expect(result).toEqual(getComparableHtml(largeContent));
	});

	it('should handle special HTML characters', async () => {
		const input = Buffer.from('<div>&"Hello"</div>', 'utf8');
		const transform = createHtmlSandboxTransformStream();
		const readable = new Readable();
		readable.push(input);
		readable.push(null);

		const result = await consumeStreamToString(readable.pipe(transform));

		expect(result).toEqual(getComparableHtml(input));
	});

	it('should handle mixed content types', async () => {
		const transform = createHtmlSandboxTransformStream();
		const readable = new Readable();

		readable.push(Buffer.from('Hello', 'utf8'));
		readable.push(' & World');
		readable.push(Buffer.from(' "Test"', 'utf8'));
		readable.push(null);

		const result = await consumeStreamToString(readable.pipe(transform));

		expect(result).toEqual(getComparableHtml('Hello & World "Test"'));
	});

	it('should produce valid HTML structure', async () => {
		const input = Buffer.from('<h1>Hello & "World"</h1>', 'utf8');
		const transform = createHtmlSandboxTransformStream();
		const readable = new Readable();
		readable.push(input);
		readable.push(null);

		const result = await consumeStreamToString(readable.pipe(transform));

		expect(result).toEqual(getComparableHtml(input));
	});
});
