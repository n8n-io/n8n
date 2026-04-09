import assert from 'node:assert/strict';
import { suite, test } from 'node:test';
import { constants, type FileHandle, open } from '../../dist/vfs/promises.js';

const content = 'The cake is a lie',
	appended = '\nAnother lie';

await suite('FileHandle', () => {
	let handle: FileHandle;
	const filePath = './test.txt';

	test('open', async () => {
		handle = await open(filePath, 'w+');
	});

	test('writeFile', async () => {
		await handle.writeFile(content);
		await handle.sync();
	});

	test('readFile', async () => {
		assert((await handle.readFile('utf8')) === content);
	});

	test('appendFile', async () => {
		await handle.appendFile(appended);
	});

	test('readFile after appendFile', async () => {
		assert((await handle.readFile({ encoding: 'utf8' })) === content + appended);
	});

	test('truncate', async () => {
		await handle.truncate(5);
		assert((await handle.readFile({ encoding: 'utf8' })) === content.slice(0, 5));
	});

	test('stat', async () => {
		const stats = await handle.stat();
		assert(stats.isFile());
	});

	test('chmod', async () => {
		await handle.chmod(constants.S_IRUSR | constants.S_IWUSR);
		const stats = await handle.stat();
		assert(stats.mode & constants.S_IRUSR);
		assert(stats.mode & constants.S_IWUSR);
	});

	test('chown', async () => {
		await handle.chown(1234, 5678);
		const stats = await handle.stat();
		assert.equal(stats.uid, 1234);
		assert.equal(stats.gid, 5678);
	});

	test('close', async () => {
		await handle.close();
	});
});
