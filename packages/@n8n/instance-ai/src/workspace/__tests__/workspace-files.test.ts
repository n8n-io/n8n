import type { WorkspaceFileTarget } from '../workspace-files';
import { readWorkspaceFile, writeWorkspaceFile, writeWorkspaceFileMap } from '../workspace-files';

function createWorkspaceTarget(files: Map<string, string>): {
	target: WorkspaceFileTarget;
	writes: Map<string, string>;
} {
	const writes = new Map<string, string>();
	const target: WorkspaceFileTarget = {
		filesystem: {
			readFile: vi.fn(async (path: string) => {
				const content = files.get(path);
				if (content === undefined) throw new Error('missing');
				return await Promise.resolve(content);
			}),
			writeFile: vi.fn(async (path: string, content: string | Buffer) => {
				writes.set(path, Buffer.isBuffer(content) ? content.toString('utf-8') : content);
				await Promise.resolve();
			}),
		},
		sandbox: {
			executeCommand: vi.fn(async (command: string) => {
				const readMatch = /^cat '([^']+)' 2>\/dev\/null$/.exec(command);
				if (readMatch) {
					const content = files.get(readMatch[1]);
					return await Promise.resolve(
						content === undefined
							? { exitCode: 1, stdout: '', stderr: 'missing' }
							: { exitCode: 0, stdout: content, stderr: '' },
					);
				}

				return await Promise.resolve({ exitCode: 0, stdout: '', stderr: '' });
			}),
		},
	};

	return { target, writes };
}

describe('workspace-files', () => {
	it('reads via filesystem when available', async () => {
		const { target } = createWorkspaceTarget(new Map([['/tmp/manifest.json', '{"ok":true}']]));

		await expect(readWorkspaceFile(target, '/tmp/manifest.json')).resolves.toBe('{"ok":true}');
		expect(target.sandbox?.executeCommand).not.toHaveBeenCalled();
	});

	it('preserves the filesystem as `this` when reading', async () => {
		// Mirrors LazyRuntimeFilesystem.readFile, whose body dereferences `this`
		// (e.g. `this.getFilesystem()`). A detached call would lose the binding
		// and throw "Cannot read properties of undefined".
		class ThisDependentFilesystem {
			private readonly files = new Map([['/tmp/manifest.json', '{"ok":true}']]);

			async readFile(path: string): Promise<string> {
				const content = this.files.get(path);
				if (content === undefined) throw new Error('missing');
				return await Promise.resolve(content);
			}

			async writeFile(): Promise<void> {
				await Promise.resolve();
			}
		}

		const target: WorkspaceFileTarget = { filesystem: new ThisDependentFilesystem() };

		await expect(readWorkspaceFile(target, '/tmp/manifest.json')).resolves.toBe('{"ok":true}');
	});

	it('reads via sandbox commands when no filesystem reader is available', async () => {
		const { target } = createWorkspaceTarget(new Map([['/tmp/manifest.json', '{"ok":true}']]));
		target.filesystem = {
			writeFile: vi.fn(async () => {}),
		};

		await expect(readWorkspaceFile(target, '/tmp/manifest.json')).resolves.toBe('{"ok":true}');
	});

	it('writes via filesystem and supports batch writes', async () => {
		const { target, writes } = createWorkspaceTarget(new Map());

		await writeWorkspaceFile(target, '/tmp/a.txt', 'alpha');
		await writeWorkspaceFileMap(
			target,
			new Map([
				['/tmp/b.txt', 'beta'],
				['/tmp/c.txt', 'gamma'],
			]),
		);

		expect(writes.get('/tmp/a.txt')).toBe('alpha');
		expect(writes.get('/tmp/b.txt')).toBe('beta');
		expect(writes.get('/tmp/c.txt')).toBe('gamma');
	});

	it('logs successful command fallback at warn level', async () => {
		const { target } = createWorkspaceTarget(new Map());
		const writeError = new Error('filesystem unavailable');
		target.filesystem = {
			writeFile: vi.fn(async () => await Promise.reject(writeError)),
		};
		const logger = {
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			debug: vi.fn(),
		};

		await writeWorkspaceFile(target, '/tmp/a.txt', 'alpha', {
			logger,
			resourceLabel: 'Knowledge base file',
		});

		expect(logger.warn).toHaveBeenCalledWith(
			'Knowledge base file filesystem write failed; used command fallback',
			expect.objectContaining({ path: '/tmp/a.txt' }),
		);
		expect(logger.debug).not.toHaveBeenCalled();
	});
});
