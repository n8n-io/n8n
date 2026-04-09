import assert from 'node:assert/strict';
import { suite, test } from 'node:test';
import { join } from '../../dist/vfs/path.js';
import { fs } from '../common.js';
import type { ErrnoError } from '../../dist/index.js';

suite('Links', () => {
	const target = '/a1.js',
		symlink = 'symlink1.js',
		hardlink = 'link1.js';

	test('symlink', async () => {
		await fs.promises.symlink(target, symlink);
	});

	test('lstat', async () => {
		const stats = await fs.promises.lstat(symlink);
		assert(stats.isSymbolicLink());
	});

	test('readlink', async () => {
		const destination = await fs.promises.readlink(symlink);
		assert.equal(destination, target);
	});

	test('read target contents', async () => {
		assert.equal(await fs.promises.readFile(target, 'utf-8'), await fs.promises.readFile(symlink, 'utf-8'));
	});

	test('nested symlinks', async () => {
		// Create the real directory structure
		const realDir = '/real-dir';
		const realFile = '/real-dir/realfile.txt';
		const fileContent = 'hello world';
		await fs.promises.mkdir(realDir);
		await fs.promises.writeFile(realFile, fileContent);
		// Create first symlink (symlink-dir -> real-dir)
		const symlinkDir = '/symlink-dir';
		await fs.promises.symlink(realDir, symlinkDir);
		const symfile = 'symfile.txt';
		const symlinkFile = join(realDir, symfile);
		// Create second symlink (symlink-dir -> real-dir)
		await fs.promises.symlink(realFile, symlinkFile);
		// Now access file through nested symlinks
		const nestedPath = join(symlinkDir, symfile);
		// Verify realpath resolution
		const resolvedPath = await fs.promises.realpath(nestedPath);
		assert.equal(resolvedPath, realFile);
		// Verify content can be read through nested symlinks
		const content = await fs.promises.readFile(nestedPath, 'utf8');
		assert.notEqual(content, '/real-dir/realfile.txt');
		assert.equal(content, fileContent);
	});

	test('unlink', async () => {
		await fs.promises.unlink(symlink);
		assert(!(await fs.promises.exists(symlink)));
		assert(await fs.promises.exists(target));
	});

	test('link', async t => {
		const _ = await fs.promises.link(target, hardlink).catch((e: ErrnoError) => {
			if (e.code == 'ENOSYS') return e;
			throw e;
		});
		if (_) {
			return t.skip('Backend does not support hard links');
		}
		const targetContent = await fs.promises.readFile(target, 'utf8');
		const linkContent = await fs.promises.readFile(hardlink, 'utf8');
		assert.equal(targetContent, linkContent);
	});

	test('file inside symlinked directory', async () => {
		await fs.promises.symlink('.', 'link');
		const targetContent = await fs.promises.readFile(target, 'utf8');
		const link = join('link', target);
		assert((await fs.promises.realpath(link)) === target);
		const linkContent = await fs.promises.readFile(link, 'utf8');
		assert.equal(targetContent, linkContent);
	});
});
