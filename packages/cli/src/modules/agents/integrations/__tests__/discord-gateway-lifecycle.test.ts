import type { Logger } from '@n8n/backend-common';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { AgentChatIntegrationContext } from '../agent-chat-integration';
import { DiscordIntegration } from '../platforms/discord-integration';

const hoisted = vi.hoisted(() => ({
	adapter: undefined as unknown,
	createAdapter: undefined as (() => unknown) | undefined,
}));

vi.mock('../esm-loader', () => ({
	loadDiscordAdapter: async () => ({
		createDiscordAdapter: () => hoisted.createAdapter?.() ?? hoisted.adapter,
	}),
}));

type GatewayListenerOptions = {
	waitUntil?: (task: Promise<unknown>) => void;
};

type StartGatewayListener = (
	options: GatewayListenerOptions,
	durationMs?: number,
	abortSignal?: AbortSignal,
	webhookUrl?: string,
) => Promise<{ ok: boolean; text: () => Promise<string> }>;

function createFakeAdapter(options?: { resolveImmediately?: boolean; ok?: boolean }) {
	const calls: Array<{ signal?: AbortSignal }> = [];
	let resolveCurrent: (() => void) | undefined;
	let resolveImmediately = options?.resolveImmediately ?? false;
	const ok = options?.ok ?? true;

	const startGatewayListener: StartGatewayListener = async (
		listenerOptions,
		_durationMs,
		signal,
	) => {
		calls.push({ signal });

		let settle!: () => void;
		const listener = new Promise<void>((resolve) => {
			settle = resolve;
		});

		resolveCurrent = settle;

		if (signal) {
			signal.addEventListener('abort', () => settle(), { once: true });
		}

		listenerOptions.waitUntil?.(listener);

		if (resolveImmediately) {
			settle();
		}

		return {
			ok,
			text: async () => (ok ? '' : 'Chat instance not initialized'),
		};
	};

	return {
		startGatewayListener: vi.fn(startGatewayListener),
		calls,
		resolveCurrentListener: () => resolveCurrent?.(),
		setResolveImmediately: (value: boolean) => {
			resolveImmediately = value;
		},
	};
}

function connectionContext(): AgentChatIntegrationContext {
	return {
		agentId: 'agent-1',
		projectId: 'project-1',
		credentialId: 'cred-discord',
		credential: {
			botToken: 'test-bot-token',
			publicKey: 'a'.repeat(64),
			applicationId: '900000000000000001',
		},
		webhookUrlFor: () => 'https://n8n.example.com/webhook',
	};
}

