import { isQuotaExhaustedError } from '../../stream/map-chunk';
import type { WorkspaceFileTarget } from '../workspace-files';
import { readWorkspaceFile, writeWorkspaceFile, writeWorkspaceFileMap } from '../workspace-files';

class TransientWriteError extends Error {
	statusCode = 524;
}

function createLogger() {
	return { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
}

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

	it('retries transient filesystem read errors instead of reporting a missing file', async () => {
		const readFile = vi
			.fn()
			.mockRejectedValueOnce(new TransientWriteError('gateway timeout'))
			.mockResolvedValue('{"ok":true}');
		const target: WorkspaceFileTarget = {
			filesystem: { readFile, writeFile: vi.fn(async () => {}) },
		};

		await expect(
			readWorkspaceFile(target, '/tmp/manifest.json', {
				logger: createLogger(),
				retryBackoffBaseMs: 1,
			}),
		).resolves.toBe('{"ok":true}');
		expect(readFile).toHaveBeenCalledTimes(2);
	});

	it('throws on exhausted transient read errors instead of returning null', async () => {
		const readFile = vi.fn(async () => await Promise.reject(new TransientWriteError('timeout')));
		const target: WorkspaceFileTarget = {
			filesystem: { readFile, writeFile: vi.fn(async () => {}) },
		};

		await expect(
			readWorkspaceFile(target, '/tmp/manifest.json', {
				logger: createLogger(),
				retryBackoffBaseMs: 1,
			}),
		).rejects.toThrow('Failed to read workspace file "/tmp/manifest.json"');
		expect(readFile).toHaveBeenCalledTimes(3);
	});

	it('still returns null for non-transient read misses', async () => {
		const readFile = vi.fn(async () => await Promise.reject(new Error('ENOENT')));
		const target: WorkspaceFileTarget = {
			filesystem: { readFile, writeFile: vi.fn(async () => {}) },
		};

		await expect(
			readWorkspaceFile(target, '/tmp/manifest.json', { logger: createLogger() }),
		).resolves.toBeNull();
		expect(readFile).toHaveBeenCalledTimes(1);
	});

	it('throws on exhausted transient command read errors', async () => {
		const executeCommand = vi.fn(async () => {
			return await Promise.reject(new TransientWriteError('bad gateway'));
		});
		const target: WorkspaceFileTarget = { sandbox: { executeCommand } };

		await expect(
			readWorkspaceFile(target, '/tmp/manifest.json', {
				logger: createLogger(),
				retryBackoffBaseMs: 1,
			}),
		).rejects.toThrow('Failed to read workspace file "/tmp/manifest.json"');
		expect(executeCommand).toHaveBeenCalledTimes(3);
	});

	it('keeps the underlying error as cause on exhausted transient filesystem reads', async () => {
		const readError = new TransientWriteError('timeout');
		const readFile = vi.fn(async () => await Promise.reject(readError));
		const target: WorkspaceFileTarget = {
			filesystem: { readFile, writeFile: vi.fn(async () => {}) },
		};

		const thrown: unknown = await readWorkspaceFile(target, '/tmp/manifest.json', {
			logger: createLogger(),
			retryBackoffBaseMs: 1,
		}).catch((error: unknown) => error);

		expect(thrown).toBeInstanceOf(Error);
		expect((thrown as Error).cause).toBe(readError);
	});

	it('keeps the underlying error as cause on exhausted transient command reads', async () => {
		const commandError = new TransientWriteError('bad gateway');
		const executeCommand = vi.fn(async () => await Promise.reject(commandError));
		const target: WorkspaceFileTarget = { sandbox: { executeCommand } };

		const thrown: unknown = await readWorkspaceFile(target, '/tmp/manifest.json', {
			logger: createLogger(),
			retryBackoffBaseMs: 1,
		}).catch((error: unknown) => error);

		expect(thrown).toBeInstanceOf(Error);
		expect((thrown as Error).cause).toBe(commandError);
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

	it('retries filesystem writes on transient upstream errors', async () => {
		const { target, writes } = createWorkspaceTarget(new Map());
		const writeFile = vi
			.fn()
			.mockRejectedValueOnce(new TransientWriteError('gateway timeout'))
			.mockRejectedValueOnce(new TransientWriteError('gateway timeout'))
			.mockImplementation(async (path: string, content: string) => {
				writes.set(path, content);
				await Promise.resolve();
			});
		target.filesystem = { writeFile };

		await writeWorkspaceFile(target, '/tmp/a.txt', 'alpha', {
			logger: createLogger(),
			retryBackoffBaseMs: 1,
		});

		expect(writeFile).toHaveBeenCalledTimes(3);
		expect(writes.get('/tmp/a.txt')).toBe('alpha');
		expect(target.sandbox?.executeCommand).not.toHaveBeenCalled();
	});

	it('does not retry non-transient filesystem errors before falling back', async () => {
		const { target, writes } = createWorkspaceTarget(new Map());
		const writeFile = vi.fn(async () => await Promise.reject(new Error('permission denied')));
		target.filesystem = { writeFile };

		await writeWorkspaceFile(target, '/tmp/a.txt', 'alpha', {
			logger: createLogger(),
			retryBackoffBaseMs: 1,
		});

		expect(writeFile).toHaveBeenCalledTimes(1);
		expect(writes.size).toBe(0);
		expect(target.sandbox?.executeCommand).toHaveBeenCalled();
	});

	it('retries sandbox command writes on transient upstream errors', async () => {
		let calls = 0;
		const executeCommand = vi.fn(async (command: string) => {
			calls++;
			if (calls === 1) throw new TransientWriteError('bad gateway');
			return await Promise.resolve({ exitCode: 0, stdout: '', stderr: '', command });
		});
		const target: WorkspaceFileTarget = { sandbox: { executeCommand } };

		await expect(
			writeWorkspaceFile(target, '/tmp/a.txt', 'alpha', {
				logger: createLogger(),
				retryBackoffBaseMs: 1,
			}),
		).resolves.toBeUndefined();
	});

	it('surfaces the error after exhausting transient-write retries on both paths', async () => {
		const writeFile = vi.fn(async () => await Promise.reject(new TransientWriteError('timeout')));
		const executeCommand = vi.fn(
			async () => await Promise.reject(new TransientWriteError('timeout')),
		);
		const target: WorkspaceFileTarget = { filesystem: { writeFile }, sandbox: { executeCommand } };

		await expect(
			writeWorkspaceFile(target, '/tmp/a.txt', 'alpha', {
				logger: createLogger(),
				retryBackoffBaseMs: 1,
			}),
		).rejects.toThrow('command fallback failed');

		expect(writeFile).toHaveBeenCalledTimes(3);
		expect(executeCommand).toHaveBeenCalledTimes(3);
	});

	it('keeps a classifiable quota error as cause when both write paths fail', async () => {
		const quotaError = () =>
			Object.assign(new Error('Have reached end of quota'), {
				statusCode: 403,
				errorCode: 'quota_exhausted',
			});
		const commandError = quotaError();
		const writeFile = vi.fn(async () => await Promise.reject(quotaError()));
		const executeCommand = vi.fn(async () => await Promise.reject(commandError));
		const target: WorkspaceFileTarget = { filesystem: { writeFile }, sandbox: { executeCommand } };

		const thrown: unknown = await writeWorkspaceFile(target, '/tmp/a.txt', 'alpha', {
			logger: createLogger(),
		}).catch((error: unknown) => error);

		expect(thrown).toBeInstanceOf(Error);
		expect((thrown as Error).cause).toBe(commandError);
		expect(isQuotaExhaustedError(thrown)).toBe(true);
	});

	it('keeps a classifiable quota error as cause on the command-only write path', async () => {
		const commandError = Object.assign(new Error('Have reached end of quota'), {
			statusCode: 403,
			errorCode: 'quota_exhausted',
		});
		const executeCommand = vi.fn(async () => await Promise.reject(commandError));
		const target: WorkspaceFileTarget = { sandbox: { executeCommand } };

		const thrown: unknown = await writeWorkspaceFile(target, '/tmp/a.txt', 'alpha', {
			logger: createLogger(),
		}).catch((error: unknown) => error);

		expect(thrown).toBeInstanceOf(Error);
		expect((thrown as Error).cause).toBe(commandError);
		expect(isQuotaExhaustedError(thrown)).toBe(true);
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
