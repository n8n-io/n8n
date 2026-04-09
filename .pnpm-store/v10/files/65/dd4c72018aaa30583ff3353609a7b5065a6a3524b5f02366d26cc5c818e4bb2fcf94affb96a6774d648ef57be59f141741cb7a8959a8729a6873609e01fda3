import assert from 'node:assert/strict';
import { suite, test } from 'node:test';
import { basename, dirname, extname, join, normalize, resolve } from '../../dist/vfs/path.js';
import * as fs from '../../dist/vfs/index.js';

suite('Path emulation', () => {
	test('resolve', () => {
		assert.equal(resolve('somepath'), '/somepath');
		assert.equal(resolve('/another', 'path'), '/another/path');
	});

	test('join', () => {
		assert.equal(join('/path', 'to', 'file.txt'), '/path/to/file.txt');
		assert.equal(join('/path/', 'to', '/file.txt'), '/path/to/file.txt');
	});

	test('normalize', () => {
		assert.equal(normalize('/path/to/../file.txt'), '/path/file.txt');
		assert.equal(normalize('/path/to/./file.txt'), '/path/to/file.txt');
	});

	test('basename', () => {
		assert.equal(basename('/path/to/file.txt'), 'file.txt');
		assert.equal(basename('/path/to/file.txt', '.txt'), 'file');
	});

	test('dirname', () => {
		assert.equal(dirname('/path/to/file.txt'), '/path/to');
	});

	test('extname', () => {
		assert.equal(extname('/path/to/file.txt'), '.txt');
		assert.equal(extname('/path/to/file'), '');
	});

	test('file:// URL (string)', () => {
		fs.writeFileSync('/example.txt', 'Yay');
		assert.equal(fs.readFileSync('file:///example.txt', 'utf-8'), 'Yay');
	});

	test('file:// URL (URL)', () => {
		fs.writeFileSync('/example.txt', 'Yay');
		const url = new URL('file:///example.txt');
		assert.equal(fs.readFileSync(url, 'utf-8'), 'Yay');
	});
});
