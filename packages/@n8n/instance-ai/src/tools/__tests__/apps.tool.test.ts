import type { Mock } from 'vitest';
import type { z } from 'zod';

import { executeTool } from '../../__tests__/tool-test-utils';
import type { InstanceAiAppService, InstanceAiContext } from '../../types';
import {
	buildCheckScript,
	createAppsTool,
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
	input: [{ name: 'message', type: 'string' }],
};
const NOTIFY_BINDING = {
	key: 'notify',
	kind: 'workflow' as const,
	workflowId: 'wf-2',
	name: 'Notify',
	published: false,
	input: 'passthrough' as const,
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
		getBindings: vi.fn().mockResolvedValue({ bindings: [], warnings: [] }),
		getSdkTarball: vi.fn().mockResolvedValue({ filename: 'n8n-app-sdk.tgz', data: SDK_TARBALL }),
	};
	return {
		userId: 'user-1',
		workflowService: {},
		executionService: {},
		nodeService: {},
		credentialService: {},
		dataTableService: {},
		appService,
		workspace: {
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
	return (context.workspace as unknown as { sandbox: { executeCommand: Mock } }).sandbox
		.executeCommand;
}

function readFileMock(context: InstanceAiContext): Mock {
	return (context.workspace as unknown as { filesystem: { readFile: Mock } }).filesystem.readFile;
}

function writeFileMock(context: InstanceAiContext): Mock {
	return (context.workspace as unknown as { filesystem: { writeFile: Mock } }).filesystem.writeFile;
}

function commandsRun(context: InstanceAiContext): string[] {
	return executeCommandMock(context).mock.calls.map((call: unknown[]) => String(call[0]));
}

function inputSchema(tool: unknown): z.ZodTypeAny {
	return (tool as { inputSchema: z.ZodTypeAny }).inputSchema;
}

async function runBuild(context: InstanceAiContext, input: Record<string, unknown> = {}) {
	const tool = createAppsTool(context);
	const parsed: unknown = inputSchema(tool).parse({ action: 'build', appId: 'app-1', ...input });
	return await executeTool<Record<string, unknown>>(tool, parsed);
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

async function runAction(context: InstanceAiContext, input: Record<string, unknown>) {
	const tool = createAppsTool(context);
	const parsed: unknown = inputSchema(tool).parse({ appId: 'app-1', ...input });
	return await executeTool<Record<string, unknown>>(tool, parsed);
}

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

		it('accepts a bare build call; defaults are applied by the handler', async () => {
			const context = createMockContext();
			await runBuild(context);
			expect(commandsRun(context)[1]).toBe(`${BUILD_PREFIX} npm run build`);
			expect(commandsRun(context)[2]).toContain("'dist/index.html'");
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
			]);
		});

		it('uses the given namespace and skips the template when asked', async () => {
			const context = createMockContext();
			await runCreate(context, { namespace: 'hello', template: 'none' });

			expect(context.appService?.create).toHaveBeenCalledWith(
				expect.objectContaining({ namespace: 'hello' }),
			);
			expect(commandsRun(context).some((command) => command.includes('cp -r'))).toBe(false);
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
				warnings: [expect.stringContaining('git is unavailable')],
			});
		});

		it('names the registered app when scaffolding fails after create', async () => {
			const context = createMockContext();
			executeCommandMock(context)
				.mockResolvedValueOnce(ok())
				.mockResolvedValueOnce(fail('cp: cannot stat template'));

			await expect(runCreate(context)).rejects.toThrow(
				/id app-1, namespace "greeter".*cp: cannot stat template.*\/home\/daytona\/workspace\/apps\/greeter.*appId app-1/,
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
			expect(calls).toHaveLength(4);
			for (const call of calls) expect(call[2].abortSignal).toBe(abortSignal);
		});
	});

	describe('build', () => {
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
			const context = createMockContext({ workspace: undefined });
			await expect(runBuild(context)).rejects.toThrow('sandbox workspace');
		});

		it('forwards the run abort signal to every sandbox command and tarball read', async () => {
			const context = createMockContext();
			const abortSignal = new AbortController().signal;
			const tool = createAppsTool(context);
			const parsed: unknown = inputSchema(tool).parse({ action: 'build', appId: 'app-1' });

			await executeTool(tool, parsed, { abortSignal });

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
			expect(writeCalls).toHaveLength(1);
			expect(writeCalls[0][0]).toMatch(/^\.app-builds\/greeter-\d+-restore\.tgz$/);
			expect(Buffer.isBuffer(writeCalls[0][1])).toBe(true);
			expect(writeCalls[0][1]).toEqual(SOURCE_TARBALL);

			const commands = commandsRun(context);
			expect(commands[0]).toBe(
				"[ -d '/home/daytona/workspace/apps/greeter' ] && [ -n \"$(ls -A '/home/daytona/workspace/apps/greeter')\" ]",
			);
			expect(commands[1]).toBe("mkdir -p '/home/daytona/workspace/.app-builds'");
			expect(commands[2]).toMatch(
				/^mkdir -p '\/home\/daytona\/workspace\/apps\/greeter' && tar -xzf '\/home\/daytona\/workspace\/\.app-builds\/greeter-\d+-restore\.tgz' -C '\/home\/daytona\/workspace\/apps\/greeter'$/,
			);
			expect(commands[3]).toContain('git init');
			expect(commands[3]).toContain('commit -qm restore --allow-empty');
			expect(commands[4]).toMatch(
				/^rm -f '\/home\/daytona\/workspace\/\.app-builds\/greeter-\d+-restore\.tgz'$/,
			);
			expect(result).toEqual({
				appId: 'app-1',
				name: 'Greeter',
				namespace: 'greeter',
				projectId: 'proj-1',
				versionId: 'v-1',
				workspacePath: '/home/daytona/workspace/apps/greeter',
				warnings: [],
			});
		});

		it('returns denied when the app has no stored version', async () => {
			const context = createMockContext();
			mockEmptyAppDir(context);
			(context.appService?.getSourceTarball as Mock).mockResolvedValue(null);

			const result = await runRestore(context);

			expect(result).toEqual({
				denied: true,
				reason: expect.stringContaining('no stored version'),
			});
			expect(writeFileMock(context)).not.toHaveBeenCalled();
			expect(commandsRun(context)).toHaveLength(1);
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
			expect(commandCalls).toHaveLength(5);
			for (const call of commandCalls) expect(call[2].abortSignal).toBe(abortSignal);

			const writeCalls = writeFileMock(context).mock.calls as Array<
				[string, Buffer, { abortSignal?: AbortSignal }]
			>;
			expect(writeCalls).toHaveLength(1);
			expect(writeCalls[0][2].abortSignal).toBe(abortSignal);
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
		it('maps every field type, marks fields optional and types passthrough as a record', () => {
			const types = renderBindingsTypes([
				{
					...SUBMIT_BINDING,
					input: [
						{ name: 'text', type: 'string' },
						{ name: 'amount', type: 'number' },
						{ name: 'flag', type: 'boolean' },
						{ name: 'items', type: 'array' },
						{ name: 'meta', type: 'object' },
						{ name: 'raw', type: 'any' },
						{ name: 'untyped' },
					],
				},
				NOTIFY_BINDING,
			]);

			expect(types).toMatchInlineSnapshot(`
				"// Generated by \`apps bind\`. Do not edit; re-run bind.
				import '@n8n/app-sdk';
				declare module '@n8n/app-sdk' {
				  interface Bindings {
				    workflows: {
				      "submit": { input: { "text"?: string | null; "amount"?: number | null; "flag"?: boolean | null; "items"?: unknown[] | null; "meta"?: Record<string, unknown> | null; "raw"?: unknown; "untyped"?: string | null }; output: unknown };
				      "notify": { input: Record<string, unknown>; output: unknown };
				    };
				  }
				}
				"
			`);
		});

		it('renders an empty workflows map when nothing is bound', () => {
			expect(renderBindingsTypes([])).toContain('    workflows: {};\n');
			expect(renderBindingsTypes([])).not.toContain('workflows: {\n');
		});

		it('quotes keys and field names that are not identifiers', () => {
			const types = renderBindingsTypes([
				{ ...SUBMIT_BINDING, key: 'send-mail', input: [{ name: 'first name', type: 'string' }] },
			]);
			expect(types).toContain('"send-mail": { input: { "first name"?: string | null }');
		});
	});

	describe('bind', () => {
		it('upserts by key over the current bindings, saves them and regenerates the types', async () => {
			const context = createMockContext();
			appServiceMock(context, 'getBindings').mockResolvedValue({
				bindings: [SUBMIT_BINDING, NOTIFY_BINDING],
				warnings: [],
			});
			const saved = {
				bindings: [NOTIFY_BINDING, { ...SUBMIT_BINDING, workflowId: 'wf-9' }],
				warnings: ['Binding \'notify\': workflow "Notify" is not published.'],
			};
			appServiceMock(context, 'setBindings').mockResolvedValue(saved);

			const result = await runAction(context, {
				action: 'bind',
				bindings: [{ key: 'submit', kind: 'workflow', workflowId: 'wf-9' }],
			});

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

			const result = await runAction(context, {
				action: 'bind',
				bindings: [{ key: 'submit', kind: 'workflow', workflowId: 'wf-1' }],
			});

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

			const result = await runAction(context, {
				action: 'bind',
				bindings: [{ key: 'submit', kind: 'workflow', workflowId: 'wf-1' }],
			});

			expect(result).toMatchObject({
				error: true,
				stage: 'types',
				message: expect.stringContaining('disk full'),
			});
		});

		it('returns denied for an empty bindings list without touching the app', async () => {
			const context = createMockContext();

			const result = await runAction(context, { action: 'bind', bindings: [] });

			expect(result).toMatchObject({
				denied: true,
				reason: expect.stringContaining('at least one'),
			});
			expect(appServiceMock(context, 'setBindings')).not.toHaveBeenCalled();
		});
	});

	describe('unbind', () => {
		it('drops the key, saves the rest and regenerates the types', async () => {
			const context = createMockContext();
			appServiceMock(context, 'getBindings').mockResolvedValue({
				bindings: [SUBMIT_BINDING, NOTIFY_BINDING],
				warnings: [],
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
	});

	describe('bindings', () => {
		it('lists the current bindings with their warnings', async () => {
			const context = createMockContext();
			appServiceMock(context, 'getBindings').mockResolvedValue({
				bindings: [SUBMIT_BINDING],
				warnings: ['w'],
			});

			const result = await runAction(context, { action: 'bindings' });

			expect(result).toEqual({ appId: 'app-1', bindings: [SUBMIT_BINDING], warnings: ['w'] });
			expect(appServiceMock(context, 'setBindings')).not.toHaveBeenCalled();
			expect(writeFileMock(context)).not.toHaveBeenCalled();
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
				tar -czf '/home/daytona/workspace/.app-builds/greeter-1-src.tgz' --exclude=node_modules --exclude='dist' --exclude=.git --exclude='./core' --exclude='./core.*' --exclude='./*.core' -C . .
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
