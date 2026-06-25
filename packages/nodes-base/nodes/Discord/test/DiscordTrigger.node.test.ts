import type { ICredentialDataDecryptedObject, ITriggerFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { DiscordTrigger } from '../DiscordTrigger.node';

interface TestGateway {
	options: { token: string; intents: number };
	connect: ReturnType<typeof vi.fn>;
	close: ReturnType<typeof vi.fn>;
	emit(event: string, ...args: unknown[]): void;
}

const { gatewayInstances, connect, close, ctor } = vi.hoisted(() => {
	const connect = vi.fn();
	const close = vi.fn();
	const gatewayInstances: TestGateway[] = [];

	class FakeGateway {
		options: { token: string; intents: number };
		connect = connect;
		close = close;
		private handlers: Record<string, Array<(...args: unknown[]) => void>> = {};

		constructor(options: { token: string; intents: number }) {
			this.options = options;
			gatewayInstances.push(this);
		}

		on(event: string, cb: (...args: unknown[]) => void) {
			(this.handlers[event] ||= []).push(cb);
			return this;
		}

		emit(event: string, ...args: unknown[]) {
			(this.handlers[event] ?? []).forEach((cb) => cb.apply(undefined, args));
		}

		getBotUserId() {
			return undefined;
		}
	}

	const ctor = vi.fn(function (options: { token: string; intents: number }) {
		return new FakeGateway(options);
	});

	return { gatewayInstances, connect, close, ctor };
});

vi.mock('../GatewayClient', () => ({ GatewayClient: ctor }));

const lastGateway = () => gatewayInstances[gatewayInstances.length - 1];

describe('Discord Trigger Node', () => {
	const credentials = mock<ICredentialDataDecryptedObject>({ botToken: 'bot-token' });
	let triggerFunctions: ReturnType<typeof mock<ITriggerFunctions>>;

	beforeEach(() => {
		vi.clearAllMocks();
		gatewayInstances.length = 0;
		triggerFunctions = mock<ITriggerFunctions>();
		triggerFunctions.getCredentials.calledWith('discordBotApi').mockResolvedValue(credentials);
		triggerFunctions.getNodeParameter.mockImplementation((name: string) => {
			switch (name) {
				case 'events':
					return ['messageCreate'];
				case 'guildId':
					return 'guild-1';
				case 'channelId':
					return '';
				case 'options':
					return {};
				default:
					return undefined;
			}
		});
	});

	it('passes the bot token and computed intents to the gateway client', async () => {
		triggerFunctions.getMode.mockReturnValue('trigger');

		await new DiscordTrigger().trigger.call(triggerFunctions);

		expect(ctor).toHaveBeenCalledWith(
			expect.objectContaining({
				token: 'bot-token',
				intents: (1 << 9) | (1 << 15), // GUILD_MESSAGES | MESSAGE_CONTENT
			}),
		);
		expect(connect).toHaveBeenCalledTimes(1);
	});

	it('emits on a matching dispatch in trigger mode', async () => {
		triggerFunctions.getMode.mockReturnValue('trigger');

		const response = await new DiscordTrigger().trigger.call(triggerFunctions);
		expect(response.closeFunction).toBeDefined();

		lastGateway().emit('dispatch', 'MESSAGE_CREATE', { guild_id: 'guild-1', content: 'hi' });

		expect(triggerFunctions.emit).toHaveBeenCalledWith([
			[{ json: { eventType: 'messageCreate', guild_id: 'guild-1', content: 'hi' } }],
		]);

		await response.closeFunction!();
		expect(close).toHaveBeenCalledTimes(1);
	});

	it('does not emit for an event from another guild', async () => {
		triggerFunctions.getMode.mockReturnValue('trigger');

		await new DiscordTrigger().trigger.call(triggerFunctions);
		lastGateway().emit('dispatch', 'MESSAGE_CREATE', { guild_id: 'other', content: 'hi' });

		expect(triggerFunctions.emit).not.toHaveBeenCalled();
	});

	it('emits the first matching event then resolves in manual mode', async () => {
		triggerFunctions.getMode.mockReturnValue('manual');

		const response = await new DiscordTrigger().trigger.call(triggerFunctions);
		expect(response.manualTriggerFunction).toBeDefined();

		// connect happens when the manual trigger is invoked
		const promise = response.manualTriggerFunction!();
		expect(connect).toHaveBeenCalledTimes(1);

		lastGateway().emit('dispatch', 'MESSAGE_CREATE', { guild_id: 'guild-1', content: 'hi' });

		await expect(promise).resolves.toBeUndefined();
		expect(triggerFunctions.emit).toHaveBeenCalledTimes(1);
	});
});
