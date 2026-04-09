import assert from 'node:assert/strict';
import { suite, test } from 'node:test';
import { fs } from '../common.js';
import type { FileHandle } from '../../dist/vfs/promises.js';

const path: string = 'truncate-file.txt',
	size = 1024 * 16,
	data = new Uint8Array(size).fill('x'.charCodeAt(0));

suite('Truncate, sync', () => {
	test('initial write', () => {
		fs.writeFileSync(path, data);
		assert.equal(fs.statSync(path).size, size);
	});

	test('truncate to 1024', () => {
		fs.truncateSync(path, 1024);
		assert.equal(fs.statSync(path).size, 1024);
	});

	test('truncate to 0', () => {
		fs.truncateSync(path);
		assert.equal(fs.statSync(path).size, 0);
	});

	test('write', () => {
		fs.writeFileSync(path, data);
		assert.equal(fs.statSync(path).size, size);
	});

	let fd: number;
	test('open r+', () => {
		fd = fs.openSync(path, 'r+');
	});

	test('ftruncate to 1024', () => {
		fs.ftruncateSync(fd, 1024);
		assert.equal(fs.fstatSync(fd).size, 1024);
	});

	test('ftruncate to 0', () => {
		fs.ftruncateSync(fd);
		assert.equal(fs.fstatSync(fd).size, 0);
	});

	test('close fd', () => {
		fs.closeSync(fd);
	});
});
suite('Truncate, async', () => {
	const statSize = async (path: string) => (await fs.promises.stat(path)).size;

	test('initial write', async () => {
		await fs.promises.writeFile(path, data);

		assert.equal(await statSize(path), 1024 * 16);
	});

	test('truncate to 1024', async () => {
		await fs.promises.truncate(path, 1024);
		assert.equal(await statSize(path), 1024);
	});

	test('truncate to 0', async () => {
		await fs.promises.truncate(path);
		assert.equal(await statSize(path), 0);
	});

	test('write', async () => {
		await fs.promises.writeFile(path, data);
		assert.equal(await statSize(path), size);
	});

	let handle: FileHandle;
	test('open w', async () => {
		handle = await fs.promises.open(path, 'w');
	});

	test('handle.truncate to 1024', async () => {
		await handle.truncate(1024);
		await handle.sync();
		assert.equal(await statSize(path), 1024);
	});

	test('handle.truncate to 0', async () => {
		await handle.truncate();
		await handle.sync();
		assert.equal(await statSize(path), 0);
	});

	test('close handle', async () => {
		await handle.close();
	});
});