describe('DiscordIntegration Gateway lifecycle', () => {
	let integration: DiscordIntegration;
	let fake: ReturnType<typeof createFakeAdapter>;
	const ctx = connectionContext();

	beforeEach(() => {
		fake = createFakeAdapter();
		hoisted.adapter = fake;
		hoisted.createAdapter = undefined;
		integration = new DiscordIntegration(
			mock<Logger>(),
			mock<InstanceSettings>({ isLeader: true }),
		);
	});

	afterEach(async () => {
		await integration.stopAllGateways();
	});

	async function connect(): Promise<void> {
		await integration.createAdapter(ctx);
		await integration.onConnected(ctx);
	}

	it('opens a single Gateway socket when a leader takeover races the connect', async () => {
		await connect();
		integration.startAllGateways();

		expect(fake.startGatewayListener).toHaveBeenCalledTimes(1);
	});

	it('closes the socket when the connection goes away', async () => {
		await connect();
		const signal = fake.calls[0]?.signal;
		expect(signal).toBeDefined();

		await integration.onDisconnected(ctx);

		expect(signal!.aborted).toBe(true);

		integration.startAllGateways();
		expect(fake.startGatewayListener).toHaveBeenCalledTimes(1);
	});

	it('backs off instead of spinning when the listener exits immediately', async () => {
		vi.useFakeTimers();
		try {
			fake.setResolveImmediately(true);
			await connect();

			await vi.advanceTimersByTimeAsync(3000);

			expect(fake.startGatewayListener.mock.calls.length).toBeLessThan(6);
		} finally {
			vi.useRealTimers();
		}
	});

	it('reopens the socket when a takeover lands while a stepdown is still draining', async () => {
		await connect();
		expect(fake.startGatewayListener).toHaveBeenCalledTimes(1);

		const stepdown = integration.stopAllGateways();
		integration.startAllGateways();

		fake.resolveCurrentListener();
		await stepdown;

		expect(fake.startGatewayListener).toHaveBeenCalledTimes(2);
	});

	it('does not restart a session that was disconnected while a stepdown was draining', async () => {
		await connect();
		expect(fake.startGatewayListener).toHaveBeenCalledTimes(1);

		const stepdown = integration.stopAllGateways();
		integration.startAllGateways();
		const disconnect = integration.onDisconnected(ctx);

		fake.resolveCurrentListener();
		await disconnect;
		await stepdown;

		expect(fake.startGatewayListener).toHaveBeenCalledTimes(1);
		expect(fake.calls.every((call) => call.signal?.aborted)).toBe(true);
	});

	it('keeps every socket up when a takeover overtakes a stepdown', async () => {
		const fakeA = createFakeAdapter();
		const fakeB = createFakeAdapter();
		const adapters = [fakeA, fakeB];
		let next = 0;
		hoisted.createAdapter = () => adapters[next++];

		const ctxA = connectionContext();
		const ctxB: AgentChatIntegrationContext = {
			...connectionContext(),
			agentId: 'agent-2',
		};

		await integration.createAdapter(ctxA);
		await integration.onConnected(ctxA);
		await integration.createAdapter(ctxB);
		await integration.onConnected(ctxB);

		expect(fakeA.startGatewayListener).toHaveBeenCalledTimes(1);
		expect(fakeB.startGatewayListener).toHaveBeenCalledTimes(1);

		const stepdown = integration.stopAllGateways();
		integration.startAllGateways();

		fakeA.resolveCurrentListener();
		fakeB.resolveCurrentListener();
		await stepdown;

		// A was mid-drain when the takeover landed, so it restarts (2 calls).
		// B was never reached by the invalidated stepdown, so its original
		// socket stays up. Without the sweep guard, the stepdown would continue
		// to B after A and wipe the takeover's intent — B's signal ends aborted.
		expect(fakeA.startGatewayListener).toHaveBeenCalledTimes(2);
		expect(fakeA.calls.at(-1)?.signal?.aborted).toBe(false);
		expect(fakeB.calls.at(-1)?.signal?.aborted).toBe(false);
	});

	it('does not leave a socket behind when a takeover races a disconnect', async () => {
		await connect();
		expect(fake.startGatewayListener).toHaveBeenCalledTimes(1);

		const disconnect = integration.onDisconnected(ctx);
		integration.startAllGateways();

		fake.resolveCurrentListener();
		await disconnect;

		expect(fake.startGatewayListener).toHaveBeenCalledTimes(1);
	});

	it('stops the previous socket when the same connection is re-established', async () => {
		await connect();
		const firstSignal = fake.calls[0]?.signal;
		expect(firstSignal).toBeDefined();

		await integration.createAdapter(ctx);
		await integration.onConnected(ctx);

		expect(firstSignal!.aborted).toBe(true);
		expect(fake.startGatewayListener).toHaveBeenCalledTimes(2);
	});

	it('retries with backoff when the listener refuses to start', async () => {
		vi.useFakeTimers();
		try {
			fake = createFakeAdapter({ ok: false });
			hoisted.adapter = fake;
			integration = new DiscordIntegration(
				mock<Logger>(),
				mock<InstanceSettings>({ isLeader: true }),
			);

			await connect();

			await vi.advanceTimersByTimeAsync(3000);

			expect(fake.startGatewayListener.mock.calls.length).toBeGreaterThan(1);
			expect(fake.startGatewayListener.mock.calls.length).toBeLessThan(6);
		} finally {
			vi.useRealTimers();
		}
	});

	it('opens no second socket when two stepdowns overlap on one session', async () => {
		await connect();
		expect(fake.startGatewayListener).toHaveBeenCalledTimes(1);

		const stepdown1 = integration.stopAllGateways();
		integration.startAllGateways();
		const stepdown2 = integration.stopAllGateways();
		integration.startAllGateways();

		fake.resolveCurrentListener();
		await stepdown1;
		await stepdown2;

		const liveSignals = fake.calls.filter((call) => call.signal && !call.signal.aborted);
		expect(liveSignals).toHaveLength(1);
	});

	it('opens no second socket when a takeover races a reconnect', async () => {
		await connect();
		expect(fake.startGatewayListener).toHaveBeenCalledTimes(1);

		await integration.createAdapter(ctx);
		const reconnect = integration.onConnected(ctx);
		integration.startAllGateways();

		fake.resolveCurrentListener();
		await reconnect;

		const liveSignals = fake.calls.filter((call) => call.signal && !call.signal.aborted);
		expect(liveSignals).toHaveLength(1);
	});
});
