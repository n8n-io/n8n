import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import type { SlackCommsConfig } from '../slack-comms.config';
import { SlackInstallProvider } from '../slack-install.provider';
import { SlackSocketService } from '../slack-socket.service';

type SlackEventListener = (envelope: {
	ack: () => Promise<void>;
	body: unknown;
	type: string;
}) => Promise<void>;

const { socketModeClient, socketModeClientMock } = vi.hoisted(() => {
	const client = {
		on: vi.fn(),
		start: vi.fn().mockResolvedValue(undefined),
		disconnect: vi.fn().mockResolvedValue(undefined),
	};
	return {
		socketModeClient: client,
		socketModeClientMock: vi.fn().mockImplementation(function () {
			return client;
		}),
	};
});

vi.mock('@slack/socket-mode', () => ({
	// eslint-disable-next-line @typescript-eslint/naming-convention -- mirrors the real @slack/socket-mode export name
	SocketModeClient: socketModeClientMock,
}));

function config(over: Partial<SlackCommsConfig> = {}): SlackCommsConfig {
	return mock<SlackCommsConfig>({
		mode: 'direct',
		botToken: 'xoxb-token',
		appToken: 'xapp-token',
		signingSecret: 'sec',
		errorChannelId: 'C_OPS',
		streamMode: 'native',
		...over,
	});
}

function envelope(over: { ack?: () => Promise<void>; body?: unknown; type?: string } = {}) {
	return {
		ack: over.ack ?? vi.fn().mockResolvedValue(undefined),
		body: over.body ?? { event_id: 'Ev1', event: { ts: '1.1' } },
		type: over.type ?? 'events_api',
	};
}

async function startService(
	service: SlackSocketService,
	handlers: {
		onEvent?: (body: unknown) => Promise<void>;
		onInteractivity?: (body: unknown) => Promise<void>;
		resolveBotUserId?: () => Promise<string>;
	},
) {
	await service.start({
		onEvent: handlers.onEvent ?? vi.fn().mockResolvedValue(undefined),
		onInteractivity: handlers.onInteractivity ?? vi.fn().mockResolvedValue(undefined),
		resolveBotUserId: handlers.resolveBotUserId,
	});
	const registeredListener = socketModeClient.on.mock.calls.find(
		(call) => call[0] === 'slack_event',
	)?.[1] as SlackEventListener;
	return registeredListener;
}

describe('SlackSocketService', () => {
	let logger: Logger;
	let installProvider: SlackInstallProvider;

	beforeEach(() => {
		vi.clearAllMocks();
		logger = mock<Logger>();
		installProvider = new SlackInstallProvider(config());
	});

	it('skips connecting when the bot token is missing', async () => {
		const service = new SlackSocketService(config({ botToken: '' }), installProvider, logger);

		await service.start({
			onEvent: vi.fn().mockResolvedValue(undefined),
			onInteractivity: vi.fn().mockResolvedValue(undefined),
		});

		expect(socketModeClientMock).not.toHaveBeenCalled();
	});

	it('skips connecting when the app token is missing', async () => {
		const service = new SlackSocketService(config({ appToken: '' }), installProvider, logger);

		await service.start({
			onEvent: vi.fn().mockResolvedValue(undefined),
			onInteractivity: vi.fn().mockResolvedValue(undefined),
		});

		expect(socketModeClientMock).not.toHaveBeenCalled();
	});

	it('resolves and caches the bot user id when a resolver is provided', async () => {
		const service = new SlackSocketService(config(), installProvider, logger);
		const resolveBotUserId = vi.fn().mockResolvedValue('B1');

		await startService(service, { resolveBotUserId });

		expect(resolveBotUserId).toHaveBeenCalled();
		expect(installProvider.getInstall()?.botUserId).toBe('B1');
	});

	it('acks before dispatching to the event handler', async () => {
		const service = new SlackSocketService(config(), installProvider, logger);
		const onEvent = vi.fn().mockResolvedValue(undefined);
		const listener = await startService(service, { onEvent });

		const ack = vi.fn().mockResolvedValue(undefined);
		await listener(envelope({ ack }));

		expect(ack).toHaveBeenCalled();
		expect(onEvent).toHaveBeenCalledWith({ event_id: 'Ev1', event: { ts: '1.1' } });
	});

	it('routes interactive envelopes to the interactivity handler', async () => {
		const service = new SlackSocketService(config(), installProvider, logger);
		const onEvent = vi.fn().mockResolvedValue(undefined);
		const onInteractivity = vi.fn().mockResolvedValue(undefined);
		const listener = await startService(service, { onEvent, onInteractivity });

		await listener(envelope({ type: 'interactive', body: { trigger_id: 'T1' } }));

		expect(onInteractivity).toHaveBeenCalledWith({ trigger_id: 'T1' });
		expect(onEvent).not.toHaveBeenCalled();
	});

	it('drops a redelivered envelope with the same event_id', async () => {
		const service = new SlackSocketService(config(), installProvider, logger);
		const onEvent = vi.fn().mockResolvedValue(undefined);
		const listener = await startService(service, { onEvent });

		const body = { event_id: 'Ev1', event: { ts: '1.1' } };
		await listener(envelope({ body }));
		await listener(envelope({ body }));

		expect(onEvent).toHaveBeenCalledTimes(1);
	});

	it('drops a mention double-delivery that shares a message ts but carries a distinct event_id', async () => {
		const service = new SlackSocketService(config(), installProvider, logger);
		const onEvent = vi.fn().mockResolvedValue(undefined);
		const listener = await startService(service, { onEvent });

		await listener(envelope({ body: { event_id: 'Ev1', event: { ts: '1.1' } } }));
		await listener(envelope({ body: { event_id: 'Ev2', event: { ts: '1.1' } } }));

		expect(onEvent).toHaveBeenCalledTimes(1);
	});

	it('processes envelopes with distinct event_id and ts', async () => {
		const service = new SlackSocketService(config(), installProvider, logger);
		const onEvent = vi.fn().mockResolvedValue(undefined);
		const listener = await startService(service, { onEvent });

		await listener(envelope({ body: { event_id: 'Ev1', event: { ts: '1.1' } } }));
		await listener(envelope({ body: { event_id: 'Ev2', event: { ts: '2.2' } } }));

		expect(onEvent).toHaveBeenCalledTimes(2);
	});

	it('closes the socket on shutdown', async () => {
		const service = new SlackSocketService(config(), installProvider, logger);
		await startService(service, {});

		await service.shutdown();

		expect(socketModeClient.disconnect).toHaveBeenCalled();
	});

	it('does not error when shutdown is called before start', async () => {
		const service = new SlackSocketService(config(), installProvider, logger);

		await expect(service.shutdown()).resolves.toBeUndefined();
	});

	it('wraps a connection failure in an OperationalError', async () => {
		socketModeClient.start.mockRejectedValueOnce(new Error('boom'));
		const service = new SlackSocketService(config(), installProvider, logger);

		await expect(
			service.start({
				onEvent: vi.fn().mockResolvedValue(undefined),
				onInteractivity: vi.fn().mockResolvedValue(undefined),
			}),
		).rejects.toThrow('Failed to connect Slack socket mode client');
	});
});
