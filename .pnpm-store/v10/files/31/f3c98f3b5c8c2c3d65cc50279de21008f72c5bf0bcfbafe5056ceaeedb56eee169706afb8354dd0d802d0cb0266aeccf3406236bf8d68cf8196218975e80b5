import assert from 'node:assert/strict';
import { suite, test } from 'node:test';
import { ErrnoError } from '../../dist/index.js';
import { fs } from '../common.js';

suite('fs file opening', () => {
	const filename = 'a.js';

	test('throw ENOENT when opening non-existent file (sync)', () => {
		let caughtException = false;
		try {
			fs.openSync('/path/to/file/that/does/not/exist', 'r');
		} catch (error: any) {
			assert(error instanceof ErrnoError);
			assert.equal(error?.code, 'ENOENT');
			caughtException = true;
		}
		assert(caughtException);
	});

	test('throw ENOENT when opening non-existent file (async)', async () => {
		try {
			await fs.promises.open('/path/to/file/that/does/not/exist', 'r');
		} catch (error: any) {
			assert(error instanceof ErrnoError);
			assert.equal(error?.code, 'ENOENT');
		}
	});

	test('open file with mode "r"', async () => {
		const { fd } = await fs.promises.open(filename, 'r');
		assert(fd >= -Infinity);
	});

	test('open file with mode "rs"', async () => {
		const { fd } = await fs.promises.open(filename, 'rs');
		assert(fd >= -Infinity);
	});
});
