import assert from 'node:assert/strict';
import { suite, test } from 'node:test';
import { credentials } from '../../dist/index.js';
import { Stats } from '../../dist/stats.js';
import { fs } from '../common.js';

suite('Stats', () => {
	const existing_file = 'x.txt';

	test('stat empty path', () => {
		assert.rejects(fs.promises.stat(''));
	});

	test('stat directory', async () => {
		const stats = await fs.promises.stat('/');
		assert(stats instanceof Stats);
	});

	test('lstat directory', async () => {
		const stats = await fs.promises.lstat('/');
		assert(stats instanceof Stats);
	});

	test('FileHandle.stat', async () => {
		const handle = await fs.promises.open(existing_file, 'r');
		const stats = await handle.stat();
		assert(stats instanceof Stats);
		await handle.close();
	});

	test('fstatSync file', () => {
		const fd = fs.openSync(existing_file, 'r');
		const stats = fs.fstatSync(fd);
		assert(stats instanceof Stats);
		fs.close(fd);
	});

	test('hasAccess for non-root access', () => {
		const newFile = 'new.txt';

		fs.writeFileSync(newFile, 'hello', { mode: 0o640 });

		const prevCredentials = { ...credentials };
		const uid = 33;
		const nonRootCredentials = {
			uid,
			gid: uid,
			euid: uid,
			egid: uid,
			suid: uid,
			sgid: uid,
		};

		fs.chownSync(newFile, 0, nonRootCredentials.gid); // creating with root-user so that non-root user can access

		Object.assign(credentials, nonRootCredentials);
		const stat = fs.statSync(newFile);

		assert.equal(stat.gid, nonRootCredentials.gid);
		assert.equal(stat.uid, 0);
		assert.equal(stat.hasAccess(fs.constants.R_OK), true);
		assert.equal(stat.hasAccess(fs.constants.W_OK), false);
		assert.equal(stat.hasAccess(fs.constants.X_OK), false);
		// changing group

		Object.assign(credentials, { ...nonRootCredentials, gid: 44 });

		assert.equal(stat.hasAccess(fs.constants.R_OK), false);
		assert.equal(stat.hasAccess(fs.constants.W_OK), false);
		assert.equal(stat.hasAccess(fs.constants.X_OK), false);

		Object.assign(credentials, prevCredentials);
	});

	test('stat file', async () => {
		const stats = await fs.promises.stat(existing_file);
		assert(!stats.isDirectory());
		assert(stats.isFile());
		assert(!stats.isSocket());
		assert(!stats.isBlockDevice());
		assert(!stats.isCharacterDevice());
		assert(!stats.isFIFO());
		assert(!stats.isSymbolicLink());
		assert(stats instanceof Stats);
	});
});
