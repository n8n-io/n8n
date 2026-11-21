import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';

import {
	canonicalizePath,
	MxcLocalFilesystem,
} from '../../../workspace/filesystem/mxc-local-filesystem';
import { MxcSandbox } from '../../../workspace/sandbox/mxc-sandbox';

const { mockGetPlatformSupport } = vi.hoisted(() => ({ mockGetPlatformSupport: vi.fn() }));

vi.mock('@microsoft/mxc-sdk/v1', () => ({
	getPlatformSupport: mockGetPlatformSupport,
	spawn: vi.fn(),
	MxcError: class extends Error {},
}));

describe('MxcLocalFilesystem', () => {
	let root: string;
	let inputs: string;
	let outside: string;
	let filesystem: MxcLocalFilesystem;

	function makeFilesystem() {
		const sandbox = new MxcSandbox({
			id: 'ws-1',
			workspaceRoot: join(root, 'workspaces'),
			readonlyPaths: [inputs],
			deniedPaths: [join(inputs, 'private')],
		});
		return new MxcLocalFilesystem(sandbox);
	}

	beforeEach(async () => {
		mockGetPlatformSupport.mockReturnValue({ isSupported: true, reason: '' });
		root = mkdtempSync(join(tmpdir(), 'mxc-fs-test-'));
		inputs = join(root, 'inputs');
		outside = join(root, 'outside');
		mkdirSync(join(inputs, 'private'), { recursive: true });
		mkdirSync(outside);
		writeFileSync(join(inputs, 'sales.csv'), 'region,amount\nEU,10\n');
		writeFileSync(join(inputs, 'private', 'salaries.csv'), 'confidential');
		writeFileSync(join(outside, 'secret.txt'), 'top secret');

		filesystem = makeFilesystem();
		await filesystem._init();
	});

	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});

	it('exposes the workspace folder as a local base path', () => {
		expect(filesystem.provider).toBe('local');
		expect(filesystem.basePath).toBe(join(root, 'workspaces', 'ws-1'));
	});

	it('fails closed when MXC is not supported on the host', async () => {
		mockGetPlatformSupport.mockReturnValue({ isSupported: false, reason: 'unsupported os' });
		const unsupported = makeFilesystem();

		await expect(unsupported._init()).rejects.toThrow(/not available on this host/);
	});

	it('writes and reads relative paths inside the workspace', async () => {
		await filesystem.writeFile('out/chart.txt', 'ok', { recursive: true });

		expect(await filesystem.readFile('out/chart.txt', { encoding: 'utf8' })).toBe('ok');
		expect(await filesystem.readdir('out')).toEqual([{ name: 'chart.txt', type: 'file', size: 2 }]);
	});

	it('hides the scratch folders of sandboxed commands from listings', async () => {
		mkdirSync(join(filesystem.basePath, '.home'));
		mkdirSync(join(filesystem.basePath, '.tmp'));
		await filesystem.writeFile('report.md', '# Report');

		expect(await filesystem.readdir('.')).toEqual([{ name: 'report.md', type: 'file', size: 8 }]);
	});

	it('reads input folders but refuses to write to them', async () => {
		const csv = join(inputs, 'sales.csv');

		expect(await filesystem.readFile(csv, { encoding: 'utf8' })).toContain('EU,10');
		await expect(filesystem.writeFile(csv, 'tampered')).rejects.toThrow(/Access denied/);
	});

	it('refuses denied folders even inside an input folder', async () => {
		await expect(filesystem.readFile(join(inputs, 'private', 'salaries.csv'))).rejects.toThrow(
			/protected folder/,
		);
	});

	it('refuses paths outside the allowed folders', async () => {
		await expect(filesystem.readFile(join(outside, 'secret.txt'))).rejects.toThrow(/Access denied/);
		await expect(filesystem.readFile('../../outside/secret.txt')).rejects.toThrow(/Access denied/);
	});

	it('refuses symlinks that escape the workspace', async () => {
		symlinkSync(outside, join(filesystem.basePath, 'escape'));

		await expect(filesystem.readFile('escape/secret.txt')).rejects.toThrow(/Access denied/);
	});

	describe('dangling symlinks', () => {
		const target = () => join(outside, 'created-outside.txt');

		beforeEach(() => {
			symlinkSync(target(), join(filesystem.basePath, 'link'));
		});

		it('refuses to write through a link to a file that does not exist yet', async () => {
			await expect(filesystem.writeFile('link', 'pwned')).rejects.toThrow(/Access denied/);
			expect(existsSync(target())).toBe(false);
		});

		it('refuses to append through it', async () => {
			await expect(filesystem.appendFile('link', 'pwned')).rejects.toThrow(/Access denied/);
			expect(existsSync(target())).toBe(false);
		});

		it('refuses it as a copy destination', async () => {
			await filesystem.writeFile('source.txt', 'pwned');

			await expect(filesystem.copyFile('source.txt', 'link')).rejects.toThrow(/Access denied/);
			expect(existsSync(target())).toBe(false);
		});
	});

	it('deletes a link itself, not the file it points to', async () => {
		symlinkSync(join(inputs, 'sales.csv'), join(filesystem.basePath, 'sales-link.csv'));

		await filesystem.deleteFile('sales-link.csv');

		expect(existsSync(join(filesystem.basePath, 'sales-link.csv'))).toBe(false);
		expect(existsSync(join(inputs, 'sales.csv'))).toBe(true);
	});

	it('refuses to remove a file with rmdir', async () => {
		await filesystem.writeFile('notes.txt', 'keep me');

		await expect(filesystem.rmdir('notes.txt')).rejects.toThrow(/Not a directory/);
		expect(existsSync(join(filesystem.basePath, 'notes.txt'))).toBe(true);
	});

	it('lists the files inside a scratch folder when asked for it directly', async () => {
		await filesystem.writeFile('.tmp/cache.json', '{}', { recursive: true });

		expect(await filesystem.readdir('.tmp')).toEqual([
			{ name: 'cache.json', type: 'file', size: 2 },
		]);
	});

	it('does not delete the workspace root', async () => {
		await expect(filesystem.deleteFile('.', { recursive: true })).rejects.toThrow(
			/workspace root cannot be deleted/,
		);
	});
});

