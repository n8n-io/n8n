import assert from 'node:assert/strict';
import test, { suite } from 'node:test';
import { fs } from '../common.js';
import type { ErrnoError } from '../../dist/index.js';

const existingFile = '/exit.js';

suite('Error messages', () => {
	const path = '/non-existent';

	fs.promises.stat(path).catch((error: ErrnoError) => {
		assert.equal(error.bufferSize(), 4 + JSON.stringify(error.toJSON()).length);
	});

	const missing = { path, code: 'ENOENT' };
	const existing = { path: existingFile };

	test('stat', () => assert.rejects(() => fs.promises.stat(path), missing));
	test('mkdir', () => assert.rejects(() => fs.promises.mkdir(existingFile, 0o666), existing));
	test('rmdir', () => assert.rejects(() => fs.promises.rmdir(path), missing));
	test('rmdir', () => assert.rejects(() => fs.promises.rmdir(existingFile), existing));
	test('rename', () => assert.rejects(() => fs.promises.rename(path, 'foo'), missing));
	test('open', () => assert.rejects(() => fs.promises.open(path, 'r'), missing));
	test('readdir', () => assert.rejects(() => fs.promises.readdir(path), missing));
	test('unlink', () => assert.rejects(() => fs.promises.unlink(path), missing));
	test('link', () => assert.rejects(() => fs.promises.link(path, 'foo'), missing));
	test('chmod', () => assert.rejects(() => fs.promises.chmod(path, 0o666), missing));
	test('lstat', () => assert.rejects(() => fs.promises.lstat(path), missing));
	test('readlink', () => assert.rejects(() => fs.promises.readlink(path), missing));
	test('statSync', () => assert.throws(() => fs.statSync(path), missing));
	test('mkdirSync', () => assert.throws(() => fs.mkdirSync(existingFile, 0o666), existing));
	test('rmdirSync', () => assert.throws(() => fs.rmdirSync(path), missing));
	test('rmdirSync', () => assert.throws(() => fs.rmdirSync(existingFile), existing));
	test('renameSync', () => assert.throws(() => fs.renameSync(path, 'foo'), missing));
	test('openSync', () => assert.throws(() => fs.openSync(path, 'r'), missing));
	test('readdirSync', () => assert.throws(() => fs.readdirSync(path), missing));
	test('unlinkSync', () => assert.throws(() => fs.unlinkSync(path), missing));
	test('linkSync', () => assert.throws(() => fs.linkSync(path, 'foo'), missing));
	test('chmodSync', () => assert.throws(() => fs.chmodSync(path, 0o666), missing));
	test('lstatSync', () => assert.throws(() => fs.lstatSync(path), missing));
	test('readlinkSync', () => assert.throws(() => fs.readlinkSync(path), missing));
});
