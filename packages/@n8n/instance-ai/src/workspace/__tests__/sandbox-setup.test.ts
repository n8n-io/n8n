import { jsonParse } from 'n8n-workflow';

import type { InstanceAiContext, SearchableNodeDescription } from '../../types';
import type { BuilderTemplatesBundle } from '../builder-templates-service';
import type { SandboxWorkspace } from '../sandbox-fs';
import type { setupSandboxWorkspace as setupSandboxWorkspaceFunction } from '../sandbox-setup';
import { formatNodeCatalogLine } from '../sandbox-setup';

type SetupSandboxWorkspace = typeof setupSandboxWorkspaceFunction;
type RunInSandboxMock = jest.Mock<
	Promise<{ exitCode: number; stdout: string; stderr: string }>,
	[SandboxWorkspace, string, string?]
>;
type ReadFileViaSandboxMock = jest.Mock<Promise<string | null>, [SandboxWorkspace, string]>;

function createSetupContext(
	templatesBundle: BuilderTemplatesBundle | null = null,
): InstanceAiContext {
	return {
		nodeService: {
			listSearchable: jest.fn().mockResolvedValue([]),
		},
		workflowService: {
			list: jest.fn().mockResolvedValue([]),
		},
		...(templatesBundle
			? {
					templatesService: {
						getBundle: jest.fn().mockResolvedValue(templatesBundle),
						getVersion: jest.fn().mockReturnValue(templatesBundle.version),
					},
				}
			: {}),
	} as unknown as InstanceAiContext;
}

function createLocalWorkspace(
	writeFile: jest.Mock<Promise<void>, [string, string | Buffer, { recursive?: boolean }?]>,
	mkdir?: jest.Mock<Promise<void>, [string, { recursive?: boolean }?]>,
): SandboxWorkspace {
	return {
		filesystem: {
			provider: 'local',
			basePath: '/sandbox',
			writeFile,
			mkdir: mkdir ?? jest.fn<Promise<void>, [string, { recursive?: boolean }?]>(async () => {}),
		},
	};
}

function loadSetupSandboxWorkspaceWithFsMocks(
	runInSandbox: RunInSandboxMock,
	readFileViaSandbox: ReadFileViaSandboxMock,
): SetupSandboxWorkspace {
	jest.resetModules();
	jest.doMock('../sandbox-fs', () => ({
		runInSandbox,
		readFileViaSandbox,
		escapeSingleQuotes: (value: string) => value.replace(/'/g, "'\\''"),
	}));

	let sandboxSetup: { setupSandboxWorkspace: SetupSandboxWorkspace } | undefined;
	jest.isolateModules(() => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		sandboxSetup = require('../sandbox-setup') as {
			setupSandboxWorkspace: SetupSandboxWorkspace;
		};
	});

	if (!sandboxSetup) throw new Error('Failed to load sandbox setup module');
	return sandboxSetup.setupSandboxWorkspace;
}

function loadSandboxPackageJson(linkSdk: boolean): {
	dependencies: Record<string, string>;
	devDependencies: Record<string, string>;
} {
	jest.resetModules();
	if (linkSdk) {
		process.env.N8N_INSTANCE_AI_SANDBOX_LINK_SDK = '1';
	} else {
		delete process.env.N8N_INSTANCE_AI_SANDBOX_LINK_SDK;
	}

	let packageJson = '';
	jest.isolateModules(() => {
		const sandboxSetup = jest.requireActual<{ PACKAGE_JSON: string }>('../sandbox-setup');
		packageJson = sandboxSetup.PACKAGE_JSON;
	});

	return jsonParse<{
		dependencies: Record<string, string>;
		devDependencies: Record<string, string>;
	}>(packageJson);
}

