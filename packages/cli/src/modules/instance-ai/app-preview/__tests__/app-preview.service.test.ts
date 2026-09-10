import type { CommandResult, ExecuteCommandOptions, Workspace } from '@n8n/agents';
import { mockLogger } from '@n8n/backend-test-utils';
import type { ExecRequest, ExecResult, SandboxRecord } from '@n8n/sandbox-client';
import { SandboxServiceError } from '@n8n/sandbox-client';
import jwt from 'jsonwebtoken';
import { mock } from 'vitest-mock-extended';

import type { JwtService } from '@/services/jwt.service';

import {
	AppPreviewService,
	buildDevServerStartScript,
	buildDevServerStopScript,
	buildOccupiedCheckScript,
	buildPreviewBuildScript,
	buildRestoreScript,
	type EnsureAppPreviewInput,
} from '../app-preview.service';

vi.mock('@n8n/agents/sandbox', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/agents/sandbox')>()),
	getWorkspaceRoot: vi.fn(async () => await Promise.resolve('/home/user/workspace')),
}));

const sandboxClient = {
	getSandbox: vi.fn<(id: string) => Promise<SandboxRecord>>(),
	stat: vi.fn<(id: string, path: string) => Promise<unknown>>(),
	exec: vi.fn<(id: string, request: ExecRequest) => Promise<ExecResult>>(),
	writeFile: vi.fn<(id: string, path: string, content: Buffer) => Promise<void>>(),
};

vi.mock('@n8n/sandbox-client', () => ({
	SandboxClient: class {
		getSandbox = sandboxClient.getSandbox;
		stat = sandboxClient.stat;
		exec = sandboxClient.exec;
		writeFile = sandboxClient.writeFile;
	},
	SandboxServiceError: class extends Error {
		constructor(
			message: string,
			readonly status: number,
		) {
			super(message);
		}
	},
}));

const SECRET = 'test-secret';
const fetchMock = vi.fn<typeof fetch>();

const execOk: ExecResult = {
	exitCode: 0,
	stdout: '',
	stderr: '',
	executionTimeMs: 1,
	timedOut: false,
	killed: false,
	success: true,
};

const getWorkspace = vi.fn<EnsureAppPreviewInput['getWorkspace']>();
const getSourceTarball = vi.fn<EnsureAppPreviewInput['getSourceTarball']>();
const hasActiveRun = vi.fn<EnsureAppPreviewInput['hasActiveRun']>();
const tarball = { data: Buffer.from('gzip') };

/** The thread workspace as any provider exposes it: shell via `executeCommand`, files via `filesystem`. */
const workspaceExec =
	vi.fn<
		(command: string, args?: string[], options?: ExecuteCommandOptions) => Promise<CommandResult>
	>();
const workspaceFs = {
	exists: vi.fn<(path: string) => Promise<boolean>>(),
	readFile: vi.fn<(path: string) => Promise<Buffer>>(),
	writeFile: vi.fn<(path: string, content: Buffer) => Promise<void>>(),
};
const workspace = {
	sandbox: {
		id: 'sb',
		name: 'sb',
		provider: 'daytona',
		status: 'ready',
		executeCommand: workspaceExec,
	},
	filesystem: { id: 'fs', name: 'fs', provider: 'daytona', status: 'ready', ...workspaceFs },
} as unknown as Workspace;
const commandOk: CommandResult = { ...execOk, executionTimeMs: 1 };
const ROOT = '/home/user/workspace';
const DIST_INDEX = `${ROOT}/apps/greeter/.n8n-preview-dist/index.html`;

const input: EnsureAppPreviewInput = {
	threadId: 'thread-1',
	appId: 'app-1',
	projectId: 'project-1',
	namespace: 'greeter',
	userId: 'user-1',
	sandbox: { url: 'http://sandbox.test', apiKey: 'sandbox-key' },
	hasActiveRun,
	getWorkspace,
	getSourceTarball,
};

const APP_DIR = '/home/user/workspace/apps/greeter';
const notFound = () => new SandboxServiceError('not found', 404);
/** The sandbox exists, `apps/greeter` is missing (no package.json) and empty. */
function givenAppDirMissing() {
	sandboxClient.stat.mockRejectedValue(notFound());
	sandboxClient.exec.mockImplementation(async (_id, request) =>
		request.command === buildOccupiedCheckScript(APP_DIR) ? { ...execOk, exitCode: 1 } : execOk,
	);
}

const httpResponse = (status: number, headers: Record<string, string> = {}) =>
	new Response(null, { status, headers });

