const { packWorkspaceSdkMockState, resolveMockWorkspaceRoot, sandboxFsMockState } = vi.hoisted(
	() => ({
		packWorkspaceSdkMockState: {
			isEnabled: false,
			packWorkspaceSdk: vi.fn(),
		},
		resolveMockWorkspaceRoot: async (workspace: {
			filesystem?: { basePath?: string };
		}): Promise<string> => {
			await Promise.resolve();
			const basePath = workspace.filesystem?.basePath;
			if (typeof basePath === 'string' && basePath.length > 0) {
				return basePath;
			}

			return '/home/daytona/workspace';
		},
		// Mutable mock state for `../sandbox-fs`. A top-level `vi.mock` (below)
		// delegates to these, so each test swaps behaviour by assigning here —
		// no per-test `vi.resetModules()` + dynamic `import`, which races and
		// flakes when many vitest processes run concurrently (e.g. CI).
		sandboxFsMockState: {
			runInSandbox:
				vi.fn<
					(
						...args: [SandboxWorkspace, string, string?]
					) => Promise<{ exitCode: number; stdout: string; stderr: string }>
				>(),
			readFileViaSandbox: vi.fn<(...args: [SandboxWorkspace, string]) => Promise<string | null>>(),
		},
	}),
);

vi.mock('../pack-workspace-sdk', () => ({
	isLinkWorkspaceSdkEnabled: () => packWorkspaceSdkMockState.isEnabled,
	packWorkspaceSdk: packWorkspaceSdkMockState.packWorkspaceSdk,
}));

vi.mock('@n8n/agents/sandbox', async (importOriginal) => {
	const actual = await importOriginal<Record<string, unknown>>();
	return {
		...actual,
		getWorkspaceRoot: resolveMockWorkspaceRoot,
	};
});

