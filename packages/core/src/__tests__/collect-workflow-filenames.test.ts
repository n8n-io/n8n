import * as fs from 'node:fs';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { collectWorkflowFilenames } from '../../nodes-testing/collect-workflow-filenames';

vi.mock('node:fs', { spy: true });

describe('collectWorkflowFilenames', () => {
	let packageDir: string;
	let testDir: string;

	const writeFile = (relativePath: string, content = '{}') => {
		const fullPath = path.join(testDir, relativePath);
		mkdirSync(path.dirname(fullPath), { recursive: true });
		writeFileSync(fullPath, content);
	};

	beforeEach(() => {
		packageDir = mkdtempSync(path.join(tmpdir(), 'n8n-workflow-filenames-'));
		testDir = path.join(packageDir, 'nodes/Example/test');
		mkdirSync(testDir, { recursive: true });
	});

	afterEach(() => {
		vi.restoreAllMocks();
		rmSync(packageDir, { recursive: true, force: true });
	});

	it('collects nested JSON files using POSIX relative paths and skips dotfiles', () => {
		writeFile('root.workflow.json');
		writeFile('sub/nested.workflow.json');
		writeFile('sub/notes.txt', 'ignore');
		writeFile('.hidden/secret.workflow.json');

		const files = collectWorkflowFilenames(testDir, packageDir).sort();

		expect(files).toEqual([
			'nodes/Example/test/root.workflow.json',
			'nodes/Example/test/sub/nested.workflow.json',
		]);
	});

	it('discovers workflows through both a directory and a sibling symlink alias', () => {
		writeFile('real/case.workflow.json');
		symlinkSync(path.join(testDir, 'real'), path.join(testDir, 'alias'), 'dir');

		const files = collectWorkflowFilenames(testDir, packageDir).sort();

		expect(files).toEqual([
			'nodes/Example/test/alias/case.workflow.json',
			'nodes/Example/test/real/case.workflow.json',
		]);
	});

	it('stops on circular symlinks without looping', () => {
		writeFile('real/case.workflow.json');
		symlinkSync(path.join(testDir, 'real'), path.join(testDir, 'real/loop'), 'dir');

		const files = collectWorkflowFilenames(testDir, packageDir);

		expect(files).toEqual(['nodes/Example/test/real/case.workflow.json']);
	});

	it('returns an empty list when the test directory does not exist', () => {
		const missingDir = path.join(testDir, 'missing');

		expect(collectWorkflowFilenames(missingDir, packageDir)).toEqual([]);
	});

	it('rethrows non-ENOENT directory read errors instead of skipping unreadable fixtures', async () => {
		writeFile('readable/a.workflow.json');
		const blockedDir = path.join(testDir, 'blocked');
		mkdirSync(blockedDir);
		writeFile('blocked/b.workflow.json');

		const actualFs = await vi.importActual<typeof import('node:fs')>('node:fs');
		const eaccesError = Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' });
		vi.mocked(fs.readdirSync).mockImplementation(((
			dir: fs.PathLike,
			options?: Parameters<typeof fs.readdirSync>[1],
		) => {
			if (String(dir) === blockedDir) {
				throw eaccesError;
			}
			return actualFs.readdirSync(dir, options as never);
		}) as typeof fs.readdirSync);

		expect(() => collectWorkflowFilenames(testDir, packageDir)).toThrow(eaccesError);
	});

	it('rethrows non-ENOENT errors when resolving the root test directory', () => {
		const eioError = Object.assign(new Error('EIO: i/o error'), { code: 'EIO' });
		vi.mocked(fs.realpathSync).mockImplementationOnce(() => {
			throw eioError;
		});

		expect(() => collectWorkflowFilenames(testDir, packageDir)).toThrow(eioError);
	});

	it('skips broken symlinks and self-referential symlink loops', () => {
		writeFile('valid.workflow.json');
		symlinkSync(path.join(testDir, 'does-not-exist'), path.join(testDir, 'broken'));
		symlinkSync(path.join(testDir, 'loop-b'), path.join(testDir, 'loop-a'));
		symlinkSync(path.join(testDir, 'loop-a'), path.join(testDir, 'loop-b'));

		expect(collectWorkflowFilenames(testDir, packageDir)).toEqual([
			'nodes/Example/test/valid.workflow.json',
		]);
	});

	it('rethrows non-missing errors from statSync on symlink entries', async () => {
		writeFile('real/case.workflow.json');
		const linkPath = path.join(testDir, 'alias');
		symlinkSync(path.join(testDir, 'real'), linkPath, 'dir');

		const actualFs = await vi.importActual<typeof import('node:fs')>('node:fs');
		const eaccesError = Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' });
		vi.mocked(fs.statSync).mockImplementation(((
			filePath: fs.PathLike,
			options?: Parameters<typeof fs.statSync>[1],
		) => {
			if (String(filePath) === linkPath) {
				throw eaccesError;
			}
			return actualFs.statSync(filePath, options as never);
		}) as typeof fs.statSync);

		expect(() => collectWorkflowFilenames(testDir, packageDir)).toThrow(eaccesError);
	});

	it('rethrows non-missing errors from realpathSync on symlinked directories', async () => {
		writeFile('real/case.workflow.json');
		const linkPath = path.join(testDir, 'alias');
		symlinkSync(path.join(testDir, 'real'), linkPath, 'dir');

		const actualFs = await vi.importActual<typeof import('node:fs')>('node:fs');
		const eioError = Object.assign(new Error('EIO: i/o error'), { code: 'EIO' });
		vi.mocked(fs.realpathSync).mockImplementation(((
			filePath: fs.PathLike,
			options?: Parameters<typeof fs.realpathSync>[1],
		) => {
			if (String(filePath) === linkPath) {
				throw eioError;
			}
			return actualFs.realpathSync(filePath, options as never);
		}) as typeof fs.realpathSync);

		expect(() => collectWorkflowFilenames(testDir, packageDir)).toThrow(eioError);
	});
});
