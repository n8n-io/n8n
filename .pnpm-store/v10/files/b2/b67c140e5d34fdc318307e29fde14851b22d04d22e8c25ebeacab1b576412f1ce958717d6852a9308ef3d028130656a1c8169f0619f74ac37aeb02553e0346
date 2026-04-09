import assert from 'node:assert/strict';
import { suite, test } from 'node:test';
import { wait } from 'utilium';
import { ErrnoError } from '../../dist/index.js';
import type { StatsLike } from '../../dist/stats.js';
import { fs } from '../common.js';

const path = 'x.txt';

/**
 * Gets unix timestamps from stats
 *
 * @internal
 */
export function unixTimestamps(stats: StatsLike<number>): Record<'atime' | 'mtime', number> {
	return {
		atime: Math.floor(stats.atimeMs),
		mtime: Math.floor(stats.mtimeMs),
	};
}

suite('times', () => {
	async function runTest(atime: Date | number, mtime: Date | number): Promise<void> {
		const times = {
			atime: typeof atime == 'number' ? Math.floor(atime) : atime.getTime(),
			mtime: typeof mtime == 'number' ? Math.floor(mtime) : mtime.getTime(),
		};

		await fs.promises.utimes(path, atime, mtime);

		assert.deepEqual(unixTimestamps(await fs.promises.stat(path)), times);

		await fs.promises.utimes('foobarbaz', atime, mtime).catch((error: ErrnoError) => {
			assert(error instanceof ErrnoError);
			assert.equal(error.code, 'ENOENT');
		});

		await using handle = await fs.promises.open(path, 'r');

		await handle.utimes(atime, mtime);
		assert.deepEqual(unixTimestamps(await handle.stat()), times);

		fs.utimesSync(path, atime, mtime);
		assert.deepEqual(unixTimestamps(fs.statSync(path)), times);

		try {
			fs.utimesSync('foobarbaz', atime, mtime);
		} catch (error: any) {
			assert(error instanceof ErrnoError);
			assert.equal(error.code, 'ENOENT');
		}

		try {
			fs.futimesSync(-1, atime, mtime);
		} catch (error: any) {
			assert(error instanceof ErrnoError);
			assert.equal(error.code, 'EBADF');
		}
	}

	test('utimes works', async () => {
		await test('new Date(...)', () => runTest(new Date('1982/09/10 13:37:00'), new Date('1982/09/10 13:37:00')));
		await test('new Date()', () => runTest(new Date(), new Date()));
		await test('number', () => runTest(123456.789, 123456.789));
		const stats = fs.statSync(path);
		await test('from stats', () => runTest(stats.atime, stats.mtime));
	});

	test('read changes atime', async () => {
		const before = fs.statSync(path).atimeMs;
		fs.readFileSync(path);
		await wait(25);
		const after = fs.statSync(path).atimeMs;
		assert(before < after);
	});

	test('write changes mtime', async () => {
		const before = fs.statSync(path).mtimeMs;
		fs.writeFileSync(path, 'cool');
		await wait(25);
		const after = fs.statSync(path).mtimeMs;
		assert(before < after);
	});
});
