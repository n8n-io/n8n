import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	contentDispositionFileName,
	fileTypeOf,
	fixtureBytes,
	handleNames,
	mimeExtension,
	mimeLookup,
	pathParts,
	prettyBytes,
	referenceHash,
	storedResponse,
} from '../reference/binary-response.ts';

// The packages that n8n-core uses for binary data. They load from its dependencies when they are installed.
const corePackage = join(dirname(fileURLToPath(import.meta.url)), '../../../../core/package.json');
const core = existsSync(corePackage) ? createRequire(corePackage) : undefined;
function load<T>(name: string): T | undefined {
	try {
		return core?.(name);
	} catch {
		return undefined;
	}
}
const mime = load<{
	types: Record<string, string>;
	lookup(path: string): string | false;
	extension(type: string): string | false;
}>('mime-types');
const pretty = load<(count: number) => string>('pretty-bytes');
function networkFile(): string {
	try {
		return join(
			dirname(core?.resolve('@n8n/backend-network') ?? ''),
			'http/parse-incoming-message.js',
		);
	} catch {
		return '';
	}
}
const network = load<{
	parseContentDisposition(header?: string): { filename?: string } | null;
}>(networkFile());

const PATHS = [
	'a.txt',
	'a/b/c.tar.gz',
	'/a',
	'/a.b/c',
	'a//b.png',
	'a/',
	'a.pdf/',
	'/',
	'//',
	'.bashrc',
	'dir/.hidden',
	'..',
	'a..',
	'...',
	'a.',
	'x',
	'reports/Summary.PDF',
	'json',
	'a b.jpeg',
];

