import { existsSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, sep } from 'node:path';

import { createTempTree, registerCleanup } from '../tempdb';

jest.unmock('node:fs');

describe('createTempTree', () => {
	it('returns a rootDir under os.tmpdir() with the n8n-headless- prefix', () => {
		const tree = createTempTree();

		try {
			expect(tree.rootDir.startsWith(tmpdir() + sep)).toBe(true);
			expect(tree.rootDir).toMatch(/n8n-headless-\d+-[0-9a-f]+$/);
		} finally {
			registerCleanup(tree.rootDir)();
		}
	});

	it('places dbPath and userFolderPath inside the rootDir', () => {
		const tree = createTempTree();

		try {
			expect(dirname(tree.dbPath)).toBe(tree.rootDir);
			expect(dirname(tree.userFolderPath)).toBe(tree.rootDir);
		} finally {
			registerCleanup(tree.rootDir)();
		}
	});

	it('creates the rootDir and userFolderPath on disk', () => {
		const tree = createTempTree();

		try {
			expect(existsSync(tree.rootDir)).toBe(true);
			expect(existsSync(tree.userFolderPath)).toBe(true);
		} finally {
			registerCleanup(tree.rootDir)();
		}
	});

	it('produces a different rootDir each time', () => {
		const a = createTempTree();
		const b = createTempTree();

		try {
			expect(a.rootDir).not.toBe(b.rootDir);
		} finally {
			registerCleanup(a.rootDir)();
			registerCleanup(b.rootDir)();
		}
	});
});

describe('registerCleanup', () => {
	it('returns a function that deletes the rootDir recursively', () => {
		const tree = createTempTree();
		writeFileSync(tree.dbPath, 'fake-db-contents');

		const cleanup = registerCleanup(tree.rootDir);
		expect(existsSync(tree.rootDir)).toBe(true);

		cleanup();

		expect(existsSync(tree.rootDir)).toBe(false);
	});

	it('is idempotent — calling cleanup twice does not throw', () => {
		const tree = createTempTree();
		const cleanup = registerCleanup(tree.rootDir);

		cleanup();
		expect(() => cleanup()).not.toThrow();
	});

	it('registers a process "exit" listener so the temp tree is cleaned up on normal exit', () => {
		const tree = createTempTree();
		const before = process.listenerCount('exit');

		const cleanup = registerCleanup(tree.rootDir);

		try {
			expect(process.listenerCount('exit')).toBe(before + 1);
		} finally {
			cleanup();
			// Restore listener count by emitting exit handlers manually is not possible;
			// the test process keeps the listener attached — that is acceptable because
			// the listener is a no-op after cleanup() has run (idempotent).
		}
	});

	it('does not throw if the rootDir was already deleted by an external process', () => {
		const tree = createTempTree();
		const cleanup = registerCleanup(tree.rootDir);

		// Simulate external deletion.
		rmSync(tree.rootDir, { recursive: true, force: true });

		expect(() => cleanup()).not.toThrow();
	});
});