describe('PACKAGE_JSON', () => {
	const originalLinkSdk = process.env.N8N_INSTANCE_AI_SANDBOX_LINK_SDK;

	afterEach(() => {
		jest.resetModules();
		if (originalLinkSdk === undefined) {
			delete process.env.N8N_INSTANCE_AI_SANDBOX_LINK_SDK;
		} else {
			process.env.N8N_INSTANCE_AI_SANDBOX_LINK_SDK = originalLinkSdk;
		}
	});

	it('should include a registry SDK dependency when workspace SDK linking is disabled', () => {
		const packageJson = loadSandboxPackageJson(false);

		expect(packageJson.dependencies['@n8n/workflow-sdk']).toBeDefined();
		expect(packageJson.dependencies.tsx).toBeDefined();
	});

	it('should omit the registry SDK dependency when workspace SDK linking is enabled', () => {
		const packageJson = loadSandboxPackageJson(true);

		expect(packageJson.dependencies).not.toHaveProperty('@n8n/workflow-sdk');
		expect(packageJson.dependencies.tsx).toBeDefined();
	});
});

describe('setupSandboxWorkspace', () => {
	afterEach(() => {
		jest.dontMock('../sandbox-fs');
		jest.resetModules();
	});

	it('writes the initialized marker only after workspace files and npm install succeed', async () => {
		const runInSandbox: RunInSandboxMock = jest.fn<
			Promise<{ exitCode: number; stdout: string; stderr: string }>,
			[SandboxWorkspace, string, string?]
		>();
		runInSandbox.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
		const readFileViaSandbox: ReadFileViaSandboxMock = jest.fn<
			Promise<string | null>,
			[SandboxWorkspace, string]
		>();
		readFileViaSandbox.mockResolvedValue(null);
		const setupSandboxWorkspace = loadSetupSandboxWorkspaceWithFsMocks(
			runInSandbox,
			readFileViaSandbox,
		);
		const writeFile = jest.fn<Promise<void>, [string, string | Buffer, { recursive?: boolean }?]>(
			async () => {},
		);

		await setupSandboxWorkspace(createLocalWorkspace(writeFile), createSetupContext());

		const markerCallIndex = writeFile.mock.calls.findIndex(
			([path]) => path === '/sandbox/.sandbox-initialized',
		);
		expect(markerCallIndex).toBeGreaterThan(-1);
		expect(writeFile.mock.invocationCallOrder[markerCallIndex]).toBeGreaterThan(
			runInSandbox.mock.invocationCallOrder[0],
		);
	});

	it('always creates workflows/, src/, and chunks/ even when no workflows exist', async () => {
		const runInSandbox: RunInSandboxMock = jest.fn<
			Promise<{ exitCode: number; stdout: string; stderr: string }>,
			[SandboxWorkspace, string, string?]
		>();
		runInSandbox.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
		const readFileViaSandbox: ReadFileViaSandboxMock = jest.fn<
			Promise<string | null>,
			[SandboxWorkspace, string]
		>();
		readFileViaSandbox.mockResolvedValue(null);
		const setupSandboxWorkspace = loadSetupSandboxWorkspaceWithFsMocks(
			runInSandbox,
			readFileViaSandbox,
		);
		const writeFile = jest.fn<Promise<void>, [string, string | Buffer, { recursive?: boolean }?]>(
			async () => {},
		);
		const mkdir = jest.fn<Promise<void>, [string, { recursive?: boolean }?]>(async () => {});

		// Setup context defaults to an empty workflow list, mirroring a fresh DB.
		await setupSandboxWorkspace(createLocalWorkspace(writeFile, mkdir), createSetupContext());

		const mkdirPaths = mkdir.mock.calls.map(([path]) => path);
		expect(mkdirPaths).toEqual(
			expect.arrayContaining(['/sandbox/src', '/sandbox/chunks', '/sandbox/workflows']),
		);
	});

	it('never writes examples/ on the local provider even when a bundle is available', async () => {
		// Local provider is for SDK dev iteration; the agent operates fine without
		// the curated reference set, so setupSandboxWorkspace must not pay the
		// per-file/archive write cost here.
		const runInSandbox: RunInSandboxMock = jest.fn<
			Promise<{ exitCode: number; stdout: string; stderr: string }>,
			[SandboxWorkspace, string, string?]
		>();
		runInSandbox.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
		const readFileViaSandbox: ReadFileViaSandboxMock = jest.fn<
			Promise<string | null>,
			[SandboxWorkspace, string]
		>();
		readFileViaSandbox.mockResolvedValue(null);
		const setupSandboxWorkspace = loadSetupSandboxWorkspaceWithFsMocks(
			runInSandbox,
			readFileViaSandbox,
		);
		const writeFile = jest.fn<Promise<void>, [string, string | Buffer, { recursive?: boolean }?]>(
			async () => {},
		);

		const bundle: BuilderTemplatesBundle = {
			archive: Buffer.from('opaque-archive-bytes'),
			version: 'test-sha',
		};
		await setupSandboxWorkspace(createLocalWorkspace(writeFile), createSetupContext(bundle));

		const writtenPaths = writeFile.mock.calls.map(([path]) => path);
		expect(writtenPaths.some((p) => p.includes('/examples/'))).toBe(false);
		expect(writtenPaths.some((p) => p.endsWith('.templates.tar.gz'))).toBe(false);
		// `tar` must not be exec'd on the local provider either.
		const tarInvocations = runInSandbox.mock.calls.filter(([, cmd]) => cmd.includes('tar -xzf'));
		expect(tarInvocations).toEqual([]);
	});

	it('does not write the initialized marker when npm install fails', async () => {
		const runInSandbox: RunInSandboxMock = jest.fn<
			Promise<{ exitCode: number; stdout: string; stderr: string }>,
			[SandboxWorkspace, string, string?]
		>();
		runInSandbox.mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'install failed' });
		const readFileViaSandbox: ReadFileViaSandboxMock = jest.fn<
			Promise<string | null>,
			[SandboxWorkspace, string]
		>();
		readFileViaSandbox.mockResolvedValue(null);
		const setupSandboxWorkspace = loadSetupSandboxWorkspaceWithFsMocks(
			runInSandbox,
			readFileViaSandbox,
		);
		const writeFile = jest.fn<Promise<void>, [string, string | Buffer, { recursive?: boolean }?]>(
			async () => {},
		);

		await expect(
			setupSandboxWorkspace(createLocalWorkspace(writeFile), createSetupContext()),
		).rejects.toThrow('Sandbox npm install failed');

		expect(writeFile.mock.calls).not.toContainEqual([
			'/sandbox/.sandbox-initialized',
			expect.any(String),
			{ recursive: true },
		]);
	});
});

