import { execFileSync } from 'node:child_process';
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const COPY_STATIC_FILES_BIN = path.resolve(__dirname, '../../bin/copy-static-files');

describe('copy-static-files', () => {
	let packageDir: string;

	const writeFile = (relativePath: string, content: string) => {
		const fullPath = path.join(packageDir, relativePath);
		mkdirSync(path.dirname(fullPath), { recursive: true });
		writeFileSync(fullPath, content);
	};

	const runCopyStaticFiles = () => {
		execFileSync(process.execPath, [COPY_STATIC_FILES_BIN], {
			cwd: packageDir,
			stdio: 'pipe',
		});
	};

	beforeEach(() => {
		packageDir = mkdtempSync(path.join(tmpdir(), 'n8n-copy-static-files-'));
	});

	afterEach(() => {
		rmSync(packageDir, { recursive: true, force: true });
	});

	it('copies icons and schema JSON files while skipping non-schema JSON and dotfiles', () => {
		writeFile('nodes/Foo/foo.svg', '<svg/>');
		writeFile('nodes/Foo/foo.png', 'png');
		writeFile('nodes/Foo/__schema__/v1.0.0/output.json', '{"ok":true}');
		writeFile('nodes/Foo/other.json', '{"skip":true}');
		writeFile('nodes/.hidden/hidden.svg', '<svg/>');
		writeFile('credentials/FooApi.svg', '<svg/>');
		writeFile('credentials/__schema__/v1.0.0/output.json', '{"skip":true}');

		runCopyStaticFiles();

		expect(existsSync(path.join(packageDir, 'dist/nodes/Foo/foo.svg'))).toBe(true);
		expect(existsSync(path.join(packageDir, 'dist/nodes/Foo/foo.png'))).toBe(true);
		expect(
			readFileSync(path.join(packageDir, 'dist/nodes/Foo/__schema__/v1.0.0/output.json'), 'utf8'),
		).toBe('{"ok":true}');
		expect(existsSync(path.join(packageDir, 'dist/nodes/Foo/other.json'))).toBe(false);
		expect(existsSync(path.join(packageDir, 'dist/nodes/.hidden/hidden.svg'))).toBe(false);
		expect(existsSync(path.join(packageDir, 'dist/credentials/FooApi.svg'))).toBe(true);
		expect(
			existsSync(path.join(packageDir, 'dist/credentials/__schema__/v1.0.0/output.json')),
		).toBe(false);
	});

	it('copies files reached through sibling symlink aliases, including __schema__ aliases', () => {
		// Directory name sorts before Foo so the walk visits Ashared before Foo/__schema__.
		writeFile('nodes/Ashared/v1.0.0/output.json', '{"schema":1}');
		writeFile('nodes/Ashared/shared.svg', '<svg/>');
		mkdirSync(path.join(packageDir, 'nodes/Foo'), { recursive: true });
		symlinkSync('../Ashared', path.join(packageDir, 'nodes/Foo/__schema__'), 'dir');

		runCopyStaticFiles();

		expect(existsSync(path.join(packageDir, 'dist/nodes/Ashared/shared.svg'))).toBe(true);
		expect(existsSync(path.join(packageDir, 'dist/nodes/Ashared/v1.0.0/output.json'))).toBe(false);
		expect(
			readFileSync(path.join(packageDir, 'dist/nodes/Foo/__schema__/v1.0.0/output.json'), 'utf8'),
		).toBe('{"schema":1}');
		expect(existsSync(path.join(packageDir, 'dist/nodes/Foo/__schema__/shared.svg'))).toBe(true);
	});

	it('copies assets from separate roots even when credentials aliases a directory in nodes', () => {
		writeFile('nodes/shared/icon.svg', '<svg/>');
		symlinkSync(path.join(packageDir, 'nodes/shared'), path.join(packageDir, 'credentials'), 'dir');

		runCopyStaticFiles();

		expect(existsSync(path.join(packageDir, 'dist/nodes/shared/icon.svg'))).toBe(true);
		expect(existsSync(path.join(packageDir, 'dist/credentials/icon.svg'))).toBe(true);
	});

	it('stops on circular symlinks without looping', () => {
		writeFile('nodes/Foo/icon.svg', '<svg/>');
		symlinkSync(path.join(packageDir, 'nodes/Foo'), path.join(packageDir, 'nodes/Foo/loop'), 'dir');

		runCopyStaticFiles();

		expect(existsSync(path.join(packageDir, 'dist/nodes/Foo/icon.svg'))).toBe(true);
		expect(existsSync(path.join(packageDir, 'dist/nodes/Foo/loop/icon.svg'))).toBe(false);
	});
});
