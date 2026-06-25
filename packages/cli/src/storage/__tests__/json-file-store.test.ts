import fs, { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { JsonFileStore } from '../json-file-store';

jest.unmock('node:fs/promises');

type TestRef = {
	id: string;
};

type TestPayload = {
	message: string;
};

type TestBundle = TestPayload & {
	version: 1;
};

class CorruptedTestBundleError extends Error {}

describe('JsonFileStore', () => {
	let storagePath: string;
	let reportError: jest.Mock<void, [unknown]>;
	let store: JsonFileStore<TestRef, TestPayload, TestBundle>;

	const ref = { id: 'one' };
	const payload = { message: 'hello' };

	beforeEach(async () => {
		storagePath = await mkdtemp(path.join(tmpdir(), 'n8n-json-file-store-test-'));
		reportError = jest.fn();
		store = new JsonFileStore({
			storagePath,
			resolveFileDir: ({ id }) => path.join('records', id, 'payload'),
			resolveDeleteDir: ({ id }) => path.join('records', id),
			filename: 'bundle.json',
			serialize: (data) => JSON.stringify({ ...data, version: 1 }),
			parse: (content) => JSON.parse(content) as TestBundle,
			key: ({ id }) => id,
			wrapParseError: (_ref, error) => new CorruptedTestBundleError('corrupt', { cause: error }),
			shouldDropReadManyError: (error) => error instanceof CorruptedTestBundleError,
			reportError,
		});
	});

	afterEach(async () => {
		jest.restoreAllMocks();
		await rm(storagePath, { recursive: true, force: true });
	});

	it('writes atomically and returns the stored byte size', async () => {
		const bytes = await store.write(ref, payload);
		const filePath = path.join(storagePath, 'records', 'one', 'payload', 'bundle.json');
		const content = await fs.readFile(filePath, 'utf-8');

		expect(bytes).toBe(Buffer.byteLength(content, 'utf-8'));
		expect(JSON.parse(content)).toEqual({ ...payload, version: 1 });
	});

	it('cleans up the temp file when writing fails', async () => {
		jest.spyOn(fs, 'rename').mockRejectedValueOnce(new Error('rename failed'));

		await expect(store.write(ref, payload)).rejects.toThrow('rename failed');

		const files = await fs.readdir(path.join(storagePath, 'records', 'one', 'payload'));
		expect(files.filter((file) => file.includes('.tmp.'))).toHaveLength(0);
	});

	it('reads stored bundles and returns null for missing files', async () => {
		await store.write(ref, payload);

		await expect(store.read(ref)).resolves.toEqual({ ...payload, version: 1 });
		await expect(store.read({ id: 'missing' })).resolves.toBeNull();
	});

	it('wraps parse errors on direct reads', async () => {
		const fileDir = path.join(storagePath, 'records', 'one', 'payload');
		await fs.mkdir(fileDir, { recursive: true });
		await fs.writeFile(path.join(fileDir, 'bundle.json'), 'not-json', 'utf-8');

		await expect(store.read(ref)).rejects.toThrow(CorruptedTestBundleError);
	});

	it('reads many bundles by key and omits missing files', async () => {
		await store.write(ref, payload);
		await store.write({ id: 'two' }, { message: 'second' });

		const bundles = await store.readMany([ref, { id: 'missing' }, { id: 'two' }]);

		expect(bundles).toEqual(
			new Map([
				['one', { message: 'hello', version: 1 }],
				['two', { message: 'second', version: 1 }],
			]),
		);
	});

	it('reports and drops configured readMany errors', async () => {
		await store.write(ref, payload);
		const fileDir = path.join(storagePath, 'records', 'bad', 'payload');
		await fs.mkdir(fileDir, { recursive: true });
		await fs.writeFile(path.join(fileDir, 'bundle.json'), 'not-json', 'utf-8');

		const bundles = await store.readMany([ref, { id: 'bad' }]);

		expect(bundles.has('one')).toBe(true);
		expect(bundles.has('bad')).toBe(false);
		expect(reportError).toHaveBeenCalledWith(expect.any(CorruptedTestBundleError));
	});

	it('rethrows systemic readMany errors', async () => {
		await store.write(ref, payload);
		const eacces = Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' });
		jest.spyOn(fs, 'readFile').mockRejectedValueOnce(eacces);

		await expect(store.readMany([ref])).rejects.toBe(eacces);
		expect(reportError).not.toHaveBeenCalled();
	});

	it('deletes the configured delete directory', async () => {
		await store.write(ref, payload);

		await store.delete(ref);

		await expect(fs.stat(path.join(storagePath, 'records', 'one'))).rejects.toThrow();
		await expect(store.read(ref)).resolves.toBeNull();
	});
});