describe('writeCuratedExamples', () => {
	afterEach(() => {
		jest.dontMock('../sandbox-fs');
		jest.resetModules();
	});

	type WriteCuratedExamples = (
		workspace: SandboxWorkspace,
		bundle: BuilderTemplatesBundle | null,
		logger?: { debug?: jest.Mock; warn?: jest.Mock },
	) => Promise<void>;

	type FsMocks = {
		runInSandbox: RunInSandboxMock;
		writeFileViaSandbox: jest.Mock<Promise<void>, [SandboxWorkspace, string, string | Buffer]>;
	};

	function loadWriteCuratedExamples(): { fn: WriteCuratedExamples; fs: FsMocks } {
		const runInSandbox: RunInSandboxMock = jest.fn<
			Promise<{ exitCode: number; stdout: string; stderr: string }>,
			[SandboxWorkspace, string, string?]
		>();
		runInSandbox.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
		const writeFileViaSandbox = jest.fn<Promise<void>, [SandboxWorkspace, string, string | Buffer]>(
			async () => {},
		);
		jest.resetModules();
		jest.doMock('../sandbox-fs', () => ({
			runInSandbox,
			readFileViaSandbox: jest.fn().mockResolvedValue(null),
			writeFileViaSandbox,
			escapeSingleQuotes: (value: string) => value.replace(/'/g, "'\\''"),
		}));

		let loaded: { writeCuratedExamples: WriteCuratedExamples } | undefined;
		jest.isolateModules(() => {
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			loaded = require('../sandbox-setup') as {
				writeCuratedExamples: WriteCuratedExamples;
			};
		});
		if (!loaded) throw new Error('Failed to load sandbox-setup');
		return { fn: loaded.writeCuratedExamples, fs: { runInSandbox, writeFileViaSandbox } };
	}

	function makeDaytonaWorkspace() {
		const filesystem = {
			provider: 'daytona' as const,
			writeFile: jest.fn<Promise<void>, [string, Buffer, { recursive?: boolean }?]>(async () => {}),
			mkdir: jest.fn<Promise<void>, [string, { recursive?: boolean }?]>(async () => {}),
		};
		const workspace = { filesystem } as unknown as SandboxWorkspace;
		return { workspace, filesystem };
	}

	function makeShellOnlyWorkspace(): SandboxWorkspace {
		// No filesystem property → forces the writeFileViaSandbox fallback.
		return {} as unknown as SandboxWorkspace;
	}

	const ARCHIVE = Buffer.from('opaque-archive-bytes-v1');

	it('writes the archive and runs tar on a non-local provider', async () => {
		const { fn, fs } = loadWriteCuratedExamples();
		const { workspace, filesystem } = makeDaytonaWorkspace();

		await fn(workspace, { archive: ARCHIVE, version: '"v1"' });

		// Filesystem path: mkdir for examples/, then writeFile for the archive.
		expect(filesystem.mkdir).toHaveBeenCalledWith(expect.stringContaining('/examples'), {
			recursive: true,
		});
		expect(filesystem.writeFile).toHaveBeenCalledWith(
			expect.stringMatching(/\.templates\.tar\.gz$/),
			ARCHIVE,
			{ recursive: true },
		);

		// tar exec runs exactly once with extract + rm in one shell expression.
		const tarCalls = fs.runInSandbox.mock.calls.filter(([, cmd]) => cmd.includes('tar -xzf'));
		expect(tarCalls).toHaveLength(1);
		expect(tarCalls[0][1]).toMatch(/tar -xzf .* -C .* rm -f .*/);
		// `status` is a read-only builtin in zsh — assigning to it would
		// silently drop tar's exit code. Use any other name.
		expect(tarCalls[0][1]).not.toMatch(/\bstatus=\$\?/);
	});

	it('falls back to shell writes when the workspace has no filesystem', async () => {
		const { fn, fs } = loadWriteCuratedExamples();
		const workspace = makeShellOnlyWorkspace();

		await fn(workspace, { archive: ARCHIVE, version: '"v1"' });

		// mkdir is exec'd, then archive written via writeFileViaSandbox, then tar.
		const mkdirCalls = fs.runInSandbox.mock.calls.filter(([, cmd]) => cmd.startsWith('mkdir -p'));
		expect(mkdirCalls).toHaveLength(1);

		expect(fs.writeFileViaSandbox).toHaveBeenCalledWith(
			workspace,
			expect.stringMatching(/\.templates\.tar\.gz$/),
			ARCHIVE,
		);

		const tarCalls = fs.runInSandbox.mock.calls.filter(([, cmd]) => cmd.includes('tar -xzf'));
		expect(tarCalls).toHaveLength(1);
	});

	it('warns and continues when tar exits non-zero', async () => {
		const { fn, fs } = loadWriteCuratedExamples();
		fs.runInSandbox.mockImplementation(async (_, cmd) => {
			const stderr = cmd.includes('tar -xzf') ? 'tar: bad archive' : '';
			const exitCode = cmd.includes('tar -xzf') ? 1 : 0;
			return await Promise.resolve({ exitCode, stdout: '', stderr });
		});
		const { workspace } = makeDaytonaWorkspace();
		const logger = { debug: jest.fn(), warn: jest.fn() };

		// Must not throw.
		await fn(workspace, { archive: ARCHIVE, version: '"v1"' }, logger);

		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining('failed to extract'),
			expect.objectContaining({ stderr: 'tar: bad archive' }),
		);
	});

	it('no-ops when bundle.archive is null', async () => {
		const { fn, fs } = loadWriteCuratedExamples();
		const { workspace, filesystem } = makeDaytonaWorkspace();

		await fn(workspace, { archive: null, version: null });

		expect(filesystem.writeFile).not.toHaveBeenCalled();
		expect(fs.runInSandbox).not.toHaveBeenCalled();
	});

	it('no-ops when bundle is null', async () => {
		const { fn, fs } = loadWriteCuratedExamples();
		const { workspace, filesystem } = makeDaytonaWorkspace();

		await fn(workspace, null);

		expect(filesystem.writeFile).not.toHaveBeenCalled();
		expect(fs.runInSandbox).not.toHaveBeenCalled();
	});

	it('skips the local provider even with a non-empty bundle', async () => {
		const { fn, fs } = loadWriteCuratedExamples();
		const writeFile = jest.fn<Promise<void>, [string, string | Buffer, { recursive?: boolean }?]>(
			async () => {},
		);
		const workspace = {
			filesystem: {
				provider: 'local',
				basePath: '/sandbox',
				writeFile,
				mkdir: jest.fn<Promise<void>, [string, { recursive?: boolean }?]>(async () => {}),
			},
		} as unknown as SandboxWorkspace;

		await fn(workspace, { archive: ARCHIVE, version: '"v1"' });

		expect(writeFile).not.toHaveBeenCalled();
		expect(fs.runInSandbox).not.toHaveBeenCalled();
	});
});