describe('canonicalizePath', () => {
	let root: string;

	beforeEach(async () => {
		root = await canonicalizePath(mkdtempSync(join(tmpdir(), 'mxc-canonical-test-')));
		mkdirSync(join(root, 'inside', 'nested'), { recursive: true });
		mkdirSync(join(root, 'outside'));
	});

	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});

	it('resolves `..` after a link from the link target, like the OS does', async () => {
		symlinkSync(join(root, 'outside'), join(root, 'inside', 'link'));

		// path.join would collapse `..` as text, so build the raw path.
		const raw = [root, 'inside', 'link', '..', 'x'].join(sep);

		expect(await canonicalizePath(raw)).toBe(join(root, 'x'));
	});

	it('follows links inside a relative link target before it applies `..`', async () => {
		symlinkSync(join(root, 'outside'), join(root, 'inside', 'sub'));
		symlinkSync(['sub', '..', 'target'].join(sep), join(root, 'inside', 'link'));

		expect(await canonicalizePath(join(root, 'inside', 'link'))).toBe(join(root, 'target'));
	});

	it('follows a chain of relative links', async () => {
		symlinkSync('nested', join(root, 'inside', 'a'));
		symlinkSync('a', join(root, 'inside', 'b'));

		expect(await canonicalizePath(join(root, 'inside', 'b', 'file.txt'))).toBe(
			join(root, 'inside', 'nested', 'file.txt'),
		);
	});

	it('follows a dangling link in a parent folder', async () => {
		symlinkSync(join(root, 'outside', 'missing'), join(root, 'inside', 'gone'));

		expect(await canonicalizePath(join(root, 'inside', 'gone', 'file.txt'))).toBe(
			join(root, 'outside', 'missing', 'file.txt'),
		);
	});

	it('stops on a link loop', async () => {
		symlinkSync(join(root, 'inside', 'loop-b'), join(root, 'inside', 'loop-a'));
		symlinkSync(join(root, 'inside', 'loop-a'), join(root, 'inside', 'loop-b'));

		await expect(canonicalizePath(join(root, 'inside', 'loop-a'))).rejects.toThrow(
			/Too many symbolic links/,
		);
	});

	it('keeps folder names that start with two dots', async () => {
		expect(await canonicalizePath(join(root, 'inside', '..foo', 'x'))).toBe(
			join(root, 'inside', '..foo', 'x'),
		);
	});
});