describe('binary data of a response: the rules of n8n', () => {
	it('splits a path as path.parse of Node.js does', () => {
		for (const path of PATHS) {
			const parsed = posix.parse(path);
			expect({ path, ...pathParts(path) }).toEqual({
				path,
				dir: parsed.dir,
				base: parsed.base,
				ext: parsed.ext.slice(1),
			});
		}
	});

	it.skipIf(mime === undefined)('finds MIME types and extensions as mime-types does', () => {
		if (!mime) return;
		for (const extension of Object.keys(mime.types)) {
			expect([extension, mimeLookup(`file.${extension}`)]).toEqual([
				extension,
				mime.lookup(`file.${extension}`) || '',
			]);
		}
		for (const type of new Set(Object.values(mime.types))) {
			expect([type, mimeExtension(type)]).toEqual([type, mime.extension(type) || '']);
		}
		for (const path of PATHS)
			expect([path, mimeLookup(path)]).toEqual([path, mime.lookup(path) || '']);
		for (const type of [
			'IMAGE/PNG',
			' text/html; charset=utf-8',
			'text/plain ;x',
			'application/x-none',
			'',
			';',
			'a|b',
		]) {
			expect([type, mimeExtension(type)]).toEqual([type, mime.extension(type) || '']);
		}
	});

	it.skipIf(pretty === undefined)('writes a size as pretty-bytes does', () => {
		if (!pretty) return;
		const sizes = [0, 1, 11, 999, 1000, 1001, 1005, 1015, 1337, 1995, 9995, 99_949, 99_950];
		for (const power of [1e3, 1e6, 1e9, 1e12]) {
			for (const near of [-1001, -500, -2, -1, 0, 1, 5, 499, 500, 501, 4999, 5000, 5001])
				sizes.push(power + near);
			for (const factor of [1.005, 1.015, 1.245, 2.675, 9.995, 99.95, 999.5, 999.4999])
				sizes.push(Math.round(power * factor));
		}
		for (const size of sizes) {
			if (size < 0 || size >= 1e12) continue;
			expect([size, prettyBytes(size)]).toEqual([size, pretty(size)]);
		}
		expect(() => prettyBytes(1e12)).toThrow();
		expect(() => prettyBytes(1.5)).toThrow();
	});

	it('reads the file name of Content-Disposition', () => {
		const headers = [
			'attachment; filename="report.pdf"',
			'attachment; filename=report.pdf',
			'inline; filename="my%20file.pdf"',
			'filename="example.png"',
			'attachment; filename=%22test%20file.txt%22',
			'attachment; filename="75%.pdf"',
			"attachment; filename=plain.txt; filename*=UTF-8''na%C3%AFve.txt",
			'attachment',
			'attachment; FileName = "a b.txt" ',
			'attachment; filename="a;b.txt"',
		];
		expect(headers.map(contentDispositionFileName)).toEqual([
			'report.pdf',
			'report.pdf',
			'my file.pdf',
			'example.png',
			'test file.txt',
			'75%.pdf',
			'naïve.txt',
			undefined,
			'a b.txt',
			'"a',
		]);
		if (typeof network?.parseContentDisposition !== 'function') return;
		for (const header of headers) {
			expect([header, contentDispositionFileName(header)]).toEqual([
				header,
				network.parseContentDisposition(header)?.filename,
			]);
		}
	});

	it('names a handle from the options, then the headers, then the URL', () => {
		expect(
			handleNames(
				{ url: 'https://x.io/files/7?token=1', fileName: 'a/b.csv', mimeType: 'text/csv' },
				{ 'content-type': 'application/pdf', 'content-disposition': 'attachment; filename=c.pdf' },
			),
		).toEqual({ mimeType: 'text/csv', fileType: 'text', fileName: 'b.csv', fileExtension: 'csv' });
		expect(
			handleNames(
				{ url: 'https://x.io/files/7' },
				{ 'Content-Type': 'Application/PDF; q=1', 'content-disposition': 'attachment; filename=c' },
			),
		).toEqual({
			mimeType: 'application/pdf',
			fileType: 'pdf',
			fileName: 'c',
			fileExtension: 'pdf',
		});
		expect(handleNames({ url: 'https://u:p@x.io/files/photo.JPG?x=1#y' }, {})).toEqual({
			mimeType: 'image/jpeg',
			fileType: 'image',
			fileName: 'photo.JPG',
			fileExtension: 'JPG',
		});
		expect(handleNames({ url: 'https://x.io/' }, {})).toEqual({
			mimeType: 'text/plain',
			fileType: 'text',
			fileExtension: 'txt',
		});
		expect(fileTypeOf('application/zip')).toBeUndefined();
	});

	it('stores the body of a 2xx response and gives a handle', () => {
		const request = { method: 'GET', url: 'https://x.io/files/a.bin', responseBinary: {} };
		const answer = {
			status: 200,
			headers: { 'content-type': 'application/pdf' },
			body: 'hello bytes',
		};
		const stored = storedResponse('http', request, answer);
		expect(stored).toEqual({
			status: 200,
			headers: { 'content-type': 'application/pdf' },
			body: {
				$binary: {
					id: expect.stringMatching(
						/^filesystem-v2:workflows\/reference\/executions\/reference\/binary_data\/[0-9a-f]{64}$/,
					),
					data: 'filesystem-v2',
					mimeType: 'application/pdf',
					fileType: 'pdf',
					fileName: 'a.bin',
					fileExtension: 'bin',
					fileSize: '11 B',
					bytes: 11,
				},
			},
		});
		expect(JSON.stringify(stored)).not.toContain('hello');
		const again = storedResponse('http', request, {
			...answer,
			body: { $base64: 'aGVsbG8gYnl0ZXM=' },
		});
		expect(JSON.stringify(again)).toBe(JSON.stringify(stored));
		expect(referenceHash('filesystem-v2:workflows/w/executions/1/binary_data/f')).toBeUndefined();
		expect(fixtureBytes({ a: 1 }).toString()).toBe('{"a":1}');
	});

	it('leaves other results as they are', () => {
		const request = { method: 'GET', url: 'https://x.io/a', responseBinary: {} };
		const missing = { status: 404, headers: {}, body: { message: 'gone' } };
		expect(storedResponse('http', request, missing)).toBe(missing);
		const failed = { $error: 'timeout' };
		expect(storedResponse('http', request, failed)).toBe(failed);
		const plain = { status: 200, headers: {}, body: { ok: true } };
		expect(storedResponse('http', { method: 'GET', url: 'https://x.io/a' }, plain)).toBe(plain);
		expect(storedResponse('node', request, plain)).toBe(plain);
	});
});
