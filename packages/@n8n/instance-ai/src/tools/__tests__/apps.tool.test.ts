import type { Mock } from 'vitest';
import type { z } from 'zod';

import { executeTool } from '../../__tests__/tool-test-utils';
import type { InstanceAiAppService, InstanceAiContext } from '../../types';
import { buildCheckScript, createAppsTool, slugifyNamespace, tailLog } from '../apps.tool';

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

const ok = (stdout = '') => ({ exitCode: 0, stdout, stderr: '' });
const fail = (stdout: string, exitCode = 1) => ({ exitCode, stdout, stderr: '' });

function createMockContext(overrides: Partial<InstanceAiContext> = {}): InstanceAiContext {
	const appService: InstanceAiAppService = {
		create: vi.fn().mockResolvedValue({ app: APP }),
		get: vi.fn().mockResolvedValue(APP),
		storeVersion: vi
			.fn()
			.mockResolvedValue({ versionId: 'v-1', url: 'http://localhost:5678/apps/greeter/' }),
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
			filesystem: { readFile: vi.fn().mockResolvedValue(Buffer.from([0x1f, 0x8b])) },
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
			expect(commandsRun(context)[1]).toBe('npm run build');
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
			expect(commands[2]).toContain('git init');
			expect(result).toEqual({
				app: APP,
				workspacePath: '/home/daytona/workspace/apps/greeter',
			});
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
						command.startsWith('git init') ? fail('sh: git: not found', 127) : ok(),
					),
			);

			const result = await runCreate(context);

			expect(result).toMatchObject({
				app: APP,
				warnings: [expect.stringContaining('git is unavailable')],
			});
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
			expect(calls[0][0]).toContain('[ ! -d node_modules ]');
			expect(calls[0][0]).toContain('npm install');
			expect(calls[1][0]).toBe('npm run build');
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
			expect(commands[1]).toBe('npx vite build');
			expect(commands[2]).toContain("'out/index.html'");
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
				tar -czf '/home/daytona/workspace/.app-builds/greeter-1-src.tgz' --exclude=node_modules --exclude='dist' --exclude=.git -C . .
				dist_size=$(stat -c %s '/home/daytona/workspace/.app-builds/greeter-1-dist.tgz')
				src_size=$(stat -c %s '/home/daytona/workspace/.app-builds/greeter-1-src.tgz')
				if [ "$dist_size" -gt 20971520 ]; then echo "APP_CHECK_FAIL: build output is $dist_size bytes compressed; the limit is 20971520. Remove large assets from dist."; exit 1; fi
				if [ "$src_size" -gt 20971520 ]; then echo "APP_CHECK_FAIL: source is $src_size bytes compressed; the limit is 20971520. Remove large files from the app directory."; exit 1; fi
				(git add -A && git -c user.name=n8n -c user.email=n8n@localhost commit -qm build) >/dev/null 2>&1 || true
				echo "APP_CHECK_OK $dist_size $src_size""
			`);
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
