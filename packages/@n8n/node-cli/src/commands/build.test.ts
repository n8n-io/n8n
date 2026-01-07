import { cancel, outro } from '@clack/prompts';
import fs from 'node:fs/promises';

import { CommandTester } from '../test-utils/command-tester';
import { mockSpawn } from '../test-utils/mock-child-process';
import { setupTestPackage } from '../test-utils/package-setup';
import { tmpdirTest } from '../test-utils/temp-fs';

describe('build command', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	tmpdirTest(
		'successful build - compiles TypeScript and copies static files',
		async ({ tmpdir }) => {
			await setupTestPackage(tmpdir);
			await fs.mkdir(`${tmpdir}/src/icons`, { recursive: true });
			await fs.mkdir(`${tmpdir}/src/assets`, { recursive: true });
			await fs.mkdir(`${tmpdir}/src/__schema__`, { recursive: true });
			await fs.writeFile(`${tmpdir}/src/icons/icon.png`, 'fake-png-content');
			await fs.writeFile(`${tmpdir}/src/assets/logo.svg`, '<svg>fake-svg</svg>');
			await fs.writeFile(`${tmpdir}/src/__schema__/node.json`, '{"fake": "schema"}');

			mockSpawn('pnpm', ['exec', '--', 'tsc'], { exitCode: 0 });

			await CommandTester.run('build');

			await expect(tmpdir).toHaveFileEqual('dist/src/icons/icon.png', 'fake-png-content');
			await expect(tmpdir).toHaveFileEqual('dist/src/assets/logo.svg', '<svg>fake-svg</svg>');
			await expect(tmpdir).toHaveFileEqual('dist/src/__schema__/node.json', '{"fake": "schema"}');

			expect(tmpdir).toHaveFile('dist/src/icons');
			expect(tmpdir).toHaveFile('dist/src/assets');
			expect(tmpdir).toHaveFile('dist/src/__schema__');

			expect(outro).toHaveBeenCalledWith('✓ Build successful');
		},
	);

	tmpdirTest('TypeScript compilation failure - exits with error', async ({ tmpdir }) => {
		await setupTestPackage(tmpdir);
		mockSpawn('pnpm', ['exec', '--', 'tsc'], {
			exitCode: 1,
			stderr: "error TS2304: Cannot find name 'unknown_var'.",
		});

		await expect(CommandTester.run('build')).rejects.toThrow('EEXIT: 1');

		expect(cancel).toHaveBeenCalledWith('TypeScript build failed');
	});

	tmpdirTest('child process error - handles spawn errors', async ({ tmpdir }) => {
		await setupTestPackage(tmpdir);

		mockSpawn('pnpm', ['exec', '--', 'tsc'], {
			error: 'ENOENT: no such file or directory, spawn tsc',
		});

		await expect(CommandTester.run('build')).rejects.toThrow('EEXIT: 1');

		expect(cancel).toHaveBeenCalledWith('TypeScript build failed');
	});

	tmpdirTest('invalid package - not an n8n node package', async ({ tmpdir }) => {
		await fs.writeFile(
			`${tmpdir}/package.json`,
			JSON.stringify({
				name: 'regular-package',
				version: '1.0.0',
				// No n8n field - this makes it an invalid n8n package
			}),
		);

		await expect(CommandTester.run('build')).rejects.toThrow('EEXIT: 1');

		expect(cancel).toHaveBeenCalledWith('n8n-node build can only be run in an n8n node package');
	});

	tmpdirTest('no static files - still completes successfully', async ({ tmpdir }) => {
		await setupTestPackage(tmpdir);

		mockSpawn('pnpm', ['exec', '--', 'tsc'], { exitCode: 0 });

		await CommandTester.run('build');

		expect(outro).toHaveBeenCalledWith('✓ Build successful');
	});

	tmpdirTest('static files in nested directories - creates correct paths', async ({ tmpdir }) => {
		await setupTestPackage(tmpdir);
		await fs.mkdir(`${tmpdir}/src/nodes/icons`, { recursive: true });
		await fs.mkdir(`${tmpdir}/src/nodes/subdir/__schema__`, { recursive: true });
		await fs.mkdir(`${tmpdir}/src/assets/images`, { recursive: true });
		await fs.writeFile(`${tmpdir}/src/nodes/icons/node1.png`, 'fake-node1-png');
		await fs.writeFile(`${tmpdir}/src/nodes/subdir/__schema__/schema.json`, '{"node": "schema"}');
		await fs.writeFile(`${tmpdir}/src/assets/images/logo.svg`, '<svg>logo</svg>');

		mockSpawn('pnpm', ['exec', '--', 'tsc'], { exitCode: 0 });

		await CommandTester.run('build');

		await expect(tmpdir).toHaveFileEqual('dist/src/nodes/icons/node1.png', 'fake-node1-png');
		await expect(tmpdir).toHaveFileEqual(
			'dist/src/nodes/subdir/__schema__/schema.json',
			'{"node": "schema"}',
		);
		await expect(tmpdir).toHaveFileEqual('dist/src/assets/images/logo.svg', '<svg>logo</svg>');

		expect(tmpdir).toHaveFile('dist/src/nodes/icons');
		expect(tmpdir).toHaveFile('dist/src/nodes/subdir/__schema__');
		expect(tmpdir).toHaveFile('dist/src/assets/images');

		expect(outro).toHaveBeenCalledWith('✓ Build successful');
	});

	tmpdirTest('rimraf clears existing dist directory', async ({ tmpdir }) => {
		await setupTestPackage(tmpdir);
		await fs.mkdir(`${tmpdir}/dist/old-dir`, { recursive: true });
		await fs.writeFile(`${tmpdir}/dist/old-file.js`, 'old content');

		expect(tmpdir).toHaveFile('dist/old-file.js');
		expect(tmpdir).toHaveFile('dist/old-dir');

		mockSpawn('pnpm', ['exec', '--', 'tsc'], { exitCode: 0 });

		await CommandTester.run('build');

		expect(tmpdir).toNotHaveFile('dist/old-file.js');
		expect(tmpdir).toNotHaveFile('dist/old-dir');

		expect(outro).toHaveBeenCalledWith('✓ Build successful');
	});
});
