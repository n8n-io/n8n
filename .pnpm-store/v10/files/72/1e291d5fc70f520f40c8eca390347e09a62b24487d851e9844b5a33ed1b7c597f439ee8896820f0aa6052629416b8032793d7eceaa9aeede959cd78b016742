import assert from 'node:assert/strict';
import { suite, test } from 'node:test';
import { fs } from '../common.js';

suite('exists', () => {
	const f = 'x.txt';

	test('return true for an existing file', async () => {
		const exists = await fs.promises.exists(f);
		assert(exists);
	});

	test('return false for a non-existent file', async () => {
		const exists = await fs.promises.exists(f + '-NO');
		assert(!exists);
	});

	test('have sync methods that behave the same', () => {
		assert(fs.existsSync(f));
		assert(!fs.existsSync(f + '-NO'));
	});
});
