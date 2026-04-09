import assert from 'node:assert/strict';
import { suite, test } from 'node:test';
import { fs } from '../common.js';
import { Buffer } from 'buffer';

const filepath = 'x.txt';
const expected = 'xyz\n';

suite('read', () => {
	test('read file asynchronously', async () => {
		const handle = await fs.promises.open(filepath, 'r');
		const { bytesRead, buffer } = await handle.read(Buffer.alloc(expected.length), 0, expected.length, 0);
		assert.equal(bytesRead, expected.length);
		assert.equal(buffer.toString(), expected);
	});

	test('read file synchronously', () => {
		const fd = fs.openSync(filepath, 'r');
		const buffer = Buffer.alloc(expected.length);
		const bytesRead = fs.readSync(fd, buffer, 0, expected.length, 0);

		assert.equal(bytesRead, expected.length);
		assert.equal(buffer.toString(), expected);
	});
});

suite('read binary', () => {
	test('Read a file and check its binary bytes (asynchronous)', async () => {
		const buff = await fs.promises.readFile('elipses.txt');
		assert.equal((buff[1] << 8) | buff[0], 32994);
	});

	test('Read a file and check its binary bytes (synchronous)', () => {
		const buff = fs.readFileSync('elipses.txt');
		assert.equal((buff[1] << 8) | buff[0], 32994);
	});
});

suite('read buffer', () => {
	const bufferAsync = Buffer.alloc(expected.length);
	const bufferSync = Buffer.alloc(expected.length);

	test('read file asynchronously', async () => {
		const handle = await fs.promises.open(filepath, 'r');
		const { bytesRead } = await handle.read(bufferAsync, 0, expected.length, 0);

		assert.equal(bytesRead, expected.length);
		assert.equal(bufferAsync.toString(), expected);
	});

	test('read file synchronously', () => {
		const fd = fs.openSync(filepath, 'r');
		const bytesRead = fs.readSync(fd, bufferSync, 0, expected.length, 0);

		assert.equal(bufferSync.toString(), expected);
		assert.equal(bytesRead, expected.length);
	});

	test('read file synchronously to non-zero offset', () => {
		const fd = fs.openSync(filepath, 'r');
		const buffer = Buffer.alloc(expected.length + 10);
		const bytesRead = fs.readSync(fd, buffer, 10, expected.length, 0);

		assert.equal(buffer.subarray(10, buffer.length).toString(), expected);
		assert.equal(bytesRead, expected.length);
	});
});
