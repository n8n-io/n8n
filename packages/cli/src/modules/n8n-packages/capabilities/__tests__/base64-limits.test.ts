import { BadRequestError } from '@n8n/errors';
import fc from 'fast-check';
import { randomBytes } from 'node:crypto';
import { Readable } from 'node:stream';

import { PackageExportBlockedError } from '../../entities/package-export.errors';
import {
	MCP_REQUEST_ENVELOPE_BYTES,
	collectWithinLimit,
	decodeBase64WithinLimit,
	decodedBase64Size,
	mcpPackageSizeLimit,
	packageSizeLimitMessage,
	type PackageSizeLimit,
} from '../base64-limits';

const MiB = 1024 * 1024;

const limitOf = (maxBytes: number): PackageSizeLimit => ({
	maxBytes,
	setting: 'N8N_IMPORT_MAX_UNCOMPRESSED_BYTES',
});

const encode = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64');

const INVALID_BASE64 =
	'packageBase64 is not valid base64. Pass the packageBase64 value of export_workflow_package unchanged.';

/** Checks the error class and the exact message of a synchronous failure. */
function expectFailure(run: () => unknown, errorClass: typeof BadRequestError, message: string) {
	expect(run).toThrow(errorClass);
	expect(run).toThrow(message);
}

async function* chunksOf(sizes: number[], onPull?: () => void) {
	for (const size of sizes) {
		onPull?.();
		yield Buffer.alloc(size, size % 251);
	}
}

describe('packageSizeLimitMessage', () => {
	it('names the limit and the setting that changes it', () => {
		expect(packageSizeLimitMessage(limitOf(300 * MiB))).toBe(
			'The workflow package is larger than the limit of 300MB. An admin can change the limit with N8N_IMPORT_MAX_UNCOMPRESSED_BYTES.',
		);
		expect(packageSizeLimitMessage({ maxBytes: 2048, setting: 'N8N_PAYLOAD_SIZE_MAX' })).toBe(
			'The workflow package is larger than the limit of 2KB. An admin can change the limit with N8N_PAYLOAD_SIZE_MAX.',
		);
	});
});

describe('mcpPackageSizeLimit', () => {
	it('keeps the import limit when one request can carry a package of that size', () => {
		expect(mcpPackageSizeLimit(4 * MiB, 16)).toEqual({
			maxBytes: 4 * MiB,
			setting: 'N8N_IMPORT_MAX_UNCOMPRESSED_BYTES',
		});
	});

	// The defaults: 300 MiB for the import, 16 MiB for a request body.
	it('takes the request body limit when it is smaller, as base64 needs 4 characters for 3 bytes', () => {
		expect(mcpPackageSizeLimit(300 * MiB, 16)).toEqual({
			maxBytes: ((16 * MiB - MCP_REQUEST_ENVELOPE_BYTES) / 4) * 3,
			setting: 'N8N_PAYLOAD_SIZE_MAX',
		});
	});

	it('keeps the import limit when both limits are the same', () => {
		const bodyLimit = mcpPackageSizeLimit(Number.MAX_SAFE_INTEGER, 1).maxBytes;

		expect(mcpPackageSizeLimit(bodyLimit, 1).setting).toBe('N8N_IMPORT_MAX_UNCOMPRESSED_BYTES');
		expect(mcpPackageSizeLimit(bodyLimit + 1, 1)).toEqual({
			maxBytes: bodyLimit,
			setting: 'N8N_PAYLOAD_SIZE_MAX',
		});
	});

	it('accepts a fraction of a MiB as the request body limit', () => {
		expect(mcpPackageSizeLimit(MiB, 0.5).maxBytes).toBe(
			Math.floor((0.5 * MiB - MCP_REQUEST_ENVELOPE_BYTES) / 4) * 3,
		);
	});

	it('allows no package when the request body limit leaves no space for one', () => {
		expect(mcpPackageSizeLimit(MiB, 0.01)).toEqual({
			maxBytes: 0,
			setting: 'N8N_PAYLOAD_SIZE_MAX',
		});
	});

	it('gives a limit whose base64 text fits in one request with the JSON-RPC envelope (property)', () => {
		fc.assert(
			fc.property(fc.nat(400 * MiB), fc.integer({ min: 1, max: 64 }), (maxBytes, payloadMiB) => {
				const limit = mcpPackageSizeLimit(maxBytes, payloadMiB);
				const base64Length = Math.ceil(limit.maxBytes / 3) * 4;

				expect(limit.maxBytes).toBeLessThanOrEqual(maxBytes);
				expect(base64Length + MCP_REQUEST_ENVELOPE_BYTES).toBeLessThanOrEqual(payloadMiB * MiB);
				// The largest such package: 3 bytes more would need 4 more characters than fit.
				if (limit.setting === 'N8N_PAYLOAD_SIZE_MAX') {
					expect(base64Length + 4 + MCP_REQUEST_ENVELOPE_BYTES).toBeGreaterThan(payloadMiB * MiB);
				}
			}),
		);
	});
});

describe('decodedBase64Size', () => {
	it.each([
		['', 0],
		['YQ==', 1],
		['YWI=', 2],
		['YWJj', 3],
		['YWJjZA==', 4],
	])('gives the decoded size of "%s" as %i', (encoded, size) => {
		expect(decodedBase64Size(encoded)).toBe(size);
	});

	it('gives the length of the decoded buffer for any data (property)', () => {
		fc.assert(
			fc.property(fc.uint8Array({ maxLength: 600 }), (bytes) => {
				expect(decodedBase64Size(encode(bytes))).toBe(bytes.length);
			}),
		);
	});
});

