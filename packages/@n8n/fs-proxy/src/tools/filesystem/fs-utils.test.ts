import type { Stats } from 'node:fs';
import * as fs from 'node:fs/promises';

import { resolveSafePath } from './fs-utils';

jest.mock('node:fs/promises');

const BASE = '/base';
const enoent = (): Error => Object.assign(new Error('ENOENT'), { code: 'ENOENT' });

function mockRealpath(entries: Array<[string, string]>): void {
	const map = new Map(entries);
	(fs.realpath as jest.Mock).mockImplementation(async (p: string) => {
		if (map.has(p)) return await Promise.resolve(map.get(p)!);
		throw enoent();
	});
}

function mockLstat(entries: Array<[string, Partial<Stats>]>): void {
	const map = new Map(entries);
	jest.mocked(fs.lstat).mockImplementation(async (p) => {
		const entry = map.get(p as string);
		if (entry) return await Promise.resolve(entry as Stats);
		throw enoent();
	});
}

function mockReadlink(entries: Array<[string, string]>): void {
	const map = new Map(entries);
	(fs.readlink as jest.Mock).mockImplementation(async (p: string) => {
		if (map.has(p)) return await Promise.resolve(map.get(p)!);
		throw enoent();
	});
}

describe('resolveSafePath', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		// Default: only base exists; everything else is ENOENT
		mockRealpath([[BASE, BASE]]);
		jest.mocked(fs.lstat).mockRejectedValue(enoent());
	});

	it('resolves a simple path within the base directory', async () => {
		const result = await resolveSafePath(BASE, 'src/index.ts');
		expect(result).toBe('/base/src/index.ts');
	});

	it('resolves "." to the base directory', async () => {
		const result = await resolveSafePath(BASE, '.');
		expect(result).toBe(BASE);
	});

	it('throws when path traversal escapes the base directory', async () => {
		await expect(resolveSafePath(BASE, '../../../etc/passwd')).rejects.toThrow('escapes');
	});

	it('throws when path traversal reaches exactly the parent of base', async () => {
		await expect(resolveSafePath(BASE, '..')).rejects.toThrow('escapes');
	});

	it('resolves a path through a symlink that stays within the base', async () => {
		// /base/link → /base/inner (resolved target inside base)
		const baseLink = `${BASE}/link`;
		const baseInner = `${BASE}/inner`;
		mockRealpath([
			[BASE, BASE],
			[baseLink, baseInner],
		]);

		const result = await resolveSafePath(BASE, 'link/file.ts');
		// Returns the logical path without following symlinks
		expect(result).toBe('/base/link/file.ts');
	});

	it('throws when a symlink redirects outside the base directory', async () => {
		// /base/link → /outside (resolved target outside base)
		const baseLink = `${BASE}/link`;
		mockRealpath([
			[BASE, BASE],
			[baseLink, '/outside'],
		]);

		await expect(resolveSafePath(BASE, 'link/file.ts')).rejects.toThrow('escapes');
	});

	it('throws when a dangling symlink points outside the base directory', async () => {
		// /base/link is a dangling symlink → /outside/newfile
		const baseLink = `${BASE}/link`;
		mockLstat([[baseLink, { isSymbolicLink: () => true } as unknown as Stats]]);
		mockReadlink([[baseLink, '/outside/newfile']]);

		await expect(resolveSafePath(BASE, 'link/sub')).rejects.toThrow('escapes');
	});

	it('resolves a dangling symlink that points within the base directory', async () => {
		// /base/link is a dangling symlink → /base/newfile (target does not exist yet)
		const baseLink = `${BASE}/link`;
		const baseNewfile = `${BASE}/newfile`;
		mockLstat([[baseLink, { isSymbolicLink: () => true } as unknown as Stats]]);
		mockReadlink([[baseLink, baseNewfile]]);

		const result = await resolveSafePath(BASE, 'link/sub');
		// Returns the logical path without following symlinks
		expect(result).toBe('/base/link/sub');
	});

	it('resolves a symlink chain that loops back inside the base', async () => {
		// Simulates the user's scenario:
		//   base = /base
		//   /base/test → /outside   (first hop exits base)
		//   /outside/hello → /base  (second hop re-enters base)
		// resolveSafePath('/base', 'test/hello/bam/bum') must succeed → /base/bam/bum
		const baseTest = `${BASE}/test`;
		const outsideHello = '/outside/hello';
		mockRealpath([
			[BASE, BASE],
			[baseTest, '/outside'],
			[outsideHello, BASE],
		]);

		const result = await resolveSafePath(BASE, 'test/hello/bam/bum');
		// Returns the logical path without following symlinks
		expect(result).toBe('/base/test/hello/bam/bum');
	});

	it('throws when a symlink chain exits the base without returning', async () => {
		// /base/test → /outside; no symlink back; /outside/bam stays outside
		const baseTest = `${BASE}/test`;
		mockRealpath([
			[BASE, BASE],
			[baseTest, '/outside'],
		]);

		await expect(resolveSafePath(BASE, 'test/bam/bum')).rejects.toThrow('escapes');
	});
});
