import {
	draftChatMemoryResourceId,
	integrationMemoryResourceId,
	productionChatMemoryResourceId,
	systemChatMemoryResourceId,
	taskRunMemoryResourceId,
} from '../../../../utils/agent-memory-scope';
import { createWhatsAppIntegration } from '../../../__tests__/helpers/whatsapp/replay-test-context';

describe('WhatsAppIntegration.checkActionRecipient', () => {
	const integration = createWhatsAppIntegration();
	const check = (action: string, userId: string, resourceId?: string) =>
		integration.checkActionRecipient({ action, input: { userId }, resourceId });

	const customerChat = integrationMemoryResourceId('whatsapp', '447397567320');

	describe.each(['send_dm', 'send_template'])('%s in a customer chat', (action) => {
		it('allows the customer who started the chat', () => {
			expect(check(action, '447397567320', customerChat)).toBeUndefined();
		});

		it('allows the same number in another format', () => {
			expect(check(action, '+44 7397-567320', customerChat)).toBeUndefined();
		});

		it('refuses another number', () => {
			expect(check(action, '447700900123', customerChat)).toEqual(expect.any(String));
		});

		it('refuses a number that only starts with the customer number', () => {
			expect(check(action, '4473975673209', customerChat)).toEqual(expect.any(String));
		});

		it('refuses when another channel started the run', () => {
			const slackChat = integrationMemoryResourceId('slack', 'U123');
			expect(check(action, '447397567320', slackChat)).toEqual(expect.any(String));
		});
	});

	describe.each([
		['a scheduled task', taskRunMemoryResourceId('task-1')],
		['a draft chat', draftChatMemoryResourceId('user-1')],
		['a production chat', productionChatMemoryResourceId('user-1')],
		['a system chat', systemChatMemoryResourceId('user-1')],
	])('%s', (_label, resourceId) => {
		it.each(['send_dm', 'send_template'])('allows %s to any number', (action) => {
			expect(check(action, '447700900123', resourceId)).toBeUndefined();
		});
	});

	it.each(['send_dm', 'send_template'])('refuses %s from an unknown origin', (action) => {
		expect(check(action, '447397567320', 'something-else:1')).toEqual(expect.any(String));
	});

	it.each(['send_dm', 'send_template'])('refuses %s without a run origin', (action) => {
		expect(check(action, '447397567320')).toEqual(expect.any(String));
	});

	describe('a customer message in a task session', () => {
		const taskSession = taskRunMemoryResourceId('task-1');
		const inboundContext = {
			integrationConnectionId: 'whatsapp:cred-a',
			platform: 'whatsapp',
			target: { type: 'thread' as const, threadId: 'whatsapp:111:447397567320' },
			interactingUserId: '447397567320',
			updatedAt: '2026-11-02T10:00:00.000Z',
		};
		const checkWithContext = (action: string, userId: string, platform = 'whatsapp') =>
			integration.checkActionRecipient({
				action,
				input: { userId },
				resourceId: taskSession,
				currentMessageContext: { ...inboundContext, platform },
			});

		it.each(['send_dm', 'send_template'])('refuses %s to another number', (action) => {
			expect(checkWithContext(action, '447700900123')).toEqual(expect.any(String));
		});

		it.each(['send_dm', 'send_template'])('allows %s to the same customer', (action) => {
			expect(checkWithContext(action, '+44 7397 567320')).toBeUndefined();
		});

		it('ignores a context from another platform', () => {
			expect(checkWithContext('send_dm', '447700900123', 'slack')).toBeUndefined();
		});
	});

	it('does not restrict other actions', () => {
		expect(check('respond', '447700900123', customerChat)).toBeUndefined();
		expect(check('add_reaction', '447700900123')).toBeUndefined();
	});
});