describe('decodeBase64WithinLimit', () => {
	it('decodes the base64 text of a package', () => {
		const bytes = randomBytes(100);

		expect(decodeBase64WithinLimit(bytes.toString('base64'), limitOf(100)).equals(bytes)).toBe(
			true,
		);
	});

	it('accepts a package of exactly the limit and rejects one byte more', () => {
		const limit = 30;

		expect(decodeBase64WithinLimit(encode(randomBytes(limit)), limitOf(limit))).toHaveLength(limit);
		expectFailure(
			() => decodeBase64WithinLimit(encode(randomBytes(limit + 1)), limitOf(limit)),
			BadRequestError,
			packageSizeLimitMessage(limitOf(limit)),
		);
	});

	it('rejects text over the limit before it decodes anything', () => {
		const from = vi.spyOn(Buffer, 'from');
		// Not base64 at all, so a decode before the size check would fail differently.
		const tooLong = '*'.repeat(4 * 1024);

		expectFailure(
			() => decodeBase64WithinLimit(tooLong, limitOf(1024)),
			BadRequestError,
			packageSizeLimitMessage(limitOf(1024)),
		);
		expect(from).not.toHaveBeenCalled();
		from.mockRestore();
	});

	it.each([
		['characters outside the base64 alphabet', 'YW*j'],
		['missing padding', 'YQ'],
		['a line break', 'YWJj\nYWJj'],
		['URL-safe characters', '-_-_'],
	])('rejects text with %s', (_case, encoded) => {
		expectFailure(
			() => decodeBase64WithinLimit(encoded, limitOf(1024)),
			BadRequestError,
			INVALID_BASE64,
		);
	});

	it('gives back any data under the limit unchanged (property)', () => {
		fc.assert(
			fc.property(fc.uint8Array({ maxLength: 512 }), fc.nat(512), (bytes, slack) => {
				const limit = bytes.length + slack;
				expect(decodeBase64WithinLimit(encode(bytes), limitOf(limit))).toEqual(Buffer.from(bytes));
			}),
		);
	});

	it('rejects any data over the limit (property)', () => {
		fc.assert(
			fc.property(fc.uint8Array({ minLength: 1, maxLength: 512 }), fc.nat(), (bytes, seed) => {
				const limit = seed % bytes.length;
				expect(() => decodeBase64WithinLimit(encode(bytes), limitOf(limit))).toThrow(
					packageSizeLimitMessage(limitOf(limit)),
				);
			}),
		);
	});

	// Buffer.from skips such characters, so without the check the package would change silently.
	it('rejects valid base64 with one foreign character in it (property)', () => {
		fc.assert(
			fc.property(
				fc.uint8Array({ minLength: 1, maxLength: 200 }),
				fc.nat(),
				fc.constantFrom('*', '.', ' ', '\n', '-', '_', '!'),
				(bytes, position, foreign) => {
					const encoded = encode(bytes);
					const at = position % (encoded.length + 1);
					const corrupted = encoded.slice(0, at) + foreign + encoded.slice(at);
					expect(() => decodeBase64WithinLimit(corrupted, limitOf(1024))).toThrow(BadRequestError);
				},
			),
		);
	});
});

describe('collectWithinLimit', () => {
	it('joins the chunks of a stream in order', async () => {
		const stream = Readable.from([Buffer.from('n8n '), Buffer.from('package'), Buffer.from('!')]);

		const buffer = await collectWithinLimit(stream, limitOf(100));

		expect(buffer.toString()).toBe('n8n package!');
	});

	it('gives an empty buffer for an empty stream', async () => {
		expect(await collectWithinLimit(Readable.from([]), limitOf(0))).toEqual(Buffer.alloc(0));
	});

	it('accepts exactly the limit', async () => {
		const buffer = await collectWithinLimit(chunksOf([4, 4, 2]), limitOf(10));

		expect(buffer).toHaveLength(10);
	});

	it('stops reading at the first chunk over the limit', async () => {
		let pulled = 0;

		const collecting = collectWithinLimit(
			chunksOf([4, 4, 4, 4, 4], () => pulled++),
			limitOf(10),
		);

		await expect(collecting).rejects.toThrow(PackageExportBlockedError);
		await expect(collecting).rejects.toThrow(packageSizeLimitMessage(limitOf(10)));
		expect(pulled).toBe(3);
	});

	it('destroys a stream that goes over the limit', async () => {
		const stream = Readable.from([Buffer.alloc(8), Buffer.alloc(8), Buffer.alloc(8)]);

		await expect(collectWithinLimit(stream, limitOf(10))).rejects.toThrow(
			PackageExportBlockedError,
		);
		expect(stream.destroyed).toBe(true);
	});

	it('gives the joined chunks under the limit and fails over it (property)', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.array(fc.uint8Array({ maxLength: 64 }), { maxLength: 12 }),
				fc.nat(400),
				async (chunks, limit) => {
					const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
					const collecting = collectWithinLimit(
						Readable.from(chunks.map((c) => Buffer.from(c))),
						limitOf(limit),
					);
					if (total <= limit) {
						expect(await collecting).toEqual(Buffer.concat(chunks));
					} else {
						await expect(collecting).rejects.toThrow(PackageExportBlockedError);
					}
				},
			),
		);
	});
});
