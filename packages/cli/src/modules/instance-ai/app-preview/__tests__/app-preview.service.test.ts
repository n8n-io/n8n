import { mockLogger } from '@n8n/backend-test-utils';
import type { ExecRequest, ExecResult, SandboxRecord } from '@n8n/sandbox-client';
import { SandboxServiceError } from '@n8n/sandbox-client';
import jwt from 'jsonwebtoken';
import { mock } from 'vitest-mock-extended';

import type { JwtService } from '@/services/jwt.service';

import {
	AppPreviewService,
	buildDevServerStartScript,
	type EnsureAppPreviewInput,
} from '../app-preview.service';

const sandboxClient = {
	getSandbox: vi.fn<(id: string) => Promise<SandboxRecord>>(),
	stat: vi.fn<(id: string, path: string) => Promise<unknown>>(),
	exec: vi.fn<(id: string, request: ExecRequest) => Promise<ExecResult>>(),
};

vi.mock('@n8n/sandbox-client', () => ({
	SandboxClient: class {
		getSandbox = sandboxClient.getSandbox;
		stat = sandboxClient.stat;
		exec = sandboxClient.exec;
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

const input: EnsureAppPreviewInput = {
	threadId: 'thread-1',
	appId: 'app-1',
	projectId: 'project-1',
	namespace: 'greeter',
	userId: 'user-1',
	sandbox: { url: 'http://sandbox.test', apiKey: 'sandbox-key' },
};

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
		fetchMock.mockResolvedValue(httpResponse(200));
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
				'/home/user/workspace/apps/greeter/package.json',
			);
			const startCommand = sandboxClient.exec.mock.calls[1][1].command;
			expect(startCommand).toBe(
				buildDevServerStartScript({ namespace: 'greeter', token: result.url.split('/')[2] }),
			);
			expect(startCommand).toContain(
				'npm install --ignore-scripts --no-audit --no-fund --prefer-offline',
			);
			expect(startCommand).toContain(
				'setsid nohup node_modules/.bin/vite --host 0.0.0.0 --port 5173 --strictPort > .n8n-dev.log',
			);
			expect(startCommand).toContain('VITE_N8N_API_BASE=/apps/greeter/api');
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringMatching(
					/^http:\/\/sandbox\.test\/sandboxes\/[0-9a-f-]{36}\/ports\/5173\/apps-preview\/[\w.-]+\/$/,
				),
				expect.objectContaining({ headers: { 'X-Api-Key': 'sandbox-key' } }),
			);
		});

		it('returns no-source when the app has no package.json in the sandbox', async () => {
			sandboxClient.stat.mockRejectedValue(new SandboxServiceError('not found', 404));

			await expect(service.ensure(input)).resolves.toEqual({ status: 'no-source' });
			expect(sandboxClient.exec).not.toHaveBeenCalled();
		});

		it('returns unavailable/sandbox when the sandbox does not exist', async () => {
			sandboxClient.getSandbox.mockRejectedValue(new SandboxServiceError('not found', 404));

			await expect(service.ensure(input)).resolves.toEqual({
				status: 'unavailable',
				reason: 'sandbox',
			});
		});

		it('returns unavailable/start-failed with the log tail when the start script exits non-zero', async () => {
			sandboxClient.exec.mockResolvedValueOnce(execOk).mockResolvedValueOnce({
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
			expect(sandboxClient.exec).toHaveBeenCalledTimes(4);
		});

		it.each([501, 404])(
			'returns unsupported/port-route on a plain %i from the port route and caches it',
			async (status) => {
				fetchMock.mockResolvedValue(httpResponse(status, { 'Content-Type': 'text/plain' }));

				await expect(service.ensure(input)).resolves.toEqual({
					status: 'unsupported',
					reason: 'port-route',
				});
				await expect(service.ensure({ ...input, appId: 'app-2' })).resolves.toEqual({
					status: 'unsupported',
					reason: 'port-route',
				});
				expect(fetchMock).toHaveBeenCalledTimes(1);
			},
		);

		it('treats an HTML 404 from the port route as a gone dev server, not a missing route', async () => {
			await service.ensure(input);
			fetchMock
				.mockResolvedValueOnce(httpResponse(404, { 'Content-Type': 'text/html; charset=utf-8' }))
				.mockResolvedValue(httpResponse(200));

			await expect(service.ensure(input)).resolves.toMatchObject({ status: 'ready' });
			expect(sandboxClient.exec).toHaveBeenCalledTimes(4);
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
			expect(sandboxClient.exec).toHaveBeenCalledTimes(2);
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
			expect(sandboxClient.exec).toHaveBeenCalledTimes(4);
			expect(service.resolveToken(tokenOf(first))).toBeUndefined();
		});

		it('restarts the dev server when the probe cannot connect', async () => {
			await service.ensure(input);
			fetchMock
				.mockRejectedValueOnce(new Error('ECONNREFUSED'))
				.mockResolvedValue(httpResponse(200));

			await expect(service.ensure(input)).resolves.toMatchObject({ status: 'ready' });
			expect(sandboxClient.exec).toHaveBeenCalledTimes(4);
		});

		it('shares one start between concurrent callers', async () => {
			let finishStart: (result: ExecResult) => void = () => {};
			sandboxClient.exec
				.mockResolvedValueOnce(execOk)
				.mockImplementationOnce(
					async () => await new Promise<ExecResult>((resolve) => (finishStart = resolve)),
				);

			const first = service.ensure(input);
			await vi.waitFor(() => expect(sandboxClient.exec).toHaveBeenCalledTimes(2));
			const second = service.ensure(input);
			const third = service.ensure(input);
			await expect(third).resolves.toEqual({ status: 'starting' });

			finishStart(execOk);
			const results = await Promise.all([first, second]);
			expect(results[0].status).toBe('ready');
			expect(results[1]).toEqual({ status: 'starting' });
			expect(sandboxClient.exec).toHaveBeenCalledTimes(2);
		});

		it('hands off to polling when the start outlasts the handoff window', async () => {
			vi.useFakeTimers();
			let finishStart: (result: ExecResult) => void = () => {};
			sandboxClient.exec
				.mockResolvedValueOnce(execOk)
				.mockImplementationOnce(
					async () => await new Promise<ExecResult>((resolve) => (finishStart = resolve)),
				);

			const first = service.ensure(input);
			await vi.advanceTimersByTimeAsync(1_999);
			expect(sandboxClient.exec).toHaveBeenCalledTimes(2);
			await vi.advanceTimersByTimeAsync(1);
			await expect(first).resolves.toEqual({ status: 'starting' });
			await expect(service.ensure(input)).resolves.toEqual({ status: 'starting' });

			finishStart(execOk);
			await vi.advanceTimersByTimeAsync(0);
			await expect(service.ensure(input)).resolves.toMatchObject({ status: 'ready' });
			expect(sandboxClient.exec).toHaveBeenCalledTimes(2);
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
			expect(sandboxClient.exec).toHaveBeenCalledTimes(2);

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
			sandboxClient.exec
				.mockResolvedValueOnce(execOk)
				.mockImplementationOnce(
					async () => await new Promise<ExecResult>((resolve) => (finishStart = resolve)),
				);

			const first = service.ensure(input);
			await vi.waitFor(() => expect(sandboxClient.exec).toHaveBeenCalledTimes(2));
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
			expect(sandboxClient.exec.mock.calls[2][1].command).toContain('pkill -f "vite --host"');
		});

		it('returns unavailable/sandbox when the sandbox client throws unexpectedly', async () => {
			sandboxClient.exec.mockRejectedValue(new Error('socket hang up'));

			await expect(service.ensure(input)).resolves.toEqual({
				status: 'unavailable',
				reason: 'sandbox',
			});
		});
	});

	describe('resolveToken', () => {
		it('returns the entry for a live token', async () => {
			const result = await service.ensure(input);

			expect(service.resolveToken(tokenOf(result))).toMatchObject({
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
