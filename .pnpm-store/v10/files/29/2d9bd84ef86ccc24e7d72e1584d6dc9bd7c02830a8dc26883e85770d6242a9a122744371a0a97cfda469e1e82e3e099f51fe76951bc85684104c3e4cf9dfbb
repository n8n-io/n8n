import assert from 'node:assert/strict';
import { suite, test } from 'node:test';
import { fs } from '../common.js';
const fn = 'write.txt';
suite('write', () => {
	test('write file with specified content', async () => {
		const expected = 'ümlaut.';

		const handle = await fs.promises.open(fn, 'w', 0o644);
		await handle.write('', 0, 'utf8');
		const { bytesWritten } = await handle.write(expected, 0, 'utf8');
		assert.equal(bytesWritten, Buffer.from(expected).length);
		await handle.close();

		const data = await fs.promises.readFile(fn, 'utf8');
		assert.equal(data, expected);

		await fs.promises.unlink(fn);
	});

	test('write a buffer to a file', async () => {
		const expected = Buffer.from('hello');

		const handle = await fs.promises.open(fn, 'w', 0o644);

		const written = await handle.write(expected, 0, expected.length, null);

		assert.equal(expected.length, written.bytesWritten);

		await handle.close();

		assert.deepEqual(await fs.promises.readFile(fn), expected);

		await fs.promises.unlink(fn);
	});

	test('writeSync file with specified content', () => {
		const fd = fs.openSync(fn, 'w');

		let written = fs.writeSync(fd, '');
		assert.equal(written, 0);

		fs.writeSync(fd, 'foo');

		const data = Buffer.from('bár');
		written = fs.writeSync(fd, data, 0, data.length);
		assert.equal(written, 4);

		fs.closeSync(fd);

		assert.equal(fs.readFileSync(fn, 'utf8'), 'foobár');
	});
});
