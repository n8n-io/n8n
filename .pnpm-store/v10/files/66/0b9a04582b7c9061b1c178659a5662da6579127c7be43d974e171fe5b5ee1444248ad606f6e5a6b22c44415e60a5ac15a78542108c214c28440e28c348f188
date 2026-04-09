import assert from 'node:assert/strict';
import { suite, test } from 'node:test';
import { fs, type Stats } from '../common.js';

const testDir = '/test-watch-dir';
const testFile = testDir + '/test.txt';

await fs.promises.mkdir(testDir);
await fs.promises.writeFile(testFile, 'Initial content');

/**
 * @todo convert using watcher to void discards pending ES proposal
 */
await suite('Watch Features', () => {
	test('fs.watch should emit events on file change', async () => {
		const { promise, resolve } = Promise.withResolvers<[string, string]>();

		using watcher = fs.watch(testFile, (eventType, filename) => {
			resolve([eventType, filename]);
		});

		// Modify the file to trigger the event
		await fs.promises.writeFile(testFile, 'Updated content');

		const [eventType, filename] = await promise;
		assert.equal(eventType, 'change');
		assert.equal(filename, 'test.txt');
	});

	test('fs.watch should emit events on file rename (delete)', async () => {
		using watcher = fs.watch(testFile, (eventType, filename) => {
			assert.equal(eventType, 'rename');
			assert.equal(filename, 'test.txt');
		});

		// Delete the file to trigger the event
		await fs.promises.unlink(testFile);
	});

	test('fs.watchFile should detect changes to a file', async () => {
		const listener = (curr: Stats, prev: Stats) => {
			assert(curr.mtimeMs != prev.mtimeMs);
			fs.unwatchFile(testFile, listener);
		};

		fs.watchFile(testFile, listener);

		// Modify the file to trigger the event
		await fs.promises.writeFile(testFile, 'Changed content');
	});

	test('fs.unwatchFile should stop watching the file', async () => {
		let changeDetected = false;

		const listener = () => {
			changeDetected = true;
		};

		fs.watchFile(testFile, listener);
		fs.unwatchFile(testFile, listener);

		// Modify the file to see if the listener is called
		await fs.promises.writeFile(testFile, 'Another change');

		// Wait to see if any change is detected
		assert(!changeDetected);
	});

	test('fs.watch should work with directories', async () => {
		using watcher = fs.watch(testDir, (eventType, filename) => {
			assert.equal(eventType, 'change');
			assert.equal(filename, 'newFile.txt');
		});

		await fs.promises.writeFile(testDir + '/newFile.txt', 'Content');
	});

	test('fs.watch should detect file renames', async () => {
		const oldFileName = 'oldFile.txt';
		const newFileName = 'newFile.txt';
		const oldFile = testDir + '/' + oldFileName;
		const newFile = testDir + '/' + newFileName;

		await fs.promises.writeFile(oldFile, 'Some content');
		const oldFileResolver = Promise.withResolvers<void>();
		const newFileResolver = Promise.withResolvers<void>();

		const fileResolvers: Record<string, { resolver: PromiseWithResolvers<void>; eventType: string }> = {
			[oldFileName]: { resolver: oldFileResolver, eventType: 'rename' },
			[newFileName]: { resolver: newFileResolver, eventType: 'change' },
		};

		using watcher = fs.watch(testDir, (eventType, filename) => {
			const resolver = fileResolvers[filename];
			assert.notEqual(resolver, undefined); // should have a resolver so file is expected
			assert.equal(eventType, resolver.eventType);
			resolver.resolver.resolve();
		});

		// Rename the file to trigger the event
		await fs.promises.rename(oldFile, newFile);
		await Promise.all([newFileResolver.promise, oldFileResolver.promise]);
	});

	test('fs.watch should detect file deletions', async () => {
		const tempFile = `${testDir}/tempFile.txt`;

		await fs.promises.writeFile(tempFile, 'Temporary content');

		using watcher = fs.watch(tempFile, (eventType, filename) => {
			assert.equal(eventType, 'rename');
			assert.equal(filename, 'tempFile.txt');
		});

		await fs.promises.unlink(tempFile);
	});

	test('fs.promises.watch should detect file deletions', async () => {
		const tempFile = `${testDir}/tempFile.txt`;

		await fs.promises.writeFile(tempFile, 'Temporary content');

		const watcher = fs.promises.watch(tempFile);

		const promise = (async () => {
			for await (const event of watcher) {
				assert.equal(event.eventType, 'rename');
				assert.equal(event.filename, 'tempFile.txt');
				return;
			}
		})();

		await fs.promises.unlink(tempFile);
		await watcher.return!();
		await promise;
	});

	test('fs.promises.watch should detect file creations recursively', async () => {
		const subDir = `${testDir}/sub-dir`;
		const tempFile = `${subDir}/tempFile.txt`;
		await fs.promises.mkdir(subDir);
		const watcher = fs.promises.watch('/');

		await fs.promises.writeFile(tempFile, 'Temporary content');
		const promise = (async () => {
			for await (const event of watcher) {
				assert.equal(event.eventType, 'rename');
				assert.equal(event.filename, tempFile.slice(1));
				return;
			}
		})();

		await fs.promises.unlink(tempFile);
		await watcher.return!();
		await promise;
	});
});

await fs.promises.rm(testFile);
await fs.promises.rm(testDir, { recursive: true, force: true });