vi.mock('../sandbox-fs', () => ({
	runInSandbox: async (...args: [SandboxWorkspace, string, string?]) =>
		await sandboxFsMockState.runInSandbox(...args),
	readFileViaSandbox: async (...args: [SandboxWorkspace, string]) =>
		await sandboxFsMockState.readFileViaSandbox(...args),
	writeFileViaSandbox: async (workspace: SandboxWorkspace, path: string) => {
		const result = await sandboxFsMockState.runInSandbox(workspace, `write '${path}'`);
		if (result.exitCode !== 0) {
			throw new Error(`Failed to write file ${path}: ${result.stderr}`);
		}
	},
	escapeSingleQuotes: (value: string) => value.replace(/'/g, "'\\''"),
}));

import { jsonParse } from 'n8n-workflow';
import type { Mock } from 'vitest';

import { makeBuilderTemplatesTarGz } from '../../knowledge-base/__tests__/builder-templates-archive.fixtures';
import type { InstanceAiContext, SearchableNodeDescription } from '../../types';
import type { BuilderTemplatesBundle } from '../builder-templates-service';
import type { SandboxWorkspace } from '../sandbox-fs';
import {
	setupSandboxWorkspace,
	type formatNodeCatalogLine as formatNodeCatalogLineFunction,
} from '../sandbox-setup';

type SetupSandboxWorkspace = typeof setupSandboxWorkspace;
type FormatNodeCatalogLine = typeof formatNodeCatalogLineFunction;
type LinkWorkspaceSdkIfEnabled = (
	workspace: SandboxWorkspace,
	root: string,
	logger: { error: Mock; info: Mock; warn: Mock; debug: Mock },
) => Promise<void>;
type RunInSandboxMock = Mock<
	(
		...args: [SandboxWorkspace, string, string?]
	) => Promise<{ exitCode: number; stdout: string; stderr: string }>
>;
type ReadFileViaSandboxMock = Mock<(...args: [SandboxWorkspace, string]) => Promise<string | null>>;
const LINK_WORKSPACE_SDK_ENV = 'N8N_INSTANCE_AI_SANDBOX_LINK_SDK';

function restoreLinkWorkspaceSdkEnv(value: string | undefined): void {
	if (value === undefined) {
		delete process.env[LINK_WORKSPACE_SDK_ENV];
	} else {
		process.env[LINK_WORKSPACE_SDK_ENV] = value;
	}
}

function createSetupContext(
	templatesBundle: BuilderTemplatesBundle | null = null,
): InstanceAiContext {
	return {
		logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
		nodeService: {
			listSearchable: vi.fn().mockResolvedValue([]),
		},
		workflowService: {
			list: vi.fn().mockResolvedValue([]),
			get: vi.fn(),
		},
		...(templatesBundle
			? {
					templatesService: {
						getBundle: vi.fn().mockResolvedValue(templatesBundle),
						getVersion: vi.fn().mockReturnValue(templatesBundle.version),
					},
				}
			: {}),
	} as unknown as InstanceAiContext;
}

function mockDaytonaExecuteCommand(command: string): {
	exitCode: number;
	stdout: string;
	stderr: string;
} {
	if (command === 'echo $HOME') {
		return { exitCode: 0, stdout: '/home/daytona\n', stderr: '' };
	}

	if (command.startsWith('cat ')) {
		return { exitCode: 1, stdout: '', stderr: '' };
	}

	return { exitCode: 0, stdout: '', stderr: '' };
}

function createFilesystemWorkspace(
	writeFile: Mock<(...args: [string, string | Buffer, { recursive?: boolean }?]) => Promise<void>>,
	mkdir?: Mock<(...args: [string, { recursive?: boolean }?]) => Promise<void>>,
): SandboxWorkspace {
	return {
		filesystem: {
			provider: 'daytona',
			writeFile,
			mkdir:
				mkdir ??
				vi.fn<(...args: [string, { recursive?: boolean }?]) => Promise<void>>(async () => {}),
		},
		sandbox: {
			executeCommand: vi.fn(async (command: string) => {
				await Promise.resolve();
				return mockDaytonaExecuteCommand(command);
			}),
		},
	};
}

function createLocalWorkspace(
	writeFile: Mock<(...args: [string, string | Buffer, { recursive?: boolean }?]) => Promise<void>>,
	mkdir?: Mock<(...args: [string, { recursive?: boolean }?]) => Promise<void>>,
	readFile: Mock<(...args: [string]) => Promise<string | Buffer>> = vi.fn(
		async () => await Promise.reject(new Error('ENOENT')),
	),
): SandboxWorkspace {
	return {
		filesystem: {
			provider: 'local',
			basePath: '/sandbox',
			readFile,
			writeFile,
			mkdir:
				mkdir ??
				vi.fn<(...args: [string, { recursive?: boolean }?]) => Promise<void>>(
					async () => await Promise.resolve(),
				),
		},
		sandbox: {
			executeCommand: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' }),
		},
	};
}

function loadSetupSandboxWorkspaceWithFsMocks(
	runInSandbox: RunInSandboxMock,
	readFileViaSandbox: ReadFileViaSandboxMock,
): SetupSandboxWorkspace {
	packWorkspaceSdkMockState.isEnabled = false;
	packWorkspaceSdkMockState.packWorkspaceSdk.mockReset();
	sandboxFsMockState.runInSandbox = runInSandbox;
	sandboxFsMockState.readFileViaSandbox = readFileViaSandbox;
	return setupSandboxWorkspace;
}

async function loadLinkWorkspaceSdkWithMocks(
	packWorkspaceSdk: Mock,
	runInSandbox: RunInSandboxMock,
): Promise<LinkWorkspaceSdkIfEnabled> {
	packWorkspaceSdkMockState.isEnabled = true;
	packWorkspaceSdkMockState.packWorkspaceSdk.mockReset();
	packWorkspaceSdkMockState.packWorkspaceSdk.mockImplementation(packWorkspaceSdk);
	vi.resetModules();
	vi.doMock('../sandbox-fs', () => ({
		runInSandbox,
		readFileViaSandbox: vi.fn(),
		writeFileViaSandbox: vi.fn(),
		escapeSingleQuotes: (value: string) => value.replace(/'/g, "'\\''"),
	}));

	const sandboxSetup = (await import('../sandbox-setup')) as {
		linkWorkspaceSdkIfEnabled: LinkWorkspaceSdkIfEnabled;
	};

	return sandboxSetup.linkWorkspaceSdkIfEnabled;
}

async function loadSandboxPackageJson(linkSdk: boolean): Promise<{
	dependencies: Record<string, string>;
	devDependencies: Record<string, string>;
}> {
	// Ensure no leftover sandbox-fs mock from a sibling describe affects this fresh
	// import, then re-import sandbox-setup so its env-dependent PACKAGE_JSON constant
	// is re-evaluated. Using `await import` (rather than `vi.importActual`) keeps the
	// module-cache interaction consistent with the doMock-based loaders above.
	packWorkspaceSdkMockState.isEnabled = linkSdk;
	packWorkspaceSdkMockState.packWorkspaceSdk.mockReset();
	vi.doUnmock('../sandbox-fs');
	vi.resetModules();
	if (linkSdk) {
		process.env.N8N_INSTANCE_AI_SANDBOX_LINK_SDK = '1';
	} else {
		delete process.env.N8N_INSTANCE_AI_SANDBOX_LINK_SDK;
	}

	const sandboxSetup = await import('../sandbox-setup');
	const packageJson = sandboxSetup.PACKAGE_JSON;

	return jsonParse<{
		dependencies: Record<string, string>;
		devDependencies: Record<string, string>;
	}>(packageJson);
}

describe('PACKAGE_JSON', () => {
	const originalLinkSdk = process.env.N8N_INSTANCE_AI_SANDBOX_LINK_SDK;

	afterEach(() => {
		vi.resetModules();
		packWorkspaceSdkMockState.isEnabled = false;
		packWorkspaceSdkMockState.packWorkspaceSdk.mockReset();
		restoreLinkWorkspaceSdkEnv(originalLinkSdk);
	});

	it('should include a registry SDK dependency when workspace SDK linking is disabled', async () => {
		const packageJson = await loadSandboxPackageJson(false);

		expect(packageJson.dependencies['@n8n/workflow-sdk']).toBeDefined();
		expect(packageJson.dependencies.tsx).toBeDefined();
	});

	it('should omit the registry SDK dependency when workspace SDK linking is enabled', async () => {
		const packageJson = await loadSandboxPackageJson(true);

		expect(packageJson.dependencies).not.toHaveProperty('@n8n/workflow-sdk');
		expect(packageJson.dependencies.tsx).toBeDefined();
	});
});
describe('setupSandboxWorkspace', () => {
	afterEach(() => {
		vi.doUnmock('../sandbox-fs');
		vi.resetModules();
		packWorkspaceSdkMockState.isEnabled = false;
		packWorkspaceSdkMockState.packWorkspaceSdk.mockReset();
	});

	it('writes the initialized marker only after workspace files and npm install succeed', async () => {
		const runInSandbox: RunInSandboxMock =
			vi.fn<
				(
					...args: [SandboxWorkspace, string, string?]
				) => Promise<{ exitCode: number; stdout: string; stderr: string }>
			>();
		runInSandbox.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
		const readFileViaSandbox: ReadFileViaSandboxMock =
			vi.fn<(...args: [SandboxWorkspace, string]) => Promise<string | null>>();
		readFileViaSandbox.mockResolvedValue(null);
		const setupSandboxWorkspace = loadSetupSandboxWorkspaceWithFsMocks(
			runInSandbox,
			readFileViaSandbox,
		);
		const writeFile = vi.fn<
			(...args: [string, string | Buffer, { recursive?: boolean }?]) => Promise<void>
		>(async () => await Promise.resolve());

		await setupSandboxWorkspace(createFilesystemWorkspace(writeFile), createSetupContext());

		const markerCallIndex = writeFile.mock.calls.findIndex(
			([path]) => path === '/home/daytona/workspace/.sandbox-initialized',
		);
		expect(markerCallIndex).toBeGreaterThan(-1);
		expect(writeFile.mock.invocationCallOrder[markerCallIndex]).toBeGreaterThan(
			runInSandbox.mock.invocationCallOrder[0],
		);
	});

	it('always creates workflows/, src/, and chunks/ even when no workflows exist', async () => {
		const runInSandbox: RunInSandboxMock =
			vi.fn<
				(
					...args: [SandboxWorkspace, string, string?]
				) => Promise<{ exitCode: number; stdout: string; stderr: string }>
			>();
		runInSandbox.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
		const readFileViaSandbox: ReadFileViaSandboxMock =
			vi.fn<(...args: [SandboxWorkspace, string]) => Promise<string | null>>();
		readFileViaSandbox.mockResolvedValue(null);
		const setupSandboxWorkspace = loadSetupSandboxWorkspaceWithFsMocks(
			runInSandbox,
			readFileViaSandbox,
		);
		const writeFile = vi.fn<
			(...args: [string, string | Buffer, { recursive?: boolean }?]) => Promise<void>
		>(async () => {});
		const mkdir = vi.fn<(...args: [string, { recursive?: boolean }?]) => Promise<void>>(
			async () => {},
		);

		// Setup context defaults to an empty workflow list, mirroring a fresh DB.
		await setupSandboxWorkspace(createFilesystemWorkspace(writeFile, mkdir), createSetupContext());

		const mkdirPaths = mkdir.mock.calls.map(([path]) => path);
		expect(mkdirPaths).toEqual(
			expect.arrayContaining([
				'/home/daytona/workspace/src',
				'/home/daytona/workspace/chunks',
				'/home/daytona/workspace/workflows',
			]),
		);
	});

	it('upgrades the knowledge base when sandbox was initialized before templates existed', async () => {
		const runInSandbox: RunInSandboxMock =
			vi.fn<
				(
					...args: [SandboxWorkspace, string, string?]
				) => Promise<{ exitCode: number; stdout: string; stderr: string }>
			>();
		runInSandbox.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
		const readFileViaSandbox: ReadFileViaSandboxMock =
			vi.fn<(...args: [SandboxWorkspace, string]) => Promise<string | null>>();
		readFileViaSandbox.mockImplementation(async (_workspace, path) => {
			await Promise.resolve();
			if (path === '/sandbox/.sandbox-initialized') {
				return '2024-01-01T00:00:00.000Z';
			}
			return null;
		});
		const setupSandboxWorkspace = loadSetupSandboxWorkspaceWithFsMocks(
			runInSandbox,
			readFileViaSandbox,
		);
		const writeFile = vi.fn<
			(...args: [string, string | Buffer, { recursive?: boolean }?]) => Promise<void>
		>(async () => await Promise.resolve());
		const readFile = vi.fn(async (path: string) => {
			if (path === '/sandbox/.sandbox-initialized') {
				return await Promise.resolve('2024-01-01T00:00:00.000Z');
			}
			return await Promise.reject(new Error(`ENOENT: ${path}`));
		});

		const bundle: BuilderTemplatesBundle = {
			archive: makeBuilderTemplatesTarGz([{ name: 'example-workflow.ts', content: 'export {}' }]),
			version: 'test-sha',
		};
		const initialized = await setupSandboxWorkspace(
			createLocalWorkspace(writeFile, undefined, readFile),
			createSetupContext(bundle),
		);

		expect(initialized).toBe(false);
		expect(runInSandbox).not.toHaveBeenCalledWith(
			expect.anything(),
			'npm install --ignore-scripts',
			'/sandbox',
		);
		const writtenPaths = writeFile.mock.calls.map(([path]) => path);
		expect(writtenPaths.some((p) => p.includes('/knowledge-base/templates/'))).toBe(true);
	});

	it('materializes knowledge-base templates on the local provider when a bundle is available', async () => {
		const runInSandbox: RunInSandboxMock =
			vi.fn<
				(
					...args: [SandboxWorkspace, string, string?]
				) => Promise<{ exitCode: number; stdout: string; stderr: string }>
			>();
		runInSandbox.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
		const readFileViaSandbox: ReadFileViaSandboxMock =
			vi.fn<(...args: [SandboxWorkspace, string]) => Promise<string | null>>();
		readFileViaSandbox.mockResolvedValue(null);
		const setupSandboxWorkspace = loadSetupSandboxWorkspaceWithFsMocks(
			runInSandbox,
			readFileViaSandbox,
		);
		const writeFile = vi.fn<
			(...args: [string, string | Buffer, { recursive?: boolean }?]) => Promise<void>
		>(async () => {});

		const bundle: BuilderTemplatesBundle = {
			archive: makeBuilderTemplatesTarGz([{ name: 'example-workflow.ts', content: 'export {}' }]),
			version: 'test-sha',
		};
		await setupSandboxWorkspace(createLocalWorkspace(writeFile), createSetupContext(bundle));

		const writtenPaths = writeFile.mock.calls.map(([path]) => path);
		expect(writtenPaths.some((p) => p.includes('/knowledge-base/templates/'))).toBe(true);
	});

	it('rejects setup file paths that escape the workspace root', async () => {
		const runInSandbox: RunInSandboxMock =
			vi.fn<
				(
					...args: [SandboxWorkspace, string, string?]
				) => Promise<{ exitCode: number; stdout: string; stderr: string }>
			>();
		runInSandbox.mockImplementation(async (_workspace, command) => {
			await Promise.resolve();
			if (command.startsWith('cat ')) {
				return { exitCode: 1, stdout: '', stderr: '' };
			}
			return { exitCode: 0, stdout: '/home/daytona\n', stderr: '' };
		});
		const readFileViaSandbox: ReadFileViaSandboxMock =
			vi.fn<(...args: [SandboxWorkspace, string]) => Promise<string | null>>();
		readFileViaSandbox.mockResolvedValue(null);
		const setupSandboxWorkspace = loadSetupSandboxWorkspaceWithFsMocks(
			runInSandbox,
			readFileViaSandbox,
		);
		const writeFile = vi.fn<
			(...args: [string, string | Buffer, { recursive?: boolean }?]) => Promise<void>
		>(async () => {});
		const context = createSetupContext();
		const workflowService = context.workflowService as unknown as {
			list: Mock<(...args: [{ limit: number }]) => Promise<Array<{ id: string }>>>;
			get: Mock<(...args: [string]) => Promise<Record<string, unknown>>>;
		};
		workflowService.list.mockResolvedValue([{ id: '../escape' }]);
		workflowService.get.mockResolvedValue({ id: '../escape' });

		await expect(
			setupSandboxWorkspace(createFilesystemWorkspace(writeFile), context),
		).rejects.toThrow('Sandbox workspace setup failed during write-workspace-files');
	});

	it('does not write the initialized marker when npm install fails', async () => {
		const runInSandbox: RunInSandboxMock =
			vi.fn<
				(
					...args: [SandboxWorkspace, string, string?]
				) => Promise<{ exitCode: number; stdout: string; stderr: string }>
			>();
		runInSandbox.mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'install failed' });
		const readFileViaSandbox: ReadFileViaSandboxMock =
			vi.fn<(...args: [SandboxWorkspace, string]) => Promise<string | null>>();
		readFileViaSandbox.mockResolvedValue(null);
		const setupSandboxWorkspace = loadSetupSandboxWorkspaceWithFsMocks(
			runInSandbox,
			readFileViaSandbox,
		);
		const writeFile = vi.fn<
			(...args: [string, string | Buffer, { recursive?: boolean }?]) => Promise<void>
		>(async () => {});

		await expect(
			setupSandboxWorkspace(createFilesystemWorkspace(writeFile), createSetupContext()),
		).rejects.toThrow('Sandbox npm install failed');

		expect(writeFile.mock.calls).not.toContainEqual([
			'/home/daytona/workspace/.sandbox-initialized',
			expect.any(String),
			{ recursive: true },
		]);
	});

	it('uses command fallback when a filesystem marker write fails', async () => {
		const runInSandbox: RunInSandboxMock =
			vi.fn<
				(
					...args: [SandboxWorkspace, string, string?]
				) => Promise<{ exitCode: number; stdout: string; stderr: string }>
			>();
		runInSandbox.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
		const readFileViaSandbox: ReadFileViaSandboxMock =
			vi.fn<(...args: [SandboxWorkspace, string]) => Promise<string | null>>();
		readFileViaSandbox.mockResolvedValue(null);
		const setupSandboxWorkspace = loadSetupSandboxWorkspaceWithFsMocks(
			runInSandbox,
			readFileViaSandbox,
		);
		const writeFile = vi
			.fn<(...args: [string, string | Buffer, { recursive?: boolean }?]) => Promise<void>>()
			.mockImplementation(async (path) => {
				await Promise.resolve();
				if (path === '/home/daytona/workspace/.sandbox-initialized') {
					throw new Error('primary write failed');
				}
			});

		await expect(
			setupSandboxWorkspace(createFilesystemWorkspace(writeFile), createSetupContext()),
		).resolves.toBe(true);

		expect(
			runInSandbox.mock.calls.some(([, command]) => command.includes('.sandbox-initialized')),
		).toBe(true);
	});

	it('includes the failing setup step when marker fallback fails', async () => {
		const runInSandbox: RunInSandboxMock =
			vi.fn<
				(
					...args: [SandboxWorkspace, string, string?]
				) => Promise<{ exitCode: number; stdout: string; stderr: string }>
			>();
		runInSandbox.mockImplementation(async (_workspace, command) => {
			await Promise.resolve();
			return command.includes('.sandbox-initialized')
				? { exitCode: 1, stdout: '', stderr: 'fallback failed' }
				: { exitCode: 0, stdout: '', stderr: '' };
		});
		const readFileViaSandbox: ReadFileViaSandboxMock =
			vi.fn<(...args: [SandboxWorkspace, string]) => Promise<string | null>>();
		readFileViaSandbox.mockResolvedValue(null);
		const setupSandboxWorkspace = loadSetupSandboxWorkspaceWithFsMocks(
			runInSandbox,
			readFileViaSandbox,
		);
		const writeFile = vi
			.fn<(...args: [string, string | Buffer, { recursive?: boolean }?]) => Promise<void>>()
			.mockImplementation(async (path) => {
				await Promise.resolve();
				if (path === '/home/daytona/workspace/.sandbox-initialized') {
					throw new Error('primary write failed');
				}
			});
		const workspace = createFilesystemWorkspace(writeFile);
		const executeCommand = workspace.sandbox?.executeCommand;
		if (!executeCommand) throw new Error('Expected test workspace to include a sandbox');
		vi.mocked(executeCommand).mockImplementation(async (command: string) => {
			await Promise.resolve();
			return command.includes('.sandbox-initialized')
				? { exitCode: 1, stdout: '', stderr: 'fallback failed' }
				: mockDaytonaExecuteCommand(command);
		});

		await expect(setupSandboxWorkspace(workspace, createSetupContext())).rejects.toThrow(
			/Sandbox workspace setup failed during write-initialization-marker[\s\S]*primary write failed[\s\S]*command fallback failed/,
		);
	});

	it('retries packing the workspace SDK after a null pack result', async () => {
		const tarball = Buffer.from('sdk');
		const packWorkspaceSdk = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({
			filename: 'workflow-sdk.tgz',
			tarball,
			version: '1.0.0',
			sdkPath: '/host/sdk',
		});
		const runInSandbox: RunInSandboxMock =
			vi.fn<
				(
					...args: [SandboxWorkspace, string, string?]
				) => Promise<{ exitCode: number; stdout: string; stderr: string }>
			>();
		runInSandbox.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
		const linkWorkspaceSdkIfEnabled = await loadLinkWorkspaceSdkWithMocks(
			packWorkspaceSdk,
			runInSandbox,
		);
		const writeFile = vi.fn<(...args: [string, Buffer, { recursive?: boolean }?]) => Promise<void>>(
			async () => {},
		);
		const workspace = {
			filesystem: {
				provider: 'daytona',
				writeFile,
			},
			sandbox: {
				executeCommand: vi.fn().mockResolvedValue({
					exitCode: 0,
					stdout: '',
					stderr: '',
				}),
			},
		} as unknown as SandboxWorkspace;

		const logger = { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() };
		await expect(linkWorkspaceSdkIfEnabled(workspace, '/workspace', logger)).rejects.toThrow(
			'workspace SDK could not be packed',
		);
		await linkWorkspaceSdkIfEnabled(workspace, '/workspace', logger);

		expect(packWorkspaceSdk).toHaveBeenCalledTimes(2);
		expect(writeFile).toHaveBeenCalledWith('/workspace/workflow-sdk.tgz', tarball, {
			recursive: true,
		});
	});
});
describe('formatNodeCatalogLine', () => {
	let formatNodeCatalogLine: FormatNodeCatalogLine;

	beforeAll(async () => {
		vi.doUnmock('../sandbox-fs');
		packWorkspaceSdkMockState.isEnabled = false;
		packWorkspaceSdkMockState.packWorkspaceSdk.mockReset();
		vi.resetModules();
		({ formatNodeCatalogLine } = await import('../sandbox-setup'));
	});

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
