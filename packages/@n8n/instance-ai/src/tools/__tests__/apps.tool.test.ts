import type { Mock } from 'vitest';
import type { z } from 'zod';

import { executeTool } from '../../__tests__/tool-test-utils';
import type { InstanceAiAppService, InstanceAiContext } from '../../types';
import {
	buildCheckScript,
	createAppsTool,
	handleBuild,
	jsonSchemaToTs,
	renderBindingsTypes,
	slugifyNamespace,
	tailLog,
} from '../apps.tool';

vi.mock('@n8n/agents/sandbox', () => ({
	getWorkspaceRoot: vi.fn(async () => await Promise.resolve('/home/daytona/workspace')),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

const APP = {
	id: 'app-1',
	name: 'Greeter',
	namespace: 'greeter',
	projectId: 'proj-1',
	createdAt: '2024-01-01T00:00:00.000Z',
};

const BUILD_PREFIX = 'ulimit -c 0; export PATH="$PWD/node_modules/.bin:$PATH";';

const SOURCE_TARBALL = Buffer.from([0x1f, 0x8b, 0x08, 0x00]);
const SDK_TARBALL = Buffer.from([0x1f, 0x8b, 0x08, 0x01]);

const SUBMIT_BINDING = {
	key: 'submit',
	kind: 'workflow' as const,
	workflowId: 'wf-1',
	name: 'Echo',
	published: true,
	input: {
		type: 'object' as const,
		properties: { message: { type: ['string', 'null'] as Array<'string' | 'null'> } },
		additionalProperties: false,
	},
	output: {
		type: 'array' as const,
		items: {
			type: 'object' as const,
			properties: { reply: { type: 'string' as const } },
			required: ['reply'],
		},
	},
	outputSource: {
		kind: 'execution' as const,
		executionId: '42',
		at: '2026-09-09T10:00:01.000Z',
	},
};
const NOTIFY_BINDING = {
	key: 'notify',
	kind: 'workflow' as const,
	workflowId: 'wf-2',
	name: 'Notify',
	published: false,
	input: { type: 'object' as const, additionalProperties: true },
	output: {
		type: 'array' as const,
		items: { type: 'object' as const, additionalProperties: true },
	},
	outputSource: { kind: 'unknown' as const },
};
const STORED_BINDINGS = [
	{ key: 'submit', kind: 'workflow' as const, workflowId: 'wf-1' },
	{ key: 'notify', kind: 'workflow' as const, workflowId: 'wf-2' },
];
const TASKS_COLUMNS = [
	{ name: 'title', type: 'string' as const },
	{ name: 'priority', type: 'number' as const },
	{ name: 'done', type: 'boolean' as const },
	{ name: 'due', type: 'date' as const },
];
// The row schema the apps service emits for these columns.
const TASKS_BINDING = {
	key: 'tasks',
	kind: 'dataTable' as const,
	dataTableId: 'dt-1',
	name: 'Tasks',
	permissions: ['read' as const, 'write' as const],
	columns: TASKS_COLUMNS,
	row: {
		type: 'object' as const,
		properties: {
			id: { type: 'number' as const },
			createdAt: { type: 'string' as const, format: 'date-time' },
			updatedAt: { type: 'string' as const, format: 'date-time' },
			title: { type: ['string', 'null'] as Array<'string' | 'null'> },
			priority: { type: ['number', 'null'] as Array<'number' | 'null'> },
			done: { type: ['boolean', 'null'] as Array<'boolean' | 'null'> },
			due: { type: ['string', 'null'] as Array<'string' | 'null'>, format: 'date-time' },
		},
		required: ['id', 'createdAt', 'updatedAt', 'title', 'priority', 'done', 'due'],
		additionalProperties: false,
	},
};
const MISSING_BINDING = {
	key: 'gone',
	kind: 'dataTable' as const,
	name: 'gone',
	missing: true as const,
};
const STORED_TASKS_BINDING = {
	key: 'tasks',
	kind: 'dataTable' as const,
	dataTableId: 'dt-1',
	permissions: ['read', 'write'],
};
const TYPES_PATH = 'apps/greeter/src/n8n-bindings.d.ts';

const ok = (stdout = '') => ({ exitCode: 0, stdout, stderr: '' });
const fail = (stdout: string, exitCode = 1) => ({ exitCode, stdout, stderr: '' });

function createMockContext(overrides: Partial<InstanceAiContext> = {}): InstanceAiContext {
	const appService: InstanceAiAppService = {
		create: vi.fn().mockResolvedValue({ app: APP }),
		get: vi.fn().mockResolvedValue(APP),
		getSourceTarball: vi.fn().mockResolvedValue({ versionId: 'v-1', data: SOURCE_TARBALL }),
		storeVersion: vi
			.fn()
			.mockResolvedValue({ versionId: 'v-1', url: 'http://localhost:5678/apps/greeter/' }),
		setBindings: vi.fn().mockResolvedValue({ bindings: [], warnings: [] }),
		previewBindings: vi.fn().mockResolvedValue({ bindings: [], warnings: [] }),
		getBindings: vi.fn().mockResolvedValue({ bindings: [], warnings: [], stored: [] }),
		getSdkTarball: vi.fn().mockResolvedValue({ filename: 'n8n-app-sdk.tgz', data: SDK_TARBALL }),
		publish: vi
			.fn()
			.mockResolvedValue({ versionId: 'v-2', url: 'http://localhost:5678/apps/greeter/' }),
	};
	return {
		userId: 'user-1',
		workflowService: { get: vi.fn().mockResolvedValue({ name: 'Echo' }) },
		executionService: {},
		nodeService: {},
		credentialService: {},
		dataTableService: {},
		appService,
		appWorkspace: {
			sandbox: { executeCommand: vi.fn().mockResolvedValue(ok()) },
			filesystem: {
				readFile: vi.fn().mockResolvedValue(Buffer.from([0x1f, 0x8b])),
				writeFile: vi.fn().mockResolvedValue(undefined),
			},
		},
		workspaceRoot: '/home/daytona/workspace',
		logger: { warn: vi.fn(), debug: vi.fn() },
		...overrides,
	} as unknown as InstanceAiContext;
}

function executeCommandMock(context: InstanceAiContext): Mock {
	return (context.appWorkspace as unknown as { sandbox: { executeCommand: Mock } }).sandbox
		.executeCommand;
}

function readFileMock(context: InstanceAiContext): Mock {
	return (context.appWorkspace as unknown as { filesystem: { readFile: Mock } }).filesystem
		.readFile;
}

function writeFileMock(context: InstanceAiContext): Mock {
	return (context.appWorkspace as unknown as { filesystem: { writeFile: Mock } }).filesystem
		.writeFile;
}

function commandsRun(context: InstanceAiContext): string[] {
	return executeCommandMock(context).mock.calls.map((call: unknown[]) => String(call[0]));
}

function inputSchema(tool: unknown): z.ZodTypeAny {
	return (tool as { inputSchema: z.ZodTypeAny }).inputSchema;
}

/** `build` is no tool action any more; n8n's publish pipeline calls `handleBuild` directly. */
async function runBuild(
	context: InstanceAiContext,
	input: { command?: string; outDir?: string } = {},
	abortSignal?: AbortSignal,
) {
	const result: unknown = await handleBuild(
		context,
		{ action: 'build', appId: 'app-1', ...input },
		abortSignal,
	);
	return result as Record<string, unknown>;
}

function suspendCtx(suspendFn: Mock) {
	return { resumeData: undefined, suspend: suspendFn } as never;
}

function resumeCtx(approved: boolean, scope?: 'once' | 'session') {
	return { resumeData: { approved, ...(scope ? { scope } : {}) } } as never;
}

async function runPublish(context: InstanceAiContext, ctx: unknown) {
	const tool = createAppsTool(context);
	const parsed: unknown = inputSchema(tool).parse({ action: 'publish', appId: 'app-1' });
	return await executeTool<Record<string, unknown>>(tool, parsed, ctx);
}

async function runRestore(context: InstanceAiContext) {
	const tool = createAppsTool(context);
	const parsed: unknown = inputSchema(tool).parse({ action: 'restore', appId: 'app-1' });
	return await executeTool<Record<string, unknown>>(tool, parsed);
}

function mockEmptyAppDir(context: InstanceAiContext) {
	executeCommandMock(context).mockImplementation(
		async (command: string) => await Promise.resolve(command.startsWith('[ -d ') ? fail('') : ok()),
	);
}

async function runAction(
	context: InstanceAiContext,
	input: Record<string, unknown>,
	toolContext: unknown = {},
) {
	const tool = createAppsTool(context);
	const parsed: unknown = inputSchema(tool).parse({ appId: 'app-1', ...input });
	return await executeTool<Record<string, unknown>>(tool, parsed, toolContext);
}

/** The second call of an approval flow: the user already answered the card. */
const approved = { resumeData: { approved: true } };

function appServiceMock(context: InstanceAiContext, method: keyof InstanceAiAppService): Mock {
	return (context.appService as unknown as Record<string, Mock>)[method];
}

async function runCreate(context: InstanceAiContext, input: Record<string, unknown> = {}) {
	const tool = createAppsTool(context);
	const parsed: unknown = inputSchema(tool).parse({
		action: 'create',
		projectId: 'proj-1',
		name: 'Greeter',
		...input,
	});
	return await executeTool<Record<string, unknown>>(tool, parsed);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('apps tool', () => {
	describe('input schema', () => {
		it('rejects an unknown action', () => {
			const tool = createAppsTool(createMockContext());
			expect(inputSchema(tool).safeParse({ action: 'deploy', appId: 'app-1' }).success).toBe(false);
		});

		it('rejects a namespace that is not a URL slug', () => {
			const tool = createAppsTool(createMockContext());
			const parsed = inputSchema(tool).safeParse({
				action: 'create',
				projectId: 'p',
				name: 'X',
				namespace: '../etc',
			});
			expect(parsed.success).toBe(false);
		});

		it('rejects the build action: publishing goes through publish', () => {
			const tool = createAppsTool(createMockContext());
			expect(inputSchema(tool).safeParse({ action: 'build', appId: 'app-1' }).success).toBe(false);
			expect(inputSchema(tool).safeParse({ action: 'publish', appId: 'app-1' }).success).toBe(true);
		});

		it('points the agent at the app-builder skill', () => {
			const tool = createAppsTool(createMockContext());
			expect(tool.description).toContain('app-builder');
			expect(tool.description).toContain('load_skill');
		});
	});

	describe('slugifyNamespace', () => {
		it('turns a display name into a URL slug', () => {
			expect(slugifyNamespace('My Greeter App!')).toBe('my-greeter-app');
			expect(slugifyNamespace('  Café  Bar ')).toBe('cafe-bar');
			expect(slugifyNamespace('###')).toBe('');
		});
	});

	describe('tailLog', () => {
		it('keeps the last bytes only', () => {
			expect(tailLog('abcdef', 3)).toBe('def');
			expect(tailLog('ab', 3)).toBe('ab');
		});
	});

	describe('create', () => {
		it('slugifies the name, registers the app, copies the template and returns the workspace path', async () => {
			const context = createMockContext();
			const result = await runCreate(context);

			expect(context.appService?.create).toHaveBeenCalledWith({
				projectId: 'proj-1',
				name: 'Greeter',
				namespace: 'greeter',
			});
			const commands = commandsRun(context);
			expect(commands[0]).toBe("mkdir -p '/home/daytona/workspace/apps/greeter'");
			expect(commands[1]).toContain(
				"cp -r '/home/daytona/workspace/skills/app-builder/templates/vue/.' '/home/daytona/workspace/apps/greeter/'",
			);
			expect(commands[1]).toContain('mv gitignore .gitignore');
			expect(commands[1]).toContain("'greeter'");
			expect(commands[2]).toContain(
				"[ -d '/home/daytona/workspace/skills/app-builder/component-registry/button' ]",
			);
			expect(commands[2]).toContain(
				"cp -r '/home/daytona/workspace/skills/app-builder/component-registry/button/.' '/home/daytona/workspace/apps/greeter/src/components/ui/button/'",
			);
			expect(commands[2]).toContain(
				"cp -r '/home/daytona/workspace/skills/app-builder/component-registry/switch/.' '/home/daytona/workspace/apps/greeter/src/components/ui/switch/'",
			);
			expect(commands[3]).toContain(
				"[ -f .gitignore ] || printf 'node_modules\\ndist\\n' > .gitignore",
			);
			expect(commands[3]).toContain('git init');
			expect(commands[3]).toContain('commit -qm scaffold --allow-empty');
			expect(result).toEqual({
				app: APP,
				workspacePath: '/home/daytona/workspace/apps/greeter',
				installed: true,
			});
		});

		it('installs the dependencies after the scaffold so the live preview can start', async () => {
			const context = createMockContext();
			await runCreate(context);

			const calls = executeCommandMock(context).mock.calls as Array<
				[string, string[], { cwd: string; env?: Record<string, string>; timeout?: number }]
			>;
			expect(calls[4][0]).toBe(
				'ulimit -c 0; if [ -f package.json ]; then npm install --ignore-scripts --no-audit --no-fund --prefer-offline; else exit 99; fi',
			);
			expect(calls[4][2]).toMatchObject({
				cwd: '/home/daytona/workspace/apps/greeter',
				env: { CI: 'true' },
				timeout: 600_000,
			});
		});

		it('returns the created app with a warning when the install fails', async () => {
			const context = createMockContext();
			executeCommandMock(context).mockImplementation(
				async (command: string) =>
					await Promise.resolve(
						command.includes('npm install') ? fail('npm ERR! code E404 left-pad') : ok(),
					),
			);

			const result = await runCreate(context);

			expect(result).toEqual({
				app: APP,
				workspacePath: '/home/daytona/workspace/apps/greeter',
				installed: false,
				warnings: [expect.stringMatching(/npm install failed.*run `npm install`.*E404 left-pad/)],
			});
		});

		it('writes the SDK tarball into vendor/ and an empty bindings augmentation before the scaffold commit', async () => {
			const context = createMockContext();
			const order: string[] = [];
			executeCommandMock(context).mockImplementation(async (command: string) => {
				order.push(command.includes('git init') ? 'git' : 'shell');
				return await Promise.resolve(ok());
			});
			writeFileMock(context).mockImplementation(async (path: string) => {
				order.push(path);
				await Promise.resolve();
			});

			await runCreate(context);

			expect(writeFileMock(context)).toHaveBeenCalledWith(
				'apps/greeter/vendor/n8n-app-sdk.tgz',
				SDK_TARBALL,
				expect.objectContaining({ recursive: true }),
			);
			expect(writeFileMock(context)).toHaveBeenCalledWith(
				TYPES_PATH,
				renderBindingsTypes([]),
				expect.objectContaining({ recursive: true }),
			);
			expect(order).toEqual([
				'shell',
				'shell',
				'shell',
				'apps/greeter/vendor/n8n-app-sdk.tgz',
				TYPES_PATH,
				'git',
				'shell',
			]);
		});

		it('uses the given namespace and skips the template when asked', async () => {
			const context = createMockContext();
			await runCreate(context, { namespace: 'hello', template: 'none' });

			expect(context.appService?.create).toHaveBeenCalledWith(
				expect.objectContaining({ namespace: 'hello' }),
			);
			expect(commandsRun(context).some((command) => command.includes('cp -r'))).toBe(false);
			expect(commandsRun(context).some((command) => command.includes('npm install'))).toBe(false);
		});

		it('returns denied on a namespace conflict without touching the workspace', async () => {
			const context = createMockContext();
			(context.appService?.create as Mock).mockResolvedValue({ conflict: true });

			const result = await runCreate(context);

			expect(result).toEqual({
				denied: true,
				reason: 'Namespace "greeter" is taken. Choose another.',
			});
			expect(executeCommandMock(context)).not.toHaveBeenCalled();
		});

		it('returns denied when the thread already builds an app', async () => {
			const context = createMockContext({ getAppId: () => 'app-1' });

			const result = await runCreate(context);

			expect(result).toEqual({
				denied: true,
				reason:
					'This thread builds app "Greeter" (id app-1). Start a new thread to build another app.',
			});
			expect(context.appService?.create).not.toHaveBeenCalled();
			expect(executeCommandMock(context)).not.toHaveBeenCalled();
		});

		it('warns instead of failing when git is unavailable', async () => {
			const context = createMockContext();
			executeCommandMock(context).mockImplementation(
				async (command: string) =>
					await Promise.resolve(
						command.includes('git init') ? fail('sh: git: not found', 127) : ok(),
					),
			);

			const result = await runCreate(context);

			expect(result).toMatchObject({
				app: APP,
				installed: true,
				warnings: [expect.stringContaining('git is unavailable')],
			});
		});

		it('names the registered app when scaffolding fails after create', async () => {
			const context = createMockContext();
			executeCommandMock(context)
				.mockResolvedValueOnce(ok())
				.mockResolvedValueOnce(fail('cp: cannot stat template'));

			await expect(runCreate(context)).rejects.toThrow(
				/id app-1, namespace "greeter".*cp: cannot stat template.*\/home\/daytona\/workspace\/apps\/greeter.*app id app-1/,
			);
			expect(context.appService?.create).toHaveBeenCalledTimes(1);
		});

		it('forwards the run abort signal to every sandbox command', async () => {
			const context = createMockContext();
			const abortSignal = new AbortController().signal;
			const tool = createAppsTool(context);
			const parsed: unknown = inputSchema(tool).parse({
				action: 'create',
				projectId: 'proj-1',
				name: 'Greeter',
			});

			await executeTool(tool, parsed, { abortSignal });

			const calls = executeCommandMock(context).mock.calls as Array<
				[string, string[], { abortSignal?: AbortSignal }]
			>;
			expect(calls).toHaveLength(5);
			for (const call of calls) expect(call[2].abortSignal).toBe(abortSignal);
		});
	});

	describe('publish', () => {
		it('suspends for confirmation first, naming the app and its URL', async () => {
			const context = createMockContext();
			const suspendFn = vi.fn();

			await runPublish(context, suspendCtx(suspendFn));

			expect(suspendFn).toHaveBeenCalledWith({
				requestId: expect.any(String),
				message: 'Publish Greeter to /apps/greeter/',
				severity: 'info',
			});
			expect(context.appService?.publish).not.toHaveBeenCalled();
		});

		it('publishes through the app service once approved and returns the registry shape', async () => {
			const context = createMockContext();

			const result = await runPublish(context, resumeCtx(true));

			expect(context.appService?.publish).toHaveBeenCalledWith('app-1');
			expect(result).toEqual({
				appId: 'app-1',
				name: 'Greeter',
				namespace: 'greeter',
				projectId: 'proj-1',
				versionId: 'v-2',
				url: 'http://localhost:5678/apps/greeter/',
			});
		});

		it('returns denied when the user declines', async () => {
			const context = createMockContext();

			const result = await runPublish(context, resumeCtx(false));

			expect(result).toEqual({ denied: true, reason: 'user_declined' });
			expect(context.appService?.publish).not.toHaveBeenCalled();
		});

		it('skips the confirmation when the thread granted always allow, and records a new grant', async () => {
			const granted = createMockContext({ sessionApprovedToolKeys: new Set(['apps:publish']) });
			const suspendFn = vi.fn();

			await runPublish(granted, suspendCtx(suspendFn));
			expect(suspendFn).not.toHaveBeenCalled();
			expect(granted.appService?.publish).toHaveBeenCalledWith('app-1');

			const grantSessionToolApproval = vi.fn().mockResolvedValue(undefined);
			const context = createMockContext({ grantSessionToolApproval });
			await runPublish(context, resumeCtx(true, 'session'));
			expect(grantSessionToolApproval).toHaveBeenCalledWith('apps:publish');
		});

		it('passes a publish failure through unchanged', async () => {
			const context = createMockContext();
			const failure = { error: true, stage: 'build', message: 'vite failed', log: 'boom' };
			(context.appService?.publish as Mock).mockResolvedValue(failure);

			await expect(runPublish(context, resumeCtx(true))).resolves.toEqual(failure);
		});
	});

	describe('handleBuild', () => {
		it('applies the default command and outDir', async () => {
			const context = createMockContext();
			await runBuild(context);
			expect(commandsRun(context)[1]).toBe(`${BUILD_PREFIX} npm run build`);
			expect(commandsRun(context)[2]).toContain("'dist/index.html'");
		});

		it('runs install, build and check, stores both tarballs and returns the url', async () => {
			const context = createMockContext();
			readFileMock(context)
				.mockResolvedValueOnce(Buffer.from('src'))
				.mockResolvedValueOnce(Buffer.from('dist'));

			const result = await runBuild(context);

			const calls = executeCommandMock(context).mock.calls as Array<
				[string, string[], { cwd: string; env?: Record<string, string>; timeout?: number }]
			>;
			expect(calls[0][0]).toMatch(
				/^ulimit -c 0; if \[ -f package.json \] && \[ ! -d node_modules \]/,
			);
			expect(calls[0][0]).toContain('npm install');
			expect(calls[1][0]).toBe(`${BUILD_PREFIX} npm run build`);
			expect(calls[1][2]).toEqual({
				cwd: '/home/daytona/workspace/apps/greeter',
				env: { APP_BASE: '/apps/greeter/', CI: 'true' },
				timeout: 600_000,
			});
			expect(calls[2][0]).toContain('APP_CHECK_FAIL');
			expect(calls[3][0]).toMatch(/^rm -f /);

			const readPaths = readFileMock(context).mock.calls.map((call: unknown[]) => call[0]);
			expect(readPaths).toEqual([
				expect.stringMatching(/^\.app-builds\/greeter-\d+-src\.tgz$/),
				expect.stringMatching(/^\.app-builds\/greeter-\d+-dist\.tgz$/),
			]);
			expect(context.appService?.storeVersion).toHaveBeenCalledWith('app-1', {
				source: Buffer.from('src'),
				dist: Buffer.from('dist'),
			});
			expect(result).toEqual({
				appId: 'app-1',
				name: 'Greeter',
				namespace: 'greeter',
				projectId: 'proj-1',
				versionId: 'v-1',
				url: 'http://localhost:5678/apps/greeter/',
				warnings: [],
			});
		});

		it('passes a custom command and outDir through', async () => {
			const context = createMockContext();
			await runBuild(context, { command: 'npx vite build', outDir: 'out/' });

			const commands = commandsRun(context);
			expect(commands[1]).toBe(`${BUILD_PREFIX} npx vite build`);
			expect(commands[2]).toContain("'out/index.html'");
		});

		it.each(['../other-app', 'dist/../../other-app', '/etc', '.', '..', ''])(
			'returns denied for outDir %j without running any command',
			async (outDir) => {
				const context = createMockContext();

				const result = await runBuild(context, { outDir });

				expect(result).toEqual({
					denied: true,
					reason: expect.stringContaining('outDir'),
				});
				expect(executeCommandMock(context)).not.toHaveBeenCalled();
				expect(context.appService?.storeVersion).not.toHaveBeenCalled();
			},
		);

		it('normalizes a nested outDir before using it in the check script', async () => {
			const context = createMockContext();
			await runBuild(context, { outDir: './out/./public//' });

			expect(commandsRun(context)[2]).toContain("'out/public/index.html'");
		});

		it('puts node_modules/.bin on PATH and disables core dumps without altering the command', async () => {
			const context = createMockContext();
			const command = 'vite build --mode "my mode" && echo \'done\'';
			await runBuild(context, { command });

			expect(commandsRun(context)[1]).toBe(
				`ulimit -c 0; export PATH="$PWD/node_modules/.bin:$PATH"; ${command}`,
			);
		});

		it('reports the install stage when npm install fails', async () => {
			const context = createMockContext();
			executeCommandMock(context).mockResolvedValueOnce(fail('npm ERR! 404 Not Found'));

			const result = await runBuild(context);

			expect(result).toEqual({
				error: true,
				stage: 'install',
				message: 'npm install failed.',
				log: 'npm ERR! 404 Not Found',
			});
			expect(context.appService?.storeVersion).not.toHaveBeenCalled();
		});

		it('reports the build stage with the tail of the log on a non-zero exit', async () => {
			const context = createMockContext();
			const log = `${'x'.repeat(5000)}\nsrc/App.vue:3 error TS2304`;
			executeCommandMock(context).mockResolvedValueOnce(ok()).mockResolvedValueOnce(fail(log, 2));

			const result = await runBuild(context);

			expect(result).toMatchObject({
				error: true,
				stage: 'build',
				message: expect.stringContaining('exited with code 2'),
			});
			const tail = (result as { log: string }).log;
			expect(tail).toHaveLength(4096);
			expect(tail.endsWith('error TS2304')).toBe(true);
		});

		it('reports the check stage with the marker line when index.html is missing', async () => {
			const context = createMockContext();
			executeCommandMock(context)
				.mockResolvedValueOnce(ok())
				.mockResolvedValueOnce(ok('built'))
				.mockResolvedValueOnce(
					fail('APP_CHECK_FAIL: dist/index.html not found. The build must write a static site.'),
				);

			const result = await runBuild(context);

			expect(result).toEqual({
				error: true,
				stage: 'check',
				message: 'dist/index.html not found. The build must write a static site.',
				log: 'APP_CHECK_FAIL: dist/index.html not found. The build must write a static site.',
			});
			expect(commandsRun(context)[3]).toMatch(/^rm -f /);
			expect(readFileMock(context)).not.toHaveBeenCalled();
		});

		it('reports the check stage when a tarball exceeds the size cap', async () => {
			const context = createMockContext();
			executeCommandMock(context)
				.mockResolvedValueOnce(ok())
				.mockResolvedValueOnce(ok())
				.mockResolvedValueOnce(
					fail(
						'APP_CHECK_FAIL: build output is 30000000 bytes compressed; the limit is 20971520. Remove large assets from dist.',
					),
				);

			const result = await runBuild(context);

			expect(result).toMatchObject({
				stage: 'check',
				message: expect.stringContaining('30000000 bytes'),
			});
		});

		it('reports the store stage when the read-out is not binary', async () => {
			const context = createMockContext();
			readFileMock(context).mockResolvedValue('not a buffer');

			const result = await runBuild(context);

			expect(result).toMatchObject({
				error: true,
				stage: 'store',
				message: expect.stringContaining('binary'),
			});
			expect(commandsRun(context).at(-1)).toMatch(/^rm -f /);
		});

		it('reports the store stage when the service rejects the version', async () => {
			const context = createMockContext();
			(context.appService?.storeVersion as Mock).mockRejectedValue(
				new Error('Invalid dist tarball: not a gzip file'),
			);

			const result = await runBuild(context);

			expect(result).toEqual({
				error: true,
				stage: 'store',
				message: 'Invalid dist tarball: not a gzip file',
				log: '',
			});
		});

		it('fails when the run has no sandbox', async () => {
			const context = createMockContext({ appWorkspace: undefined });
			await expect(runBuild(context)).rejects.toThrow('sandbox workspace');
		});

		it('forwards the run abort signal to every sandbox command and tarball read', async () => {
			const context = createMockContext();
			const abortSignal = new AbortController().signal;

			await runBuild(context, {}, abortSignal);

			const commandCalls = executeCommandMock(context).mock.calls as Array<
				[string, string[], { abortSignal?: AbortSignal }]
			>;
			expect(commandCalls).toHaveLength(4);
			for (const call of commandCalls) expect(call[2].abortSignal).toBe(abortSignal);

			const readCalls = readFileMock(context).mock.calls as Array<
				[string, { abortSignal?: AbortSignal }]
			>;
			expect(readCalls).toHaveLength(2);
			for (const call of readCalls) expect(call[1].abortSignal).toBe(abortSignal);
		});
	});

	describe('restore', () => {
		it('writes the stored source tarball into the sandbox, unpacks it into apps/<namespace> and inits git', async () => {
			const context = createMockContext();
			mockEmptyAppDir(context);

			const result = await runRestore(context);

			expect(context.appService?.getSourceTarball).toHaveBeenCalledWith('app-1');
			const writeCalls = writeFileMock(context).mock.calls as Array<[string, Buffer, unknown]>;
			expect(writeCalls).toHaveLength(2);
			expect(writeCalls[0][0]).toMatch(/^\.app-builds\/greeter-\d+-restore\.tgz$/);
			expect(Buffer.isBuffer(writeCalls[0][1])).toBe(true);
			expect(writeCalls[0][1]).toEqual(SOURCE_TARBALL);

			const commands = commandsRun(context);
			expect(commands[0]).toBe(
				"[ -d '/home/daytona/workspace/apps/greeter' ] && [ -n \"$(cd '/home/daytona/workspace/apps/greeter' && find . -type f ! -path './src/n8n-bindings.d.ts')\" ]",
			);
			expect(commands[1]).toBe("mkdir -p '/home/daytona/workspace/.app-builds'");
			expect(commands[2]).toMatch(
				/^mkdir -p '\/home\/daytona\/workspace\/apps\/greeter' && tar -xzf '\/home\/daytona\/workspace\/\.app-builds\/greeter-\d+-restore\.tgz' -C '\/home\/daytona\/workspace\/apps\/greeter'$/,
			);
			expect(commands[3]).toContain('git init');
			expect(commands[3]).toContain('commit -qm restore --allow-empty');
			expect(commands[4]).toBe(
				'ulimit -c 0; if [ -f package.json ]; then npm install --ignore-scripts --no-audit --no-fund --prefer-offline; else exit 99; fi',
			);
			expect(commands[5]).toMatch(
				/^rm -f '\/home\/daytona\/workspace\/\.app-builds\/greeter-\d+-restore\.tgz'$/,
			);
			expect(result).toEqual({
				appId: 'app-1',
				name: 'Greeter',
				namespace: 'greeter',
				projectId: 'proj-1',
				versionId: 'v-1',
				scaffolded: false,
				workspacePath: '/home/daytona/workspace/apps/greeter',
				installed: true,
				warnings: [],
			});
		});

		it('rewrites the binding types from the current bindings after unpacking, but not the SDK tarball', async () => {
			const context = createMockContext();
			mockEmptyAppDir(context);
			appServiceMock(context, 'getBindings').mockResolvedValue({
				bindings: [SUBMIT_BINDING],
				warnings: ['Binding submit: not published'],
				stored: STORED_BINDINGS.slice(0, 1),
			});
			const order: string[] = [];
			executeCommandMock(context).mockImplementation(async (command: string) => {
				order.push(
					command.startsWith('[ -d ') ? 'check' : command.includes('git init') ? 'git' : 'shell',
				);
				return await Promise.resolve(command.startsWith('[ -d ') ? fail('') : ok());
			});
			writeFileMock(context).mockImplementation(async (path: string) => {
				order.push(path);
				await Promise.resolve();
			});

			const result = await runRestore(context);

			expect(writeFileMock(context)).not.toHaveBeenCalledWith(
				'apps/greeter/vendor/n8n-app-sdk.tgz',
				expect.anything(),
				expect.anything(),
			);
			expect(writeFileMock(context)).toHaveBeenCalledWith(
				TYPES_PATH,
				renderBindingsTypes([SUBMIT_BINDING]),
				expect.objectContaining({ recursive: true }),
			);
			expect(order).toEqual([
				'check',
				'shell',
				expect.stringMatching(/restore\.tgz$/),
				'shell',
				TYPES_PATH,
				'git',
				'shell',
				'shell',
			]);
			expect(result).toMatchObject({ warnings: ['Binding submit: not published'] });
		});

		it('restores with a warning when the install fails, and without one when there is no package.json', async () => {
			const context = createMockContext();
			executeCommandMock(context).mockImplementation(async (command: string) => {
				if (command.startsWith('[ -d ')) return await Promise.resolve(fail(''));
				if (command.includes('npm install')) return await Promise.resolve(fail('npm ERR! E404'));
				return await Promise.resolve(ok());
			});

			expect(await runRestore(context)).toMatchObject({
				versionId: 'v-1',
				installed: false,
				warnings: [expect.stringMatching(/npm install failed.*E404/)],
			});

			executeCommandMock(context).mockImplementation(async (command: string) => {
				if (command.startsWith('[ -d ')) return await Promise.resolve(fail(''));
				if (command.includes('npm install')) return await Promise.resolve(fail('', 99));
				return await Promise.resolve(ok());
			});

			expect(await runRestore(context)).toMatchObject({ installed: false, warnings: [] });
		});

		it('lays down the starter template when the app has no stored source', async () => {
			const context = createMockContext();
			mockEmptyAppDir(context);
			(context.appService?.getSourceTarball as Mock).mockResolvedValue(null);
			appServiceMock(context, 'getBindings').mockResolvedValue({
				bindings: [SUBMIT_BINDING],
				warnings: ['Binding submit: not published'],
				stored: STORED_BINDINGS.slice(0, 1),
			});

			const result = await runRestore(context);

			const commands = commandsRun(context);
			expect(commands[1]).toBe("mkdir -p '/home/daytona/workspace/apps/greeter'");
			expect(commands[2]).toContain(
				"cp -r '/home/daytona/workspace/skills/app-builder/templates/vue/.' '/home/daytona/workspace/apps/greeter/'",
			);
			expect(commands[3]).toContain('component-registry/button');
			expect(commands[4]).toContain('commit -qm scaffold --allow-empty');
			expect(commands[5]).toContain('npm install');
			expect(commands.some((command) => command.includes('tar -xzf'))).toBe(false);
			expect(writeFileMock(context)).toHaveBeenCalledWith(
				'apps/greeter/vendor/n8n-app-sdk.tgz',
				SDK_TARBALL,
				expect.objectContaining({ recursive: true }),
			);
			expect(writeFileMock(context)).toHaveBeenCalledWith(
				TYPES_PATH,
				renderBindingsTypes([SUBMIT_BINDING]),
				expect.objectContaining({ recursive: true }),
			);
			expect(result).toEqual({
				appId: 'app-1',
				name: 'Greeter',
				namespace: 'greeter',
				projectId: 'proj-1',
				scaffolded: true,
				workspacePath: '/home/daytona/workspace/apps/greeter',
				installed: true,
				warnings: ['Binding submit: not published'],
			});
		});

		it('reports the restore stage when the template copy fails for an app without source', async () => {
			const context = createMockContext();
			(context.appService?.getSourceTarball as Mock).mockResolvedValue(null);
			executeCommandMock(context).mockImplementation(async (command: string) => {
				if (command.startsWith('[ -d ')) return await Promise.resolve(fail(''));
				if (command.includes('cp -r')) return await Promise.resolve(fail('cp: no such file'));
				return await Promise.resolve(ok());
			});

			const result = await runRestore(context);

			expect(result).toEqual({
				error: true,
				stage: 'restore',
				message: expect.stringContaining('cp: no such file'),
			});
		});

		it('returns denied when apps/<namespace> already has files', async () => {
			const context = createMockContext();

			const result = await runRestore(context);

			expect(result).toEqual({
				denied: true,
				reason: expect.stringContaining('/home/daytona/workspace/apps/greeter already exists'),
			});
			expect(context.appService?.getSourceTarball).not.toHaveBeenCalled();
			expect(writeFileMock(context)).not.toHaveBeenCalled();
		});

		it('reports the restore stage and removes the tarball when unpacking fails', async () => {
			const context = createMockContext();
			executeCommandMock(context).mockImplementation(async (command: string) => {
				if (command.startsWith('[ -d ')) return await Promise.resolve(fail(''));
				if (command.includes('tar -xzf'))
					return await Promise.resolve(fail('gzip: unexpected end'));
				return await Promise.resolve(ok());
			});

			const result = await runRestore(context);

			expect(result).toEqual({
				error: true,
				stage: 'restore',
				message: expect.stringContaining('gzip: unexpected end'),
			});
			expect(commandsRun(context).at(-1)).toMatch(/^rm -f /);
		});

		it('reports the restore stage when the sandbox write fails', async () => {
			const context = createMockContext();
			mockEmptyAppDir(context);
			writeFileMock(context).mockRejectedValue(new Error('upload failed'));

			const result = await runRestore(context);

			expect(result).toEqual({ error: true, stage: 'restore', message: 'upload failed' });
			expect(commandsRun(context).some((command) => command.includes('tar -xzf'))).toBe(false);
		});

		it('warns instead of failing when git is unavailable', async () => {
			const context = createMockContext();
			executeCommandMock(context).mockImplementation(async (command: string) => {
				if (command.startsWith('[ -d ')) return await Promise.resolve(fail(''));
				if (command.includes('git init'))
					return await Promise.resolve(fail('sh: git: not found', 127));
				return await Promise.resolve(ok());
			});

			const result = await runRestore(context);

			expect(result).toMatchObject({
				versionId: 'v-1',
				warnings: [expect.stringContaining('git is unavailable')],
			});
		});

		it('forwards the run abort signal to every sandbox command and the tarball write', async () => {
			const context = createMockContext();
			mockEmptyAppDir(context);
			const abortSignal = new AbortController().signal;
			const tool = createAppsTool(context);
			const parsed: unknown = inputSchema(tool).parse({ action: 'restore', appId: 'app-1' });

			await executeTool(tool, parsed, { abortSignal });

			const commandCalls = executeCommandMock(context).mock.calls as Array<
				[string, string[], { abortSignal?: AbortSignal }]
			>;
			expect(commandCalls).toHaveLength(6);
			for (const call of commandCalls) expect(call[2].abortSignal).toBe(abortSignal);

			const writeCalls = writeFileMock(context).mock.calls as Array<
				[string, Buffer, { abortSignal?: AbortSignal }]
			>;
			expect(writeCalls).toHaveLength(2);
			for (const call of writeCalls) expect(call[2].abortSignal).toBe(abortSignal);
		});
	});

	describe('add-component', () => {
		async function runAddComponent(context: InstanceAiContext, component = 'accordion') {
			const tool = createAppsTool(context);
			const parsed: unknown = inputSchema(tool).parse({
				action: 'add-component',
				appId: 'app-1',
				component,
			});
			return await executeTool<Record<string, unknown>>(tool, parsed);
		}

		it('rejects a component name that is not a lowercase slug', () => {
			const tool = createAppsTool(createMockContext());
			const parsed = inputSchema(tool).safeParse({
				action: 'add-component',
				appId: 'app-1',
				component: '../evil',
			});
			expect(parsed.success).toBe(false);
		});

		it('copies the component from the local catalog, no install step needed', async () => {
			const context = createMockContext();

			const result = await runAddComponent(context, 'alert-dialog');

			const commands = commandsRun(context);
			expect(commands[0]).toContain(
				"[ -d '/home/daytona/workspace/skills/app-builder/component-registry/alert-dialog' ]",
			);
			expect(commands[0]).toContain(
				"cp -r '/home/daytona/workspace/skills/app-builder/component-registry/alert-dialog/.' '/home/daytona/workspace/apps/greeter/src/components/ui/alert-dialog/'",
			);
			expect(commands).toHaveLength(1);
			expect(result).toEqual({ appId: 'app-1', component: 'alert-dialog' });
		});

		it('reports a failure when the component is not in the catalog', async () => {
			const context = createMockContext();
			executeCommandMock(context).mockResolvedValue(
				fail('not in the component catalog: accordion'),
			);

			const result = await runAddComponent(context);

			expect(result).toEqual({
				error: true,
				message: expect.stringContaining("not in this app-builder skill's component catalog"),
				log: expect.stringContaining('not in the component catalog: accordion'),
			});
			expect(commandsRun(context)).toHaveLength(1);
		});
	});

	describe('renderBindingsTypes', () => {
		it('renders the input the runtime validates and the observed output', () => {
			const types = renderBindingsTypes([
				{
					...SUBMIT_BINDING,
					// What zod-to-json-schema emits for one field of each trigger type.
					input: {
						type: 'object',
						properties: {
							text: { type: ['string', 'null'], description: 'text' },
							amount: { type: ['number', 'null'] },
							flag: { type: ['boolean', 'null'] },
							items: { anyOf: [{ type: 'array', items: {} }, { type: 'null' }] },
							meta: { anyOf: [{ type: 'object', additionalProperties: {} }, { type: 'null' }] },
							raw: { anyOf: [{}, { type: 'null' }] },
						},
						additionalProperties: false,
					},
				},
				NOTIFY_BINDING,
			]);

			expect(types).toBe(
				[
					'// Generated by `apps bind`. Do not edit; re-run bind.',
					'// output of "submit" inferred from execution 42 (2026-09-09T10:00:01.000Z); re-run `apps bindings` after changing the workflow',
					"import '@n8n/app-sdk';",
					"declare module '@n8n/app-sdk' {",
					'\tinterface Bindings {',
					'\t\tworkflows: {',
					'\t\t\t"submit": { input: { "text"?: string | null; "amount"?: number | null; "flag"?: boolean | null; "items"?: unknown[] | null; "meta"?: Record<string, any> | null; "raw"?: unknown }; output: Array<{ "reply": string }> };',
					'\t\t\t"notify": { input: Record<string, any>; output: Array<Record<string, any>> };',
					'\t\t};',
					'\t\ttables: {};',
					'\t}',
					'}',
					'',
				].join('\n'),
			);
		});

		it('renders one row type per bound data table with the system columns and every column type', () => {
			const types = renderBindingsTypes([
				TASKS_BINDING,
				{
					...TASKS_BINDING,
					key: 'notes',
					columns: [],
					row: {
						type: 'object',
						properties: {
							id: { type: 'number' },
							createdAt: { type: 'string', format: 'date-time' },
							updatedAt: { type: 'string', format: 'date-time' },
						},
						required: ['id', 'createdAt', 'updatedAt'],
						additionalProperties: false,
					},
				},
			]);

			expect(types).toBe(
				[
					'// Generated by `apps bind`. Do not edit; re-run bind.',
					"import '@n8n/app-sdk';",
					"declare module '@n8n/app-sdk' {",
					'\tinterface Bindings {',
					'\t\tworkflows: {};',
					'\t\ttables: {',
					'\t\t\t"tasks": { row: { "id": number; "createdAt": string; "updatedAt": string; "title": string | null; "priority": number | null; "done": boolean | null; "due": string | null } };',
					'\t\t\t"notes": { row: { "id": number; "createdAt": string; "updatedAt": string } };',
					'\t\t};',
					'\t}',
					'}',
					'',
				].join('\n'),
			);
		});

		it('skips a binding whose resource is missing', () => {
			const types = renderBindingsTypes([
				SUBMIT_BINDING,
				MISSING_BINDING,
				{ ...MISSING_BINDING, key: 'lost', kind: 'workflow' },
			]);

			expect(types).toContain('"submit": { input:');
			expect(types).toContain('\t\ttables: {};');
			expect(types).not.toContain('gone');
			expect(types).not.toContain('lost');
		});

		it('makes required properties non-optional and types every observed output kind', () => {
			const types = renderBindingsTypes([
				{
					...SUBMIT_BINDING,
					output: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								reply: { type: 'string' },
								count: { type: ['number', 'null'] },
								ok: { type: 'boolean' },
								rows: { type: ['array', 'null'] },
								meta: { type: 'object' },
								gone: { type: 'null' },
								mixed: {},
								'first name': { type: 'string' },
							},
							required: ['reply', 'rows', 'meta', 'gone', 'mixed', 'first name'],
						},
					},
				},
			]);

			expect(types).toContain(
				'output: Array<{ "reply": string; "count"?: number | null; "ok"?: boolean; "rows": unknown[] | null; "meta": Record<string, unknown>; "gone": null; "mixed": unknown; "first name": string }>',
			);
		});

		it('types nested arrays and typed records', () => {
			expect(
				jsonSchemaToTs({ type: 'array', items: { type: 'array', items: { type: 'integer' } } }),
			).toBe('number[][]');
			expect(jsonSchemaToTs({ type: 'array', items: { type: ['string', 'null'] } })).toBe(
				'Array<string | null>',
			);
			expect(jsonSchemaToTs({ type: 'object', additionalProperties: { type: 'number' } })).toBe(
				'Record<string, number>',
			);
			expect(jsonSchemaToTs(true)).toBe('unknown');
			expect(jsonSchemaToTs(false)).toBe('never');
		});

		it('omits the inference comment for a binding without an execution sample', () => {
			const types = renderBindingsTypes([NOTIFY_BINDING]);

			expect(types).not.toContain('inferred from execution');
			expect(types).toContain('output: Array<Record<string, any>>');
		});

		it('renders empty workflows and tables maps when nothing is bound', () => {
			expect(renderBindingsTypes([])).toContain('\t\tworkflows: {};\n\t\ttables: {};\n');
			expect(renderBindingsTypes([])).not.toContain('workflows: {\n');
		});

		it('quotes keys and property names that are not identifiers', () => {
			const types = renderBindingsTypes([
				{
					...SUBMIT_BINDING,
					key: 'send-mail',
					input: { type: 'object', properties: { 'first name': { type: ['string', 'null'] } } },
				},
			]);
			expect(types).toContain('"send-mail": { input: { "first name"?: string | null }');
		});
	});

	describe('bind', () => {
		it('upserts by key over the stored bindings, saves them and regenerates the types', async () => {
			const context = createMockContext();
			appServiceMock(context, 'getBindings').mockResolvedValue({
				bindings: [SUBMIT_BINDING, NOTIFY_BINDING],
				warnings: [],
				stored: STORED_BINDINGS,
			});
			const saved = {
				bindings: [NOTIFY_BINDING, { ...SUBMIT_BINDING, workflowId: 'wf-9' }],
				warnings: ['Binding \'notify\': workflow "Notify" is not published.'],
			};
			appServiceMock(context, 'setBindings').mockResolvedValue(saved);

			const result = await runAction(
				context,
				{
					action: 'bind',
					bindings: [{ key: 'submit', kind: 'workflow', workflowId: 'wf-9' }],
				},
				approved,
			);

			expect(appServiceMock(context, 'setBindings')).toHaveBeenCalledWith('app-1', [
				{ key: 'notify', kind: 'workflow', workflowId: 'wf-2' },
				{ key: 'submit', kind: 'workflow', workflowId: 'wf-9' },
			]);
			expect(writeFileMock(context)).toHaveBeenCalledWith(
				TYPES_PATH,
				renderBindingsTypes(saved.bindings),
				expect.objectContaining({ recursive: true }),
			);
			expect(result).toEqual({
				appId: 'app-1',
				bindings: saved.bindings,
				typesPath: 'src/n8n-bindings.d.ts',
				warnings: saved.warnings,
			});
		});

		it('returns denied with the service reason when a binding is refused', async () => {
			const context = createMockContext();
			appServiceMock(context, 'setBindings').mockRejectedValue(
				new Error('Binding \'submit\': workflow "Echo" needs a trigger.'),
			);

			const result = await runAction(
				context,
				{
					action: 'bind',
					bindings: [{ key: 'submit', kind: 'workflow', workflowId: 'wf-1' }],
				},
				approved,
			);

			expect(result).toEqual({
				denied: true,
				reason: 'Binding \'submit\': workflow "Echo" needs a trigger.',
			});
			expect(writeFileMock(context)).not.toHaveBeenCalled();
		});

		it('reports the types stage when the bindings are saved but the file cannot be written', async () => {
			const context = createMockContext();
			appServiceMock(context, 'setBindings').mockResolvedValue({
				bindings: [SUBMIT_BINDING],
				warnings: [],
			});
			writeFileMock(context).mockRejectedValue(new Error('disk full'));

			const result = await runAction(
				context,
				{
					action: 'bind',
					bindings: [{ key: 'submit', kind: 'workflow', workflowId: 'wf-1' }],
				},
				approved,
			);

			expect(result).toMatchObject({
				error: true,
				stage: 'types',
				message: expect.stringContaining('disk full'),
			});
		});

		it('returns denied for an empty bindings list without touching the app', async () => {
			const context = createMockContext();

			const result = await runAction(context, { action: 'bind', bindings: [] }, approved);

			expect(result).toMatchObject({
				denied: true,
				reason: expect.stringContaining('at least one'),
			});
			expect(appServiceMock(context, 'setBindings')).not.toHaveBeenCalled();
		});

		it('saves a data table binding in the discriminated shape and regenerates the types', async () => {
			const context = createMockContext();
			appServiceMock(context, 'getBindings').mockResolvedValue({
				bindings: [SUBMIT_BINDING],
				warnings: [],
				stored: STORED_BINDINGS.slice(0, 1),
			});
			const saved = { bindings: [SUBMIT_BINDING, TASKS_BINDING], warnings: [] };
			appServiceMock(context, 'setBindings').mockResolvedValue(saved);

			const result = await runAction(
				context,
				{ action: 'bind', bindings: [STORED_TASKS_BINDING] },
				approved,
			);

			expect(appServiceMock(context, 'setBindings')).toHaveBeenCalledWith('app-1', [
				STORED_BINDINGS[0],
				STORED_TASKS_BINDING,
			]);
			expect(writeFileMock(context)).toHaveBeenCalledWith(
				TYPES_PATH,
				renderBindingsTypes(saved.bindings),
				expect.objectContaining({ recursive: true }),
			);
			expect(result).toMatchObject({ bindings: saved.bindings });
		});

		it('returns denied when workflows and data tables are mixed in one call', async () => {
			const context = createMockContext();

			const result = await runAction(
				context,
				{ action: 'bind', bindings: [STORED_BINDINGS[0], STORED_TASKS_BINDING] },
				approved,
			);

			expect(result).toEqual({
				denied: true,
				reason: 'Bind workflows and data tables in separate calls.',
			});
			expect(appServiceMock(context, 'get')).not.toHaveBeenCalled();
			expect(appServiceMock(context, 'setBindings')).not.toHaveBeenCalled();
		});

		it.each([
			{ key: 'submit', kind: 'workflow' },
			{ key: 'submit', kind: 'workflow', workflowId: 'wf-1', dataTableId: 'dt-1' },
			{ key: 'tasks', kind: 'dataTable', dataTableId: 'dt-1' },
			{ key: 'tasks', kind: 'dataTable', permissions: ['read'] },
			{
				key: 'tasks',
				kind: 'dataTable',
				dataTableId: 'dt-1',
				permissions: ['read'],
				workflowId: 'wf-1',
			},
		])('returns denied for the fields of %j', async (binding) => {
			const context = createMockContext();

			const result = await runAction(context, { action: 'bind', bindings: [binding] }, approved);

			expect(result).toMatchObject({
				denied: true,
				reason: expect.stringContaining(`Binding "${binding.key}": kind "${binding.kind}"`),
			});
			expect(appServiceMock(context, 'setBindings')).not.toHaveBeenCalled();
		});
	});

	describe('bind approval', () => {
		const bindInput = {
			action: 'bind',
			bindings: [
				{ key: 'submit', kind: 'workflow', workflowId: 'wf-1' },
				{ key: 'notify', kind: 'workflow', workflowId: 'wf-2' },
			],
		};

		it('is denied when the admin blocked bindAppWorkflow', async () => {
			const context = createMockContext({ permissions: { bindAppWorkflow: 'blocked' } } as never);
			const suspend = vi.fn();

			const result = await runAction(context, bindInput, { resumeData: undefined, suspend });

			expect(result).toEqual({ denied: true, reason: 'Action blocked by admin' });
			expect(suspend).not.toHaveBeenCalled();
			expect(appServiceMock(context, 'setBindings')).not.toHaveBeenCalled();
		});

		it('suspends with plain text naming every workflow when several are bound at once', async () => {
			const context = createMockContext();
			const suspend = vi.fn().mockResolvedValue('suspended');

			const result = await runAction(context, bindInput, { resumeData: undefined, suspend });

			expect(result).toBe('suspended');
			expect(suspend).toHaveBeenCalledWith({
				requestId: expect.any(String),
				message:
					'Connect workflow "Echo" (wf-1) to app "Greeter" as "submit"; ' +
					'Connect workflow "Echo" (wf-2) to app "Greeter" as "notify" ' +
					'(callable by anyone with the app URL)',
				severity: 'warning',
			});
			expect(appServiceMock(context, 'previewBindings')).not.toHaveBeenCalled();
			expect(appServiceMock(context, 'setBindings')).not.toHaveBeenCalled();
		});

		it('suspends with the structured binding details for a single binding', async () => {
			const context = createMockContext();
			appServiceMock(context, 'previewBindings').mockResolvedValue({
				bindings: [SUBMIT_BINDING],
				warnings: [],
			});
			const suspend = vi.fn().mockResolvedValue('suspended');
			const single = { action: 'bind', bindings: [bindInput.bindings[0]] };

			await runAction(context, single, { resumeData: undefined, suspend });

			expect(appServiceMock(context, 'previewBindings')).toHaveBeenCalledWith('app-1', [
				bindInput.bindings[0],
			]);
			expect(suspend).toHaveBeenCalledWith({
				requestId: expect.any(String),
				message:
					'Connect workflow "Echo" (wf-1) to app "Greeter" as "submit" (callable by anyone with the app URL)',
				severity: 'warning',
				appBinding: {
					kind: 'workflow',
					appId: 'app-1',
					appName: 'Greeter',
					appNamespace: 'greeter',
					workflowId: 'wf-1',
					workflowName: 'Echo',
					key: 'submit',
				},
			});
			expect(appServiceMock(context, 'setBindings')).not.toHaveBeenCalled();
		});

		it('falls back to plain text when the preview reports the workflow as missing', async () => {
			const context = createMockContext();
			appServiceMock(context, 'previewBindings').mockResolvedValue({
				bindings: [{ ...MISSING_BINDING, key: 'submit', kind: 'workflow' }],
				warnings: ['gone'],
			});
			const suspend = vi.fn().mockResolvedValue('suspended');

			await runAction(
				context,
				{ action: 'bind', bindings: [bindInput.bindings[0]] },
				{ resumeData: undefined, suspend },
			);

			expect(suspend.mock.calls[0][0]).not.toHaveProperty('appBinding');
		});

		it('falls back to the workflow id when the workflow cannot be read', async () => {
			const context = createMockContext();
			(context.workflowService.get as Mock).mockRejectedValue(new Error('gone'));
			const suspend = vi.fn().mockResolvedValue('suspended');

			await runAction(context, bindInput, { resumeData: undefined, suspend });

			expect(suspend.mock.calls[0][0].message).toContain('Connect workflow "wf-1" (wf-1)');
		});

		it('is denied when the user rejects the card', async () => {
			const context = createMockContext();

			const result = await runAction(context, bindInput, { resumeData: { approved: false } });

			expect(result).toEqual({ denied: true, reason: 'User denied the action' });
			expect(appServiceMock(context, 'setBindings')).not.toHaveBeenCalled();
		});

		it('skips the card when the admin set bindAppWorkflow to always_allow', async () => {
			const context = createMockContext({
				permissions: { bindAppWorkflow: 'always_allow' },
			} as never);
			const suspend = vi.fn();

			await runAction(context, bindInput, { resumeData: undefined, suspend });

			expect(suspend).not.toHaveBeenCalled();
			expect(appServiceMock(context, 'previewBindings')).not.toHaveBeenCalled();
			expect(appServiceMock(context, 'setBindings')).toHaveBeenCalled();
		});
	});

	describe('bind approval for a data table', () => {
		const bindInput = { action: 'bind', bindings: [STORED_TASKS_BINDING] };

		it('is gated by bindAppDataTable, not bindAppWorkflow', async () => {
			const context = createMockContext({
				permissions: { bindAppWorkflow: 'always_allow', bindAppDataTable: 'blocked' },
			} as never);
			const suspend = vi.fn();

			const result = await runAction(context, bindInput, { resumeData: undefined, suspend });

			expect(result).toEqual({ denied: true, reason: 'Action blocked by admin' });
			expect(suspend).not.toHaveBeenCalled();
			expect(appServiceMock(context, 'setBindings')).not.toHaveBeenCalled();
		});

		it('suspends with the table card for a single binding', async () => {
			const context = createMockContext();
			appServiceMock(context, 'previewBindings').mockResolvedValue({
				bindings: [TASKS_BINDING],
				warnings: [],
			});
			const suspend = vi.fn().mockResolvedValue('suspended');

			const result = await runAction(context, bindInput, { resumeData: undefined, suspend });

			expect(result).toBe('suspended');
			expect(appServiceMock(context, 'previewBindings')).toHaveBeenCalledWith('app-1', [
				STORED_TASKS_BINDING,
			]);
			expect(suspend).toHaveBeenCalledWith({
				requestId: expect.any(String),
				message:
					'Connect data table "Tasks" (dt-1) to app "Greeter" as "tasks" with read and write access (anyone with the app URL gets this access)',
				severity: 'warning',
				appBinding: {
					kind: 'dataTable',
					appId: 'app-1',
					appName: 'Greeter',
					appNamespace: 'greeter',
					dataTableId: 'dt-1',
					dataTableName: 'Tasks',
					key: 'tasks',
					permissions: ['read', 'write'],
					projectId: 'proj-1',
				},
			});
			expect(appServiceMock(context, 'setBindings')).not.toHaveBeenCalled();
		});

		it('suspends with plain text naming every table when several are bound at once', async () => {
			const context = createMockContext();
			appServiceMock(context, 'previewBindings').mockResolvedValue({
				bindings: [TASKS_BINDING, MISSING_BINDING],
				warnings: ['gone'],
			});
			const suspend = vi.fn().mockResolvedValue('suspended');

			await runAction(
				context,
				{
					action: 'bind',
					bindings: [
						STORED_TASKS_BINDING,
						{ key: 'gone', kind: 'dataTable', dataTableId: 'dt-2', permissions: ['read'] },
					],
				},
				{ resumeData: undefined, suspend },
			);

			expect(suspend).toHaveBeenCalledWith({
				requestId: expect.any(String),
				message:
					'Connect data table "Tasks" (dt-1) to app "Greeter" as "tasks" with read and write access; ' +
					'Connect data table "gone" (dt-2) to app "Greeter" as "gone" with read access ' +
					'(anyone with the app URL gets this access)',
				severity: 'warning',
			});
		});

		it('is denied when the user rejects the card', async () => {
			const context = createMockContext();

			const result = await runAction(context, bindInput, { resumeData: { approved: false } });

			expect(result).toEqual({ denied: true, reason: 'User denied the action' });
			expect(appServiceMock(context, 'setBindings')).not.toHaveBeenCalled();
		});

		it('skips the card when the admin set bindAppDataTable to always_allow', async () => {
			const context = createMockContext({
				permissions: { bindAppWorkflow: 'blocked', bindAppDataTable: 'always_allow' },
			} as never);
			const suspend = vi.fn();

			await runAction(context, bindInput, { resumeData: undefined, suspend });

			expect(suspend).not.toHaveBeenCalled();
			expect(appServiceMock(context, 'setBindings')).toHaveBeenCalledWith('app-1', [
				STORED_TASKS_BINDING,
			]);
		});
	});

	describe('unbind', () => {
		it('drops the key, saves the rest and regenerates the types', async () => {
			const context = createMockContext();
			appServiceMock(context, 'getBindings').mockResolvedValue({
				bindings: [SUBMIT_BINDING, NOTIFY_BINDING],
				warnings: [],
				stored: STORED_BINDINGS,
			});
			appServiceMock(context, 'setBindings').mockResolvedValue({
				bindings: [NOTIFY_BINDING],
				warnings: [],
			});

			const result = await runAction(context, { action: 'unbind', key: 'submit' });

			expect(appServiceMock(context, 'setBindings')).toHaveBeenCalledWith('app-1', [
				{ key: 'notify', kind: 'workflow', workflowId: 'wf-2' },
			]);
			expect(writeFileMock(context)).toHaveBeenCalledWith(
				TYPES_PATH,
				renderBindingsTypes([NOTIFY_BINDING]),
				expect.objectContaining({ recursive: true }),
			);
			expect(result).toEqual({
				appId: 'app-1',
				bindings: [NOTIFY_BINDING],
				typesPath: 'src/n8n-bindings.d.ts',
				warnings: [],
			});
		});

		it('keeps a stored binding that describe left out of the list', async () => {
			const context = createMockContext();
			appServiceMock(context, 'getBindings').mockResolvedValue({
				bindings: [NOTIFY_BINDING],
				warnings: ['Binding \'submit\': workflow "Echo" no longer starts with a trigger.'],
				stored: STORED_BINDINGS,
			});

			await runAction(context, { action: 'unbind', key: 'notify' });

			expect(appServiceMock(context, 'setBindings')).toHaveBeenCalledWith('app-1', [
				STORED_BINDINGS[0],
			]);
		});
	});

	describe('bindings', () => {
		it('lists the current bindings with their warnings and rewrites the types', async () => {
			const context = createMockContext();
			appServiceMock(context, 'getBindings').mockResolvedValue({
				bindings: [SUBMIT_BINDING, TASKS_BINDING],
				warnings: ['w'],
				stored: [STORED_BINDINGS[0], STORED_TASKS_BINDING],
			});

			const result = await runAction(context, { action: 'bindings' });

			expect(result).toEqual({
				appId: 'app-1',
				bindings: [SUBMIT_BINDING, TASKS_BINDING],
				typesPath: 'src/n8n-bindings.d.ts',
				warnings: ['w'],
			});
			expect(appServiceMock(context, 'setBindings')).not.toHaveBeenCalled();
			expect(writeFileMock(context)).toHaveBeenCalledWith(
				TYPES_PATH,
				renderBindingsTypes([SUBMIT_BINDING, TASKS_BINDING]),
				expect.objectContaining({ recursive: true }),
			);
		});
	});

	describe('buildCheckScript', () => {
		it('matches the snapshot', () => {
			expect(
				buildCheckScript({
					appDir: '/home/daytona/workspace/apps/greeter',
					outDir: 'dist',
					distTarball: '/home/daytona/workspace/.app-builds/greeter-1-dist.tgz',
					sourceTarball: '/home/daytona/workspace/.app-builds/greeter-1-src.tgz',
				}),
			).toMatchInlineSnapshot(`
				"set -e
				cd '/home/daytona/workspace/apps/greeter'
				if [ ! -f 'dist/index.html' ]; then echo 'APP_CHECK_FAIL: dist/index.html not found. The build must write a static site with index.html at the root of dist.'; exit 1; fi
				if [ -d 'dist/server' ] || [ -d .output/server ]; then echo 'APP_CHECK_FAIL: server output found (dist/server or .output/server). Only a static export can be served.'; exit 1; fi
				mkdir -p '/home/daytona/workspace/.app-builds'
				tar -czf '/home/daytona/workspace/.app-builds/greeter-1-dist.tgz' -C 'dist' .
				tar -czf '/home/daytona/workspace/.app-builds/greeter-1-src.tgz' --exclude=node_modules --exclude='dist' --exclude=.git --exclude=.n8n-dev.log --exclude=.n8n-dev.pid --exclude=.n8n-preview-dist --exclude='./core' --exclude='./core.*' --exclude='./*.core' -C . .
				dist_size=$(stat -c %s '/home/daytona/workspace/.app-builds/greeter-1-dist.tgz')
				src_size=$(stat -c %s '/home/daytona/workspace/.app-builds/greeter-1-src.tgz')
				if [ "$dist_size" -gt 20971520 ]; then echo "APP_CHECK_FAIL: build output is $dist_size bytes compressed; the limit is 20971520. Remove large assets from dist."; exit 1; fi
				if [ "$src_size" -gt 20971520 ]; then largest=$(du -ah --exclude=node_modules --exclude=.git --exclude='dist' . | sort -rh | awk -F'\\t' '$2 != "." { printf "%s%s %s", (n ? ", " : ""), $1, $2; if (++n == 5) exit }'); echo "APP_CHECK_FAIL: source is $src_size bytes compressed; the limit is 20971520. Largest entries: $largest. Delete them or move them out of the app directory."; exit 1; fi
				(git add -A && git -c user.name=n8n -c user.email=n8n@localhost commit -qm build) >/dev/null 2>&1 || true
				echo "APP_CHECK_OK $dist_size $src_size""
			`);
		});

		it('excludes core dumps from the source tarball and lists the largest entries when the cap is hit', () => {
			const script = buildCheckScript({
				appDir: '/ws/apps/greeter',
				outDir: 'out',
				distTarball: '/ws/.app-builds/d.tgz',
				sourceTarball: '/ws/.app-builds/s.tgz',
			});
			const tarLine = script.split('\n').find((line) => line.includes("'/ws/.app-builds/s.tgz'"));
			expect(tarLine).toContain("--exclude='./core' --exclude='./core.*' --exclude='./*.core'");
			expect(tarLine).toContain(
				'--exclude=.n8n-dev.log --exclude=.n8n-dev.pid --exclude=.n8n-preview-dist',
			);
			expect(script).toContain(
				"du -ah --exclude=node_modules --exclude=.git --exclude='out' . | sort -rh",
			);
			expect(script).toContain('Largest entries: $largest.');
		});

		it('quotes paths that contain a single quote', () => {
			const script = buildCheckScript({
				appDir: "/ws/apps/it's",
				outDir: 'dist',
				distTarball: '/ws/.app-builds/d.tgz',
				sourceTarball: '/ws/.app-builds/s.tgz',
			});
			expect(script).toContain("cd '/ws/apps/it'\\''s'");
		});
	});
});

describe('create without a project id', () => {
	it('leaves the project to the adapter when none is given', async () => {
		const context = createMockContext();
		await runCreate(context, { projectId: undefined });

		expect(context.appService?.create).toHaveBeenCalledWith({
			projectId: undefined,
			name: 'Greeter',
			namespace: 'greeter',
		});
	});
});
