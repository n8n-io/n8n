import assert from 'node:assert/strict';
import { suite, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fs } from '../common.js';
import { join } from 'node:path/posix';
import { data as dataPath } from '../setup.js';

const utf8example = readFileSync(join(dataPath, 'utf8.txt'), 'utf8');

suite('writeFile', () => {
	test('write and read file with specified content', async () => {
		const filename = 'test.txt';
		await fs.promises.writeFile(filename, utf8example);
		const data = await fs.promises.readFile(filename);
		assert.equal(data.length, Buffer.from(utf8example).length);
		await fs.promises.unlink(filename);
	});

	test('write and read file using buffer', async () => {
		const filename = 'test2.txt';
		const expected = Buffer.from(utf8example, 'utf8');

		await fs.promises.writeFile(filename, expected);
		const actual = await fs.promises.readFile(filename);
		assert.equal(actual.length, expected.length);

		await fs.promises.unlink(filename);
	});

	test('write base64 data to a file and read it back asynchronously', async () => {
		const data = readFileSync(join(dataPath, 'image.jpg'), 'base64');

		const buffer = Buffer.from(data, 'base64');
		const filePath = 'test.jpg';

		await fs.promises.writeFile(filePath, buffer);

		const read = await fs.promises.readFile(filePath, 'base64');
		assert.equal(read, data);
	});
});

suite('File Writing with Custom Mode', () => {
	test('write file synchronously with custom mode', () => {
		const file = 'testWriteFileSync.txt';
		const mode = 0o755;

		fs.writeFileSync(file, '123', { mode });

		const content = fs.readFileSync(file, 'utf8');
		assert.equal(content, '123');
		assert((fs.statSync(file).mode & 0o777) === mode);

		fs.unlinkSync(file);
	});

	test('append to a file synchronously with custom mode', () => {
		const file = 'testAppendFileSync.txt';
		const mode = 0o755;

		fs.appendFileSync(file, 'abc', { mode });

		const content = fs.readFileSync(file, { encoding: 'utf8' });
		assert.equal(content, 'abc');

		assert((fs.statSync(file).mode & 0o777) === mode);

		fs.unlinkSync(file);
	});
});
