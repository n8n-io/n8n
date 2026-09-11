import { mock } from 'vitest-mock-extended';

import type { IntegrationMessageContext } from '../integration-tools';
import { APP_CHAT_INTEGRATION_TYPE, AppChatIntegration } from '../platforms/app-chat-integration';

const makeContext = (): IntegrationMessageContext => ({
	integrationConnectionId: APP_CHAT_INTEGRATION_TYPE,
	platform: APP_CHAT_INTEGRATION_TYPE,
	target: { type: 'dm', userId: 'session-1', threadId: 'agent-1:app:app-1:session-1' },
	interactingUserId: 'session-1',
	updatedAt: '2026-06-10T00:00:00.000Z',
});

describe('AppChatIntegration', () => {
	const integration = new AppChatIntegration();

	it('is an internal credential-less channel that runs without a chat instance', () => {
		expect(integration.type).toBe('app');
		expect(integration.internal).toBe(true);
		expect(integration.requiresChatInstance).toBe(false);
		expect(integration.credentialTypes).toEqual([]);
		expect(integration.displayLabel).toBe('App');
		expect(integration.displayIcon).toBe('app-window');
		expect(integration.actions).toEqual(['respond']);
	});

	it('has no platform adapter', async () => {
		await expect(integration.createAdapter()).rejects.toThrow('no platform adapter');
	});

	it('respond with a card echoes the current message context without posting', async () => {
		const ctx = makeContext();
		const result = await integration.executeAction({
			chat: undefined,
			descriptor: mock(),
			action: 'respond',
			input: { message: { card: { components: [{ type: 'section', text: 'hi' }] } } },
			currentMessageContext: ctx,
		});
		expect(result).toMatchObject({ ok: true });
		if (result?.ok) {
			expect(result.messageContext?.target).toEqual(ctx.target);
			expect(result.messageContext?.messageId).toBeUndefined();
		}
	});

	it('respond with only text returns a self-correcting error', async () => {
		const result = await integration.executeAction({
			chat: undefined,
			descriptor: mock(),
			action: 'respond',
			input: { message: { text: 'never rendered' } },
			currentMessageContext: makeContext(),
		});
		expect(result).toMatchObject({ ok: false, error: { code: 'ACTION_FAILED' } });
	});

	it('respond without a current context returns NO_MESSAGE_CONTEXT', async () => {
		const result = await integration.executeAction({
			chat: undefined,
			descriptor: mock(),
			action: 'respond',
			input: { message: { card: { components: [{ type: 'section', text: 'hi' }] } } },
			currentMessageContext: undefined,
		});
		expect(result).toMatchObject({ ok: false, error: { code: 'NO_MESSAGE_CONTEXT' } });
	});

	it('returns undefined for actions it does not own', async () => {
		const result = await integration.executeAction({
			chat: undefined,
			descriptor: mock(),
			action: 'send_dm',
			input: {},
			currentMessageContext: makeContext(),
		});
		expect(result).toBeUndefined();
	});
});