describe('AppPreviewService', () => {
	const jwtService = mock<JwtService>();
	let service: AppPreviewService;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useRealTimers();
		vi.stubGlobal('fetch', fetchMock);
		jwtService.sign.mockImplementation((payload, options) => jwt.sign(payload, SECRET, options));
		jwtService.verify.mockImplementation((token, options) => jwt.verify(token, SECRET, options));
		sandboxClient.getSandbox.mockResolvedValue(mock<SandboxRecord>());
		sandboxClient.stat.mockResolvedValue({});
		sandboxClient.exec.mockResolvedValue(execOk);
		sandboxClient.writeFile.mockResolvedValue(undefined);
		getWorkspace.mockResolvedValue(workspace);
		getSourceTarball.mockResolvedValue(tarball);
		hasActiveRun.mockReturnValue(false);
		fetchMock.mockResolvedValue(httpResponse(200));
		workspaceExec.mockResolvedValue(commandOk);
		workspaceFs.exists.mockResolvedValue(true);
		workspaceFs.writeFile.mockResolvedValue(undefined);
		service = new AppPreviewService(jwtService, mockLogger());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('ensure', () => {
		it('starts the dev server and returns a ready capability URL', async () => {
			const result = await service.ensure(input);

			expect(result.status).toBe('ready');
			if (result.status !== 'ready') return;
			expect(result.url).toMatch(/^\/apps-preview\/[\w.-]+\/$/);
			expect(sandboxClient.stat).toHaveBeenCalledWith(
				expect.any(String),
				`${APP_DIR}/package.json`,
			);
			expect(getWorkspace).not.toHaveBeenCalled();
			expect(getSourceTarball).not.toHaveBeenCalled();
			expect(sandboxClient.exec).toHaveBeenCalledTimes(1);
			const startCommand = sandboxClient.exec.mock.calls[0][1].command;
			expect(startCommand).toBe(
				buildDevServerStartScript({ namespace: 'greeter', token: result.url.split('/')[2] }),
			);
			expect(startCommand).not.toContain('npm install');
			expect(startCommand).not.toContain('pkill');
			expect(startCommand).toContain(
				'cd apps/greeter && { [ -f .n8n-dev.pid ] && kill "$(cat .n8n-dev.pid)" 2>/dev/null; sleep 0.3; } && ',
			);
			expect(startCommand).toContain(
				"setsid nohup sh -c 'echo $$ > .n8n-dev.pid; exec node_modules/.bin/vite --host 0.0.0.0 --port 5173 --strictPort' > .n8n-dev.log",
			);
			expect(startCommand).toContain('VITE_N8N_API_BASE=/apps/greeter/api');
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringMatching(
					/^http:\/\/sandbox\.test\/sandboxes\/[0-9a-f-]{36}\/ports\/5173\/apps-preview\/[\w.-]+\/$/,
				),
				expect.objectContaining({ headers: { 'X-Api-Key': 'sandbox-key' } }),
			);
		});

		describe('restore', () => {
			const commandsRun = () => sandboxClient.exec.mock.calls.map(([, request]) => request.command);
			const RESTORE_SCRIPT =
				/^tar -xzf (\/home\/user\/workspace\/\.app-builds\/greeter-\d+-preview-restore\.tgz) -C \/home\/user\/workspace\/apps\/greeter; rc=\$\?; rm -f \1; \[ "\$rc" -eq 0 \] && cd \/home\/user\/workspace\/apps\/greeter && \(ulimit -c 0; npm install --ignore-scripts --no-audit --no-fund --prefer-offline\)$/;

			it('creates the sandbox, restores the stored source, installs and starts when the thread has no sandbox', async () => {
				vi.useFakeTimers();
				sandboxClient.getSandbox.mockRejectedValueOnce(notFound());
				sandboxClient.stat.mockRejectedValue(notFound());
				let finishRestore: (result: ExecResult) => void = () => {};
				sandboxClient.exec.mockImplementation(async (_id, request) => {
					if (request.command === buildOccupiedCheckScript(APP_DIR))
						return { ...execOk, exitCode: 1 };
					if (request.command.startsWith('tar -xzf')) {
						return await new Promise<ExecResult>((resolve) => (finishRestore = resolve));
					}
					return execOk;
				});

				const first = service.ensure(input);
				await vi.advanceTimersByTimeAsync(2_000);
				await expect(first).resolves.toEqual({ status: 'starting' });
				await expect(service.ensure(input)).resolves.toEqual({ status: 'starting' });
				expect(commandsRun()).toHaveLength(3);

				finishRestore(execOk);
				await vi.advanceTimersByTimeAsync(0);
				await expect(service.ensure(input)).resolves.toMatchObject({ status: 'ready' });

				expect(getSourceTarball).toHaveBeenCalledTimes(1);
				expect(getWorkspace).toHaveBeenCalledTimes(1);
				expect(commandsRun()).toEqual([
					`[ -d ${APP_DIR} ] && [ -n "$(ls -A ${APP_DIR})" ]`,
					`mkdir -p /home/user/workspace/.app-builds ${APP_DIR}`,
					expect.stringMatching(RESTORE_SCRIPT),
					expect.stringContaining('exec node_modules/.bin/vite'),
				]);
				const restoreRequest = sandboxClient.exec.mock.calls[2][1];
				expect(restoreRequest).toMatchObject({ env: { CI: 'true' }, timeoutMs: 600_000 });
				expect(sandboxClient.writeFile).toHaveBeenCalledTimes(1);
				const [, tarballPath, content] = sandboxClient.writeFile.mock.calls[0];
				expect(content).toBe(tarball.data);
				expect(restoreRequest.command).toBe(buildRestoreScript({ appDir: APP_DIR, tarballPath }));
				const writeOrder = sandboxClient.writeFile.mock.invocationCallOrder[0];
				expect(writeOrder).toBeGreaterThan(sandboxClient.exec.mock.invocationCallOrder[1]);
				expect(writeOrder).toBeLessThan(sandboxClient.exec.mock.invocationCallOrder[2]);
			});

			it('restores when the sandbox exists but the app directory has no package.json', async () => {
				givenAppDirMissing();

				await expect(service.ensure(input)).resolves.toMatchObject({ status: 'ready' });
				expect(getWorkspace).toHaveBeenCalledTimes(1);
				expect(commandsRun()).toEqual([
					buildOccupiedCheckScript(APP_DIR),
					expect.stringContaining('mkdir -p'),
					expect.stringMatching(RESTORE_SCRIPT),
					expect.stringContaining('exec node_modules/.bin/vite'),
				]);
			});

			it('returns no-source without creating a sandbox when the app has no stored source', async () => {
				sandboxClient.getSandbox.mockRejectedValue(notFound());
				getSourceTarball.mockResolvedValue(null);

				await expect(service.ensure(input)).resolves.toEqual({ status: 'no-source' });
				expect(getWorkspace).not.toHaveBeenCalled();
				expect(sandboxClient.exec).not.toHaveBeenCalled();
				expect(sandboxClient.writeFile).not.toHaveBeenCalled();
			});

			it('starts without restoring into an app directory that already has files', async () => {
				sandboxClient.stat.mockRejectedValue(notFound());

				await expect(service.ensure(input)).resolves.toMatchObject({ status: 'ready' });
				expect(commandsRun()).toEqual([
					buildOccupiedCheckScript(APP_DIR),
					expect.stringContaining('exec node_modules/.bin/vite'),
				]);
				expect(sandboxClient.writeFile).not.toHaveBeenCalled();
			});

			it('returns unavailable/sandbox when the sandbox is disabled for the thread', async () => {
				sandboxClient.getSandbox.mockRejectedValue(notFound());
				getWorkspace.mockResolvedValue(undefined);

				await expect(service.ensure(input)).resolves.toEqual({
					status: 'unavailable',
					reason: 'sandbox',
				});
				expect(sandboxClient.exec).not.toHaveBeenCalled();
			});

			it('returns unavailable/sandbox when creating the sandbox fails', async () => {
				sandboxClient.getSandbox.mockRejectedValue(notFound());
				getWorkspace.mockRejectedValue(new Error('sandbox service unreachable'));

				await expect(service.ensure(input)).resolves.toEqual({
					status: 'unavailable',
					reason: 'sandbox',
				});
			});

			it('reports a failed restore once as start-failed with the log tail, then tries again', async () => {
				sandboxClient.stat.mockRejectedValue(notFound());
				sandboxClient.exec.mockImplementation(async (_id, request) => {
					if (request.command === buildOccupiedCheckScript(APP_DIR))
						return { ...execOk, exitCode: 1 };
					if (request.command.startsWith('tar -xzf')) {
						return { ...execOk, exitCode: 1, success: false, stderr: 'npm ERR! 404 Not Found' };
					}
					return execOk;
				});

				await expect(service.ensure(input)).resolves.toEqual({
					status: 'unavailable',
					reason: 'start-failed',
					log: 'npm ERR! 404 Not Found',
				});
				expect(commandsRun()).not.toContainEqual(
					expect.stringContaining('exec node_modules/.bin/vite'),
				);

				sandboxClient.exec.mockResolvedValue(execOk);
				await expect(service.ensure(input)).resolves.toMatchObject({ status: 'ready' });
			});
		});

		it('returns unavailable/sandbox when the sandbox service fails to look the sandbox up', async () => {
			sandboxClient.getSandbox.mockRejectedValue(new SandboxServiceError('upstream', 502));

			await expect(service.ensure(input)).resolves.toEqual({
				status: 'unavailable',
				reason: 'sandbox',
			});
			expect(getSourceTarball).not.toHaveBeenCalled();
		});

		it('returns unavailable/start-failed with the log tail when the start script exits non-zero', async () => {
			sandboxClient.exec.mockResolvedValueOnce({
				...execOk,
				exitCode: 1,
				success: false,
				stdout: 'Error: EADDRINUSE',
			});

			await expect(service.ensure(input)).resolves.toEqual({
				status: 'unavailable',
				reason: 'start-failed',
				log: 'Error: EADDRINUSE',
			});
			await expect(service.ensure(input)).resolves.toMatchObject({ status: 'ready' });
			expect(sandboxClient.exec).toHaveBeenCalledTimes(2);
		});

		it('reports a start failure that outlasted the handoff on the next ensure, then starts again', async () => {
			vi.useFakeTimers();
			let finishStart: (result: ExecResult) => void = () => {};
			sandboxClient.exec.mockImplementationOnce(
				async () => await new Promise<ExecResult>((resolve) => (finishStart = resolve)),
			);

			const first = service.ensure(input);
			await vi.advanceTimersByTimeAsync(2_000);
			await expect(first).resolves.toEqual({ status: 'starting' });
			finishStart({ ...execOk, exitCode: 1, success: false, stdout: 'Error: EADDRINUSE' });
			await vi.advanceTimersByTimeAsync(0);

			await expect(service.ensure(input)).resolves.toEqual({
				status: 'unavailable',
				reason: 'start-failed',
				log: 'Error: EADDRINUSE',
			});
			expect(sandboxClient.exec).toHaveBeenCalledTimes(1);
			await expect(service.ensure(input)).resolves.toMatchObject({ status: 'ready' });
			expect(sandboxClient.exec).toHaveBeenCalledTimes(2);
		});

		it.each([501, 404])(
			'falls back to a built preview on a plain %i from the port route and caches the missing route',
			async (status) => {
				fetchMock.mockResolvedValue(httpResponse(status, { 'Content-Type': 'text/plain' }));

				const first = await service.ensure(input);

				expect(first).toMatchObject({ status: 'ready', url: expect.stringMatching(/\?b=1$/) });
				const clientCommands = sandboxClient.exec.mock.calls.map(([, request]) => request.command);
				expect(clientCommands).toEqual([
					expect.stringContaining('exec node_modules/.bin/vite'),
					buildDevServerStopScript('greeter'),
				]);
				expect(workspaceExec).toHaveBeenCalledTimes(1);
				expect(service.resolveToken(tokenOf(first))).toMatchObject({ kind: 'built', buildSeq: 1 });

				const second = await service.ensure({ ...input, appId: 'app-2', namespace: 'other' });

				expect(second).toMatchObject({ status: 'ready', url: expect.stringMatching(/\?b=1$/) });
				expect(fetchMock).toHaveBeenCalledTimes(1);
				expect(sandboxClient.exec).toHaveBeenCalledTimes(2);
				expect(workspaceExec.mock.calls[1][0]).toContain('cd apps/other && ');
			},
		);

		it('treats an HTML 404 from the port route as a gone dev server, not a missing route', async () => {
			await service.ensure(input);
			fetchMock
				.mockResolvedValueOnce(httpResponse(404, { 'Content-Type': 'text/html; charset=utf-8' }))
				.mockResolvedValue(httpResponse(200));

			await expect(service.ensure(input)).resolves.toMatchObject({ status: 'ready' });
			expect(sandboxClient.exec).toHaveBeenCalledTimes(2);
			await expect(service.ensure({ ...input, appId: 'app-2' })).resolves.toMatchObject({
				status: 'ready',
			});
		});

		it('treats a 404 from the port route as gone when the sandbox is gone too', async () => {
			await service.ensure(input);
			fetchMock.mockResolvedValue(httpResponse(404));
			sandboxClient.getSandbox.mockRejectedValue(new SandboxServiceError('not found', 404));

			await expect(service.ensure(input)).resolves.toEqual({
				status: 'unavailable',
				reason: 'sandbox',
			});
		});

		it('probes an existing dev server instead of starting it again', async () => {
			const first = await service.ensure(input);
			const second = await service.ensure(input);

			expect(second).toEqual(first);
			expect(sandboxClient.exec).toHaveBeenCalledTimes(1);
			expect(fetchMock).toHaveBeenCalledTimes(2);
		});

		it('restarts the dev server when the probe reports a restarted sandbox', async () => {
			const first = await service.ensure(input);
			fetchMock
				.mockResolvedValueOnce(httpResponse(409, { 'X-Sandbox-Restarted': '1' }))
				.mockResolvedValue(httpResponse(200));

			const second = await service.ensure(input);

			expect(second.status).toBe('ready');
			expect(second).not.toEqual(first);
			expect(sandboxClient.exec).toHaveBeenCalledTimes(2);
			expect(service.resolveToken(tokenOf(first))).toBeUndefined();
		});

		it('restarts the dev server when the probe cannot connect', async () => {
			await service.ensure(input);
			fetchMock
				.mockRejectedValueOnce(new Error('ECONNREFUSED'))
				.mockResolvedValue(httpResponse(200));

			await expect(service.ensure(input)).resolves.toMatchObject({ status: 'ready' });
			expect(sandboxClient.exec).toHaveBeenCalledTimes(2);
		});

		it('shares one start between concurrent callers', async () => {
			let finishStart: (result: ExecResult) => void = () => {};
			sandboxClient.exec.mockImplementationOnce(
				async () => await new Promise<ExecResult>((resolve) => (finishStart = resolve)),
			);

			const first = service.ensure(input);
			await vi.waitFor(() => expect(sandboxClient.exec).toHaveBeenCalledTimes(1));
			const second = service.ensure(input);
			const third = service.ensure(input);
			await expect(third).resolves.toEqual({ status: 'starting' });

			finishStart(execOk);
			const results = await Promise.all([first, second]);
			expect(results[0].status).toBe('ready');
			expect(results[1]).toEqual({ status: 'starting' });
			expect(sandboxClient.exec).toHaveBeenCalledTimes(1);
		});

		it('hands off to polling when the start outlasts the handoff window', async () => {
			vi.useFakeTimers();
			let finishStart: (result: ExecResult) => void = () => {};
			sandboxClient.exec.mockImplementationOnce(
				async () => await new Promise<ExecResult>((resolve) => (finishStart = resolve)),
			);

			const first = service.ensure(input);
			await vi.advanceTimersByTimeAsync(1_999);
			expect(sandboxClient.exec).toHaveBeenCalledTimes(1);
			await vi.advanceTimersByTimeAsync(1);
			await expect(first).resolves.toEqual({ status: 'starting' });
			await expect(service.ensure(input)).resolves.toEqual({ status: 'starting' });

			finishStart(execOk);
			await vi.advanceTimersByTimeAsync(0);
			await expect(service.ensure(input)).resolves.toMatchObject({ status: 'ready' });
			expect(sandboxClient.exec).toHaveBeenCalledTimes(1);
		});

		it('lets a sibling start settle before replacing it, so its probe never poisons the route cache', async () => {
			const starts: Array<(result: ExecResult) => void> = [];
			let liveToken = '';
			sandboxClient.exec.mockImplementation(async (_id, request) => {
				const base = /APP_BASE=\/apps-preview\/([\w.-]+)\//.exec(request.command);
				if (!base) return execOk;
				liveToken = base[1];
				return await new Promise<ExecResult>((resolve) => starts.push(resolve));
			});
			// Like Vite: only the base of the dev server that is running answers; anything else is an HTML 404.
			fetchMock.mockImplementation(async (url) =>
				String(url).includes(`/apps-preview/${liveToken}/`)
					? httpResponse(200)
					: httpResponse(404, { 'Content-Type': 'text/html' }),
			);

			const first = service.ensure(input);
			await vi.waitFor(() => expect(starts).toHaveLength(1));
			const second = service.ensure({ ...input, appId: 'app-2', namespace: 'other' });
			await new Promise((resolve) => setTimeout(resolve, 20));
			expect(starts).toHaveLength(1);
			expect(sandboxClient.exec).toHaveBeenCalledTimes(1);

			starts[0](execOk);
			await expect(first).resolves.toMatchObject({ status: 'ready' });
			await vi.waitFor(() => expect(starts).toHaveLength(2));
			starts[1](execOk);
			const result = await second;

			expect(result.status).toBe('ready');
			expect(service.resolveToken(tokenOf(await first))).toBeUndefined();
			expect(service.resolveToken(tokenOf(result))).toMatchObject({ appId: 'app-2' });
			await expect(
				service.ensure({ ...input, appId: 'app-2', namespace: 'other' }),
			).resolves.toEqual(result);
		});

		it('does not resurrect an entry that was cleared while it was starting', async () => {
			let finishStart: (result: ExecResult) => void = () => {};
			sandboxClient.exec.mockImplementationOnce(
				async () => await new Promise<ExecResult>((resolve) => (finishStart = resolve)),
			);

			const first = service.ensure(input);
			await vi.waitFor(() => expect(sandboxClient.exec).toHaveBeenCalledTimes(1));
			service.clearThread('thread-1');
			finishStart(execOk);
			const result = await first;

			expect(service.resolveToken(tokenOf(result))).toBeUndefined();
		});

		it('replaces the dev server of another app in the same sandbox', async () => {
			const first = await service.ensure(input);
			const second = await service.ensure({ ...input, appId: 'app-2', namespace: 'other' });

			expect(second.status).toBe('ready');
			expect(service.resolveToken(tokenOf(first))).toBeUndefined();
			expect(service.resolveToken(tokenOf(second))).toMatchObject({ appId: 'app-2' });
			expect(sandboxClient.exec).toHaveBeenCalledTimes(3);
			expect(sandboxClient.exec.mock.calls[1][1].command).toBe(buildDevServerStopScript('greeter'));
			expect(sandboxClient.exec.mock.calls[1][1].command).toBe(
				'cd apps/greeter && [ -f .n8n-dev.pid ] && kill "$(cat .n8n-dev.pid)" 2>/dev/null',
			);
			expect(sandboxClient.exec.mock.calls[2][1].command).toContain('cd apps/other && ');
		});

		it('returns unavailable/sandbox when the sandbox client throws unexpectedly', async () => {
			sandboxClient.exec.mockRejectedValue(new Error('socket hang up'));

			await expect(service.ensure(input)).resolves.toEqual({
				status: 'unavailable',
				reason: 'sandbox',
			});
		});

		it('starts the dev server during a run', async () => {
			hasActiveRun.mockReturnValue(true);

			await expect(service.ensure(input)).resolves.toMatchObject({ status: 'ready' });
			expect(sandboxClient.exec).toHaveBeenCalledTimes(1);
		});
	});

	describe('built preview', () => {
		/** A provider without a port route, like Daytona: the controller hands over no sandbox service. */
		const builtInput: EnsureAppPreviewInput = { ...input, sandbox: undefined };
		const workspaceCommands = () => workspaceExec.mock.calls.map(([command]) => command);
		const buildOptions = (index: number) => workspaceExec.mock.calls[index][2];
		const rebuild = async () => await service.rebuildIfBuilt('thread-1', workspace);

		it('builds the app through the thread workspace when the provider has no sandbox service', async () => {
			const result = await service.ensure(builtInput);

			expect(result.status).toBe('ready');
			if (result.status !== 'ready') return;
			const token = tokenOf(result);
			expect(result.url).toBe(`/apps-preview/${token}/?b=1`);
			expect(workspaceFs.exists.mock.calls[0][0]).toBe(`${ROOT}/apps/greeter/package.json`);
			expect(workspaceCommands()).toEqual([
				buildPreviewBuildScript({ namespace: 'greeter', token }),
			]);
			expect(workspaceCommands()[0]).toBe(
				`cd apps/greeter && ulimit -c 0 && APP_BASE=/apps-preview/${token}/ VITE_N8N_API_BASE=/apps/greeter/api VITE_N8N_PREVIEW=1 CI=true node_modules/.bin/vite build --outDir .n8n-preview-dist > .n8n-dev.log 2>&1 || { tail -c 4096 .n8n-dev.log; exit 1; }`,
			);
			expect(buildOptions(0)).toMatchObject({ cwd: ROOT, timeout: 600_000 });
			expect(sandboxClient.exec).not.toHaveBeenCalled();
			expect(sandboxClient.getSandbox).not.toHaveBeenCalled();
			expect(fetchMock).not.toHaveBeenCalled();
			expect(service.resolveToken(token)).toMatchObject({
				kind: 'built',
				buildSeq: 1,
				dist: { dir: 'apps/greeter/.n8n-preview-dist' },
			});
		});

		it('restores the stored source through the workspace before the first build', async () => {
			workspaceFs.exists.mockResolvedValueOnce(false);
			workspaceExec.mockImplementation(async (command) =>
				command === buildOccupiedCheckScript(APP_DIR) ? { ...commandOk, exitCode: 1 } : commandOk,
			);

			await expect(service.ensure(builtInput)).resolves.toMatchObject({ status: 'ready' });

			expect(getSourceTarball).toHaveBeenCalledTimes(1);
			expect(workspaceCommands()).toEqual([
				buildOccupiedCheckScript(APP_DIR),
				`mkdir -p ${ROOT}/.app-builds ${APP_DIR}`,
				expect.stringMatching(
					/^tar -xzf .* npm install --ignore-scripts --no-audit --no-fund --prefer-offline\)$/,
				),
				expect.stringContaining('vite build --outDir .n8n-preview-dist'),
			]);
			expect(buildOptions(2)).toMatchObject({ env: { CI: 'true' }, timeout: 600_000 });
			const [tarballPath, written] = workspaceFs.writeFile.mock.calls[0];
			expect(tarballPath).toMatch(
				/^\/home\/user\/workspace\/\.app-builds\/greeter-\d+-preview-restore\.tgz$/,
			);
			expect(written).toBe(tarball.data);
			expect(workspaceCommands()[2]).toBe(buildRestoreScript({ appDir: APP_DIR, tarballPath }));
			expect(sandboxClient.writeFile).not.toHaveBeenCalled();
		});

		it('returns no-source when the app directory is missing and nothing is stored', async () => {
			workspaceFs.exists.mockResolvedValueOnce(false);
			getSourceTarball.mockResolvedValue(null);

			await expect(service.ensure(builtInput)).resolves.toEqual({ status: 'no-source' });
			expect(workspaceExec).not.toHaveBeenCalled();
		});

		it('returns unavailable/sandbox when the thread has no workspace', async () => {
			getWorkspace.mockResolvedValue(undefined);

			await expect(service.ensure(builtInput)).resolves.toEqual({
				status: 'unavailable',
				reason: 'sandbox',
			});
		});

		it('reports a failed build once as start-failed with the log tail, then builds again', async () => {
			workspaceExec.mockResolvedValueOnce({
				...commandOk,
				exitCode: 1,
				success: false,
				stdout: 'error during build:\nRollupError: boom',
			});

			await expect(service.ensure(builtInput)).resolves.toEqual({
				status: 'unavailable',
				reason: 'start-failed',
				log: 'error during build:\nRollupError: boom',
			});
			await expect(service.ensure(builtInput)).resolves.toMatchObject({
				status: 'ready',
				url: expect.stringMatching(/\?b=1$/),
			});
			expect(workspaceExec).toHaveBeenCalledTimes(2);
		});

		it('keeps the URL while the dist is still there and rebuilds from scratch when it is gone', async () => {
			const first = await service.ensure(builtInput);
			await expect(service.ensure(builtInput)).resolves.toEqual(first);
			expect(workspaceFs.exists.mock.lastCall?.[0]).toBe(DIST_INDEX);
			expect(workspaceExec).toHaveBeenCalledTimes(1);

			workspaceFs.exists.mockResolvedValueOnce(false);
			const second = await service.ensure(builtInput);

			expect(second).toMatchObject({ status: 'ready', url: expect.stringMatching(/\?b=1$/) });
			expect(second).not.toEqual(first);
			expect(service.resolveToken(tokenOf(first))).toBeUndefined();
			expect(workspaceExec).toHaveBeenCalledTimes(2);
		});

		describe('rebuildIfBuilt', () => {
			it('rebuilds after a turn and bumps the build sequence in the URL', async () => {
				const first = await service.ensure(builtInput);
				const token = tokenOf(first);

				await rebuild();

				expect(workspaceCommands()).toEqual([
					buildPreviewBuildScript({ namespace: 'greeter', token }),
					buildPreviewBuildScript({ namespace: 'greeter', token }),
				]);
				await expect(service.ensure(builtInput)).resolves.toMatchObject({
					url: `/apps-preview/${token}/?b=2`,
				});
				expect(service.resolveToken(token)).toMatchObject({ buildSeq: 2 });
			});

			it('makes an ensure that arrives during the rebuild wait for the new build', async () => {
				const first = await service.ensure(builtInput);
				let finishBuild: (result: CommandResult) => void = () => {};
				workspaceExec.mockImplementationOnce(
					async () => await new Promise<CommandResult>((resolve) => (finishBuild = resolve)),
				);

				const rebuilding = rebuild();
				const ensured = service.ensure(builtInput);
				await new Promise((resolve) => setTimeout(resolve, 20));
				expect(workspaceExec).toHaveBeenCalledTimes(2);

				finishBuild(commandOk);
				await rebuilding;
				await expect(ensured).resolves.toMatchObject({
					status: 'ready',
					url: `/apps-preview/${tokenOf(first)}/?b=2`,
				});
			});

			it('answers starting when the rebuild outlasts the wait, then ready with the new build', async () => {
				vi.useFakeTimers();
				await service.ensure(builtInput);
				let finishBuild: (result: CommandResult) => void = () => {};
				workspaceExec.mockImplementationOnce(
					async () => await new Promise<CommandResult>((resolve) => (finishBuild = resolve)),
				);

				const rebuilding = rebuild();
				const ensured = service.ensure(builtInput);
				await vi.advanceTimersByTimeAsync(45_000);
				await expect(ensured).resolves.toEqual({ status: 'starting' });

				finishBuild(commandOk);
				await rebuilding;
				await expect(service.ensure(builtInput)).resolves.toMatchObject({
					url: expect.stringMatching(/\?b=2$/),
				});
			});

			it('runs one rebuild at a time per preview and follows an in-flight one with one more', async () => {
				await service.ensure(builtInput);
				const builds: Array<(result: CommandResult) => void> = [];
				workspaceExec.mockImplementation(
					async () => await new Promise<CommandResult>((resolve) => builds.push(resolve)),
				);

				const first = rebuild();
				const second = rebuild();
				await new Promise((resolve) => setTimeout(resolve, 20));
				expect(builds).toHaveLength(1);

				builds[0](commandOk);
				await first;
				await vi.waitFor(() => expect(builds).toHaveLength(2));
				builds[1](commandOk);
				await second;

				expect(service.resolveToken(tokenOf(await service.ensure(builtInput)))).toMatchObject({
					buildSeq: 3,
				});
			});

			it('reports a failed rebuild once on the next ensure, then starts over', async () => {
				const first = await service.ensure(builtInput);
				workspaceExec.mockResolvedValueOnce({
					...commandOk,
					exitCode: 1,
					success: false,
					stdout: 'RollupError: boom',
				});

				await rebuild();

				expect(service.resolveToken(tokenOf(first))).toBeUndefined();
				await expect(service.ensure(builtInput)).resolves.toEqual({
					status: 'unavailable',
					reason: 'start-failed',
					log: 'RollupError: boom',
				});
				const second = await service.ensure(builtInput);
				expect(second).toMatchObject({ status: 'ready', url: expect.stringMatching(/\?b=1$/) });
				expect(tokenOf(second)).not.toBe(tokenOf(first));
			});

			it('leaves dev-server previews and other threads alone', async () => {
				await service.ensure(input);
				await service.ensure({ ...builtInput, threadId: 'thread-2' });
				workspaceExec.mockClear();

				await rebuild();

				expect(workspaceExec).not.toHaveBeenCalled();
			});
		});

		describe('first build during a run', () => {
			beforeEach(() => {
				hasActiveRun.mockReturnValue(true);
			});

			it('restores and installs but does not build while the run is active', async () => {
				workspaceFs.exists.mockResolvedValueOnce(false);
				workspaceExec.mockImplementation(async (command) =>
					command === buildOccupiedCheckScript(APP_DIR) ? { ...commandOk, exitCode: 1 } : commandOk,
				);

				await expect(service.ensure(builtInput)).resolves.toEqual({ status: 'starting' });
				await expect(service.ensure(builtInput)).resolves.toEqual({ status: 'starting' });

				expect(workspaceCommands()).toEqual([
					buildOccupiedCheckScript(APP_DIR),
					`mkdir -p ${ROOT}/.app-builds ${APP_DIR}`,
					expect.stringContaining('npm install'),
				]);
				expect(workspaceCommands()).not.toContainEqual(expect.stringContaining('vite build'));
				expect(getSourceTarball).toHaveBeenCalledTimes(1);
			});

			it('builds the pending preview when the run completes and answers the ensure that waited for it', async () => {
				await expect(service.ensure(builtInput)).resolves.toEqual({ status: 'starting' });
				expect(workspaceExec).not.toHaveBeenCalled();
				let finishBuild: (result: CommandResult) => void = () => {};
				workspaceExec.mockImplementationOnce(
					async () => await new Promise<CommandResult>((resolve) => (finishBuild = resolve)),
				);

				const rebuilding = rebuild();
				hasActiveRun.mockReturnValue(false);
				const ensured = service.ensure(builtInput);
				await new Promise((resolve) => setTimeout(resolve, 20));
				expect(workspaceExec).toHaveBeenCalledTimes(1);

				finishBuild(commandOk);
				await rebuilding;
				const result = await ensured;

				expect(result).toMatchObject({ status: 'ready', url: expect.stringMatching(/\?b=1$/) });
				const token = tokenOf(result);
				expect(workspaceCommands()).toEqual([
					buildPreviewBuildScript({ namespace: 'greeter', token }),
				]);
				expect(service.resolveToken(token)).toMatchObject({
					buildSeq: 1,
					dist: { dir: 'apps/greeter/.n8n-preview-dist' },
				});
				await expect(service.ensure(builtInput)).resolves.toEqual(result);
			});

			it('builds on the next ensure when the run ended without completing', async () => {
				await expect(service.ensure(builtInput)).resolves.toEqual({ status: 'starting' });
				hasActiveRun.mockReturnValue(false);

				const result = await service.ensure(builtInput);

				expect(result).toMatchObject({ status: 'ready', url: expect.stringMatching(/\?b=1$/) });
				expect(workspaceCommands()).toEqual([
					buildPreviewBuildScript({ namespace: 'greeter', token: tokenOf(result) }),
				]);
				expect(getSourceTarball).not.toHaveBeenCalled();
			});
		});
	});

	describe('resolveToken', () => {
		it('returns the entry for a live token', async () => {
			const result = await service.ensure(input);

			expect(service.resolveToken(tokenOf(result))).toMatchObject({
				kind: 'dev',
				appId: 'app-1',
				threadId: 'thread-1',
				projectId: 'project-1',
				namespace: 'greeter',
				userId: 'user-1',
				port: 5173,
				sandbox: input.sandbox,
			});
		});

		it('rejects a token with a bad signature', async () => {
			const result = await service.ensure(input);
			const claims = jwt.decode(tokenOf(result));
			const forged = jwt.sign(claims as object, 'other-secret');

			expect(service.resolveToken(forged)).toBeUndefined();
			expect(service.resolveToken('not-a-jwt')).toBeUndefined();
		});

		it('rejects an expired token', async () => {
			vi.useFakeTimers({ now: new Date('2026-09-08T10:00:00Z') });
			const result = await service.ensure(input);
			vi.setSystemTime(new Date('2026-09-08T18:00:01Z'));

			expect(service.resolveToken(tokenOf(result))).toBeUndefined();
		});

		it('rejects a token with the same claims signed for another audience', async () => {
			const result = await service.ensure(input);
			const { aud, ...claims } = jwt.decode(tokenOf(result)) as jwt.JwtPayload;
			expect(aud).toBe('app-preview');

			expect(service.resolveToken(jwt.sign(claims, SECRET))).toBeUndefined();
			expect(service.resolveToken(jwt.sign(claims, SECRET, { audience: 'other' }))).toBeUndefined();
			expect(service.resolveToken(tokenOf(result))).toBeDefined();
		});

		it('rejects a validly signed token with an unknown jti', () => {
			const token = jwt.sign(
				{ sub: 'user-1', appId: 'app-1', threadId: 'thread-1', jti: 'unknown' },
				SECRET,
				{ audience: 'app-preview' },
			);

			expect(service.resolveToken(token)).toBeUndefined();
		});

		it('does not resolve the token of a start that failed after the handoff', async () => {
			vi.useFakeTimers();
			let liveToken = '';
			let finishStart: (result: ExecResult) => void = () => {};
			sandboxClient.exec.mockImplementationOnce(async (_id, request) => {
				liveToken = /APP_BASE=\/apps-preview\/([\w.-]+)\//.exec(request.command)?.[1] ?? '';
				return await new Promise<ExecResult>((resolve) => (finishStart = resolve));
			});

			const first = service.ensure(input);
			await vi.advanceTimersByTimeAsync(2_000);
			await expect(first).resolves.toEqual({ status: 'starting' });
			expect(service.resolveToken(liveToken)).toBeUndefined();
			finishStart({ ...execOk, exitCode: 1, success: false, stdout: 'boom' });
			await vi.advanceTimersByTimeAsync(0);

			expect(service.resolveToken(liveToken)).toBeUndefined();
			await expect(service.ensure(input)).resolves.toMatchObject({ reason: 'start-failed' });
		});

		it('rejects a token after the entry was marked dead', async () => {
			const result = await service.ensure(input);
			const entry = service.resolveToken(tokenOf(result));
			expect(entry).toBeDefined();
			if (!entry) return;

			service.markDead(entry);

			expect(service.resolveToken(tokenOf(result))).toBeUndefined();
		});

		it('rejects a token after the thread was cleared', async () => {
			const result = await service.ensure(input);

			service.clearThread('thread-1');

			expect(service.resolveToken(tokenOf(result))).toBeUndefined();
		});
	});
});

function tokenOf(result: Awaited<ReturnType<AppPreviewService['ensure']>>): string {
	if (result.status !== 'ready') throw new Error(`expected ready, got ${result.status}`);
	return result.url.split('/')[2];
}
