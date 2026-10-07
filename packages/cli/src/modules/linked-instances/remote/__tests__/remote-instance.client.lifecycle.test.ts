import type { CustomFetch } from '@n8n/backend-network';
import { UnexpectedError } from '@n8n/errors';

import type { RemoteInstanceClient } from '../remote-instance.client';
import {
	catchError,
	ClientHarness,
	pagedToolsRemote,
	slowStages,
	TOOL_NAMES,
} from './remote-instance.test-helpers';

describe('RemoteInstanceClient lifecycle', () => {
	let harness: ClientHarness;

	beforeEach(() => {
		harness = new ClientHarness();
	});

	afterEach(async () => await harness.dispose());

	describe('transports', () => {
		it('builds one transport for probes and one for calls, and reuses each', async () => {
			const client = harness.createClient();

			await client.probe();
			await client.probe();
			await client.listToolNames();
			await client.callTool('greet', {});

			const limits = harness.outboundHttp.transport.mock.calls.map(
				([options]) => options?.timeouts,
			);
			expect(limits).toEqual([
				{ headersTimeout: 10_000, bodyTimeout: 10_000 },
				{ headersTimeout: 60_000, bodyTimeout: 60_000 },
			]);
		});

		it('builds no transport before the first request', async () => {
			const client = harness.createClient();

			await client.close();

			expect(harness.outboundHttp.transport).not.toHaveBeenCalled();
		});

		it('destroys each transport once when it closes, also when close is called twice', async () => {
			const client = harness.createClient();
			await client.probe();
			await client.callTool('greet', {});

			await client.close();
			await client.close();

			expect(harness.dispatchers).toHaveLength(2);
			for (const dispatcher of harness.dispatchers) {
				expect(dispatcher.destroy).toHaveBeenCalledTimes(1);
			}
		});

		it('closes even when a transport fails to be destroyed', async () => {
			const client = harness.createClient();
			await client.probe();
			harness.dispatchers[0].destroy.mockRejectedValue(new Error('Already destroyed'));

			await expect(client.close()).resolves.toBeUndefined();
		});
	});

	describe('after close', () => {
		it.each<[string, (client: RemoteInstanceClient) => Promise<unknown>]>([
			['probe', async (client) => await client.probe()],
			['listToolNames', async (client) => await client.listToolNames()],
			['callTool', async (client) => await client.callTool('greet', {})],
		])('rejects %s with an UnexpectedError and sends nothing', async (_method, use) => {
			const client = harness.createClient();
			expect(await client.listToolNames()).toEqual(TOOL_NAMES);
			const requestsBefore = harness.remote.state.requests.length;

			await client.close();

			const error = await use(client).catch((caught: unknown) => caught);

			expect(error).toBeInstanceOf(UnexpectedError);
			expect(error).toHaveProperty('message', 'This linked instance client is closed');
			expect(harness.remote.state.requests).toHaveLength(requestsBefore);
			expect(harness.outboundHttp.transport).toHaveBeenCalledTimes(1);
		});

		it('fails a call that is still running when the client closes as unreachable', async () => {
			const client = harness.createClient();
			await client.listToolNames();
			const running = catchError(client.callTool('slow_tool', {}));
			await vi.waitFor(() => expect(harness.remote.state.rpcMethods).toContain('tools/call'));

			await client.close();

			expect((await running).reason).toBe('unreachable');
		});
	});

	describe('probe deadline', () => {
		const tools = pagedToolsRemote(() => ({ tools: ['a'] }));

		/** Starts the probe under fake timers and reports whether it settled after each step. */
		const probeWithFakeTimers = async (
			transportFetch: CustomFetch,
			steps: number[],
			probeDeadlineMs?: number,
		) => {
			harness.useTransportFetch(transportFetch);
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
			try {
				let settled = false;
				const pending = harness
					.createClient({ probeDeadlineMs })
					.probe()
					.finally(() => {
						settled = true;
					});
				const settledAfterStep: boolean[] = [];
				for (const ms of steps) {
					await vi.advanceTimersByTimeAsync(ms);
					settledAfterStep.push(settled);
				}
				return { result: await pending, settledAfterStep };
			} finally {
				vi.useRealTimers();
			}
		};

		it('ends the probe after 15 s across HEAD, initialize and the tool list', async () => {
			// Each stage stays under the 10 s limit for one request, but the three take 18 s.
			const slow = slowStages(tools, 6_000);

			const { result, settledAfterStep } = await probeWithFakeTimers(slow.fetch, [14_999, 1]);

			expect(settledAfterStep).toEqual([false, true]);
			expect(result).toEqual({ ok: false, reason: 'unreachable' });
			expect(slow.stages.map((stage) => stage.name)).toEqual(['HEAD', 'initialize', 'tools/list']);
			expect(slow.stages.at(-1)?.signal.aborted).toBe(true);
		});

		it('stops a request that is still open at the deadline', async () => {
			const slow = slowStages(tools, 20_000);

			const { result } = await probeWithFakeTimers(slow.fetch, [15_000]);

			expect(result).toEqual({ ok: false, reason: 'unreachable' });
			expect(slow.stages).toEqual([{ name: 'HEAD', signal: expect.any(AbortSignal) }]);
			expect(slow.stages[0].signal.aborted).toBe(true);
		});

		it('returns the tools when the whole probe takes less than 15 s', async () => {
			const slow = slowStages(tools, 4_000);

			const { result } = await probeWithFakeTimers(slow.fetch, [12_000]);

			expect(result).toEqual({ ok: true, toolNames: ['a'] });
		});

		it('uses the probe deadline from the input', async () => {
			const slow = slowStages(tools, 2_000);

			const { result, settledAfterStep } = await probeWithFakeTimers(slow.fetch, [4_999, 1], 5_000);

			expect(settledAfterStep).toEqual([false, true]);
			expect(result).toEqual({ ok: false, reason: 'unreachable' });
			expect(slow.stages.at(-1)?.signal.aborted).toBe(true);
		});

		it('ends the probe on time when a request ignores the abort signal', async () => {
			const neverAnswers: CustomFetch = async () => await new Promise<Response>(() => {});

			const { result, settledAfterStep } = await probeWithFakeTimers(neverAnswers, [15_000]);

			expect(settledAfterStep).toEqual([true]);
			expect(result).toEqual({ ok: false, reason: 'unreachable' });
		});

		it.each([0, -1, 1.5, 60_001, Number.NaN, Number.POSITIVE_INFINITY])(
			'refuses the probe deadline %s',
			(probeDeadlineMs) => {
				expect(() => harness.createClient({ probeDeadlineMs })).toThrow(UnexpectedError);
			},
		);
	});
});
