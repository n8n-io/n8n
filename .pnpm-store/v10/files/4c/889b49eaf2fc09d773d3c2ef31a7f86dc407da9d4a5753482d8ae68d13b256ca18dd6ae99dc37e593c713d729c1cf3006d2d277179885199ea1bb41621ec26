import { wait } from 'utilium';
import { Mutexed } from '../../dist/mixins/mutexed.js';
import { StoreFS } from '../../dist/backends/store/fs.js';
import { InMemoryStore } from '../../dist/backends/memory.js';
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

suite('LockFS mutex', () => {
	const fs = new (Mutexed(StoreFS))(new InMemoryStore(0x10000, 'test'));
	fs._fs.checkRootSync();

	test('lock/unlock', () => {
		const lock = fs.lockSync('/test', 'lock');
		assert(fs.isLocked);
		lock.unlock();
		assert(!fs.isLocked);
	});

	test('queueing multiple locks', async () => {
		let lock1Resolved = false;
		let lock2Resolved = false;

		const lock1 = fs.lock('/queued', 'test').then(lock => {
			lock1Resolved = true;
			lock.unlock();
		});
		const lock2 = fs.lock('/queued', 'test').then(lock => {
			lock2Resolved = true;
			lock.unlock();
		});

		// Both locks are queued, so neither should be resolved initially
		assert(!lock1Resolved);
		assert(!lock2Resolved);

		// Wait for the first lock to be resolved
		await lock1;

		assert(lock1Resolved);
		assert(!lock2Resolved);

		// Wait for the second lock to be resolved
		await lock2;

		assert(lock1Resolved);
		assert(lock2Resolved);
	});

	test('test race conditions', async () => {
		let x = 1;

		async function foo() {
			const lock = await fs.lock('raceConditions', 'test');
			await wait(25);
			x++;
			lock.unlock();
		}

		await Promise.all([foo(), foo(), foo()]);
		assert.equal(x, 4);
	});
});
