import { UnexpectedError } from 'n8n-workflow';
import fs, { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';

import { FsByteStore } from '../fs-byte-store';

let store: FsByteStore;
let storagePath: string;
const reportError = vi.fn();

const body = Buffer.from('hello-bytes', 'utf-8');

beforeAll(async () => {
	storagePath = await mkdtemp(join(tmpdir(), 'n8n-fs-byte-store-test-'));
	store = new FsByteStore({ storagePath, reportError });
});

beforeEach(async () => {
	reportError.mockClear();
	for (const entry of await fs.readdir(storagePath)) {
		await rm(join(storagePath, entry), { recursive: true, force: true });
	}
});

afterEach(() => {
	vi.restoreAllMocks();
});

afterAll(async () => {
	await rm(storagePath, { recursive: true, force: true });
});

describe('init', () => {
	it('creates the storage dir if absent', async () => {
		const customPath = join(storagePath, 'custom-init');
		const custom = new FsByteStore({ storagePath: customPath, reportError });

		await custom.init();

		expect((await fs.stat(customPath)).isDirectory()).toBe(true);
	});
});

describe('write', () => {
	it('writes bytes at the key path, creating parent dirs, and returns the byte count', async () => {
		const bytes = await store.write('a/b/c/blob.json', body);

		const onDisk = await fs.readFile(join(storagePath, 'a/b/c/blob.json'));
		expect(onDisk.equals(body)).toBe(true);
		expect(bytes).toBe(body.length);
	});

	it('overwrites an existing key', async () => {
		await store.write('a/blob.json', body);
		const updated = Buffer.from('updated', 'utf-8');

		await store.write('a/blob.json', updated);

		expect((await store.read('a/blob.json'))!.equals(updated)).toBe(true);
	});

	it('rethrows on write failure and cleans up the temp file', async () => {
		vi.spyOn(fs, 'rename').mockRejectedValueOnce(new Error('EACCES: permission denied'));

		await expect(store.write('a/blob.json', body)).rejects.toThrow('EACCES');

		const files = await fs.readdir(join(storagePath, 'a'));
		expect(files.filter((f) => f.includes('.tmp.'))).toHaveLength(0);
	});
});

describe('read', () => {
	it('returns the stored bytes', async () => {
		await store.write('a/blob.json', body);

		expect((await store.read('a/blob.json'))!.equals(body)).toBe(true);
	});

	it('returns null for a missing key', async () => {
		expect(await store.read('a/missing.json')).toBeNull();
	});

	it('rethrows a systemic (non-ENOENT) read error', async () => {
		await store.write('a/blob.json', body);
		const eacces = Object.assign(new Error('EACCES'), { code: 'EACCES' });
		vi.spyOn(fs, 'readFile').mockRejectedValueOnce(eacces);

		await expect(store.read('a/blob.json')).rejects.toBe(eacces);
	});
});

describe('delete', () => {
	it('removes the keyed files', async () => {
		await store.write('a/one.json', body);
		await store.write('a/two.json', body);

		await store.delete(['a/one.json']);

		expect(await store.read('a/one.json')).toBeNull();
		expect(await store.read('a/two.json')).not.toBeNull();
	});

	it('prunes empty ancestor dirs up to (not including) the storage root', async () => {
		await store.write('pa/pb/pc/blob.json', body);

		await store.delete(['pa/pb/pc/blob.json']);

		await expect(fs.stat(join(storagePath, 'pa'))).rejects.toThrow();
		expect((await fs.stat(storagePath)).isDirectory()).toBe(true);
	});

	it('stops pruning at the first non-empty ancestor', async () => {
		await store.write('shared/x/f1.json', body);
		await store.write('shared/y/f2.json', body);

		await store.delete(['shared/x/f1.json']);

		await expect(fs.stat(join(storagePath, 'shared/x'))).rejects.toThrow();
		expect((await fs.stat(join(storagePath, 'shared'))).isDirectory()).toBe(true);
		expect(await store.read('shared/y/f2.json')).not.toBeNull();
	});

	it('does not throw on deleting a missing key', async () => {
		await expect(store.delete(['a/missing.json'])).resolves.toBeUndefined();
	});
});

describe('write (stream)', () => {
	it('writes a stream atomically and returns the byte count', async () => {
		const bytes = await store.write('a/streamed.bin', Readable.from(body));

		expect(bytes).toBe(body.length);
		expect((await store.read('a/streamed.bin'))!.equals(body)).toBe(true);
		const files = await fs.readdir(join(storagePath, 'a'));
		expect(files.filter((f) => f.includes('.tmp.'))).toHaveLength(0);
	});
});

describe('readStream', () => {
	it('returns a stream of the stored bytes', async () => {
		await store.write('a/blob.json', body);

		const stream = await store.readStream('a/blob.json');

		const chunks: Buffer[] = [];
		for await (const chunk of stream!) chunks.push(Buffer.from(chunk as Buffer));
		expect(Buffer.concat(chunks).equals(body)).toBe(true);
	});

	it('returns null for a missing key', async () => {
		expect(await store.readStream('a/missing.json')).toBeNull();
	});

	it.each([0, -1, 1.5])('rejects invalid chunkSize %s', async (chunkSize) => {
		await store.write('a/blob.json', body);

		await expect(store.readStream('a/blob.json', { chunkSize })).rejects.toThrow(UnexpectedError);
	});
});

describe('copy', () => {
	it('copies the bytes to the target key, creating parent dirs', async () => {
		await store.write('a/src.bin', body);

		await store.copy('a/src.bin', 'b/c/dst.bin');

		expect((await store.read('b/c/dst.bin'))!.equals(body)).toBe(true);
		expect((await store.read('a/src.bin'))!.equals(body)).toBe(true);
	});
});

describe('rename', () => {
	it('moves the bytes to the new key, creating parent dirs', async () => {
		await store.write('a/old.bin', body);

		await store.rename('a/old.bin', 'b/new.bin');

		expect(await store.read('a/old.bin')).toBeNull();
		expect((await store.read('b/new.bin'))!.equals(body)).toBe(true);
	});

	it('keeps the bytes intact when old and new keys match', async () => {
		await store.write('a/same.bin', body);

		await store.rename('a/same.bin', 'a/same.bin');

		expect((await store.read('a/same.bin'))!.equals(body)).toBe(true);
	});
});

describe('deletePrefix', () => {
	it('removes everything under the prefix and prunes empty ancestors', async () => {
		await store.write('wf/exec/binary_data/one.bin', body);
		await store.write('wf/exec/binary_data/two.bin', body);

		await store.deletePrefix('wf/exec/binary_data');

		expect(await store.read('wf/exec/binary_data/one.bin')).toBeNull();
		await expect(fs.stat(join(storagePath, 'wf'))).rejects.toThrow();
	});

	it('leaves siblings outside the prefix intact', async () => {
		await store.write('wf/exec/binary_data/one.bin', body);
		await store.write('wf/exec/execution_data/bundle.json', body);

		await store.deletePrefix('wf/exec/binary_data');

		expect(await store.read('wf/exec/execution_data/bundle.json')).not.toBeNull();
		expect((await fs.stat(join(storagePath, 'wf/exec'))).isDirectory()).toBe(true);
	});

	it('does not throw for a missing prefix', async () => {
		await expect(store.deletePrefix('missing/prefix')).resolves.toBeUndefined();
	});

	it('rejects a prefix that escapes the storage root', async () => {
		await expect(store.deletePrefix('../escape')).rejects.toThrow(UnexpectedError);
		await expect(store.deletePrefix('.')).rejects.toThrow(UnexpectedError);
	});
});

describe('path traversal guard', () => {
	it('rejects a key that escapes the storage root', async () => {
		await expect(store.write('../escape.json', body)).rejects.toThrow(UnexpectedError);
		await expect(store.read('../../escape.json')).rejects.toThrow(UnexpectedError);
	});

	it('rejects a key that resolves to the storage root itself', async () => {
		for (const key of ['', '.', 'a/..']) {
			await expect(store.write(key, body)).rejects.toThrow(UnexpectedError);
			await expect(store.delete([key])).rejects.toThrow(UnexpectedError);
		}
	});
});