describe('formatNodeCatalogLine', () => {
	it('should format a basic node with a string version', () => {
		const node: SearchableNodeDescription = {
			name: 'n8n-nodes-base.httpRequest',
			displayName: 'HTTP Request',
			description: 'Makes an HTTP request and returns the response data',
			version: 1,
			inputs: ['main'],
			outputs: ['main'],
		};

		const result = formatNodeCatalogLine(node);

		expect(result).toBe(
			'n8n-nodes-base.httpRequest | HTTP Request | Makes an HTTP request and returns the response data | v1',
		);
	});

	it('should pick the last element when version is an array', () => {
		const node: SearchableNodeDescription = {
			name: 'n8n-nodes-base.slack',
			displayName: 'Slack',
			description: 'Send messages to Slack',
			version: [1, 2, 3],
			inputs: ['main'],
			outputs: ['main'],
		};

		const result = formatNodeCatalogLine(node);

		expect(result).toBe('n8n-nodes-base.slack | Slack | Send messages to Slack | v3');
	});

	it('should append aliases when codex.alias is present and non-empty', () => {
		const node: SearchableNodeDescription = {
			name: 'n8n-nodes-base.gmail',
			displayName: 'Gmail',
			description: 'Send and receive emails via Gmail',
			version: 2,
			inputs: ['main'],
			outputs: ['main'],
			codex: { alias: ['email', 'google mail'] },
		};

		const result = formatNodeCatalogLine(node);

		expect(result).toBe(
			'n8n-nodes-base.gmail | Gmail | Send and receive emails via Gmail | v2 | aliases: email, google mail',
		);
	});

	it('should not append aliases when codex.alias is an empty array', () => {
		const node: SearchableNodeDescription = {
			name: 'n8n-nodes-base.set',
			displayName: 'Set',
			description: 'Sets values on items',
			version: 1,
			inputs: ['main'],
			outputs: ['main'],
			codex: { alias: [] },
		};

		const result = formatNodeCatalogLine(node);

		expect(result).toBe('n8n-nodes-base.set | Set | Sets values on items | v1');
	});

	it('should not append aliases when codex is present but alias is undefined', () => {
		const node: SearchableNodeDescription = {
			name: 'n8n-nodes-base.noOp',
			displayName: 'No Operation',
			description: 'Does nothing',
			version: 1,
			inputs: ['main'],
			outputs: ['main'],
			codex: {},
		};

		const result = formatNodeCatalogLine(node);

		expect(result).toBe('n8n-nodes-base.noOp | No Operation | Does nothing | v1');
	});

	it('should handle pipe characters in description (documents current behavior)', () => {
		// The pipe character in the description is not escaped, which means
		// the catalog line becomes ambiguous when parsed by splitting on " | ".
		// This test documents the current behavior.
		const node: SearchableNodeDescription = {
			name: 'n8n-nodes-base.ifNode',
			displayName: 'IF',
			description: 'Route items based on true | false condition',
			version: 1,
			inputs: ['main'],
			outputs: ['main'],
		};

		const result = formatNodeCatalogLine(node);

		expect(result).toBe(
			'n8n-nodes-base.ifNode | IF | Route items based on true | false condition | v1',
		);

		// Splitting on ' | ' yields 5 parts instead of 4 due to unescaped pipe in description
		const parts = result.split(' | ');
		expect(parts).toHaveLength(5);
	});

	it('should handle a single-element version array', () => {
		const node: SearchableNodeDescription = {
			name: 'n8n-nodes-base.code',
			displayName: 'Code',
			description: 'Run custom JavaScript code',
			version: [2],
			inputs: ['main'],
			outputs: ['main'],
		};

		const result = formatNodeCatalogLine(node);

		expect(result).toBe('n8n-nodes-base.code | Code | Run custom JavaScript code | v2');
	});
});
