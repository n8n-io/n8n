import type { UserRepository, User } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { ChatIntegrationRegistry } from '../agent-chat-integration';
import { ChatIntegrationActionExecutor } from '../integration-action-executor';
import { ChatIntegrationContextQueryExecutor } from '../integration-context-query-executor';
import type { ChatIntegrationService } from '../chat-integration.service';
import { createIntegrationActionTool } from '../integration-tools';
import type {
	IntegrationMessageContext,
	IntegrationToolConnectionDescriptor,
} from '../integration-tools';
import { N8nChatIntegration } from '../platforms/n8n-chat-integration';

const makeContext = (): IntegrationMessageContext => ({
	integrationConnectionId: 'n8n_chat',
	platform: 'n8n_chat',
	target: { type: 'dm', userId: 'user-1', threadId: 'thread-1' },
	interactingUserId: 'user-1',
	updatedAt: '2026-06-10T00:00:00.000Z',
});

describe('N8nChatIntegration', () => {
	const userRepository = mock<UserRepository>();
	const integration = new N8nChatIntegration(userRepository);

	it('is internal and runs without a chat instance', () => {
		expect(integration.internal).toBe(true);
		expect(integration.requiresChatInstance).toBe(false);
		expect(integration.credentialTypes).toEqual([]);
	});

	it('respond echoes the current message context without posting', async () => {
		const ctx = makeContext();
		const result = await integration.executeAction({
			chat: undefined,
			descriptor: mock(),
			action: 'respond',
			input: { message: { text: 'hi', card: { components: [{ type: 'button', value: 'a' }] } } },
			currentMessageContext: ctx,
		});
		expect(result).toMatchObject({ ok: true });
		if (result?.ok) {
			expect(result.messageContext?.target).toEqual(ctx.target);
			expect(result.messageContext?.messageId).toBeUndefined();
			expect(result.messageContext?.updatedAt).not.toBe('2026-06-10T00:00:00.000Z');
		}
	});

	it('respond without current context returns NO_MESSAGE_CONTEXT', async () => {
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

	it('respond with malformed input returns ACTION_FAILED', async () => {
		const result = await integration.executeAction({
			chat: undefined,
			descriptor: mock(),
			action: 'respond',
			input: { message: { card: { components: [] } } },
			currentMessageContext: makeContext(),
		});
		expect(result).toMatchObject({ ok: false, error: { code: 'ACTION_FAILED' } });
	});

	it('respond with only text returns a self-correcting error (nothing renders in-app)', async () => {
		const result = await integration.executeAction({
			chat: undefined,
			descriptor: mock(),
			action: 'respond',
			input: { message: { text: 'summary the user will never see' } },
			currentMessageContext: makeContext(),
		});
		expect(result).toMatchObject({ ok: false, error: { code: 'ACTION_FAILED' } });
		if (result && !result.ok) {
			expect(result.error.message).toContain('write the text directly in your reply');
		}
	});

	it('respond with an empty message object fails fast at the schema boundary', async () => {
		const result = await integration.executeAction({
			chat: undefined,
			descriptor: mock(),
			action: 'respond',
			input: { message: {} },
			currentMessageContext: makeContext(),
		});
		expect(result).toMatchObject({ ok: false, error: { code: 'ACTION_FAILED' } });
	});

	it('respond with completely wrong input shape returns ACTION_FAILED', async () => {
		const result = await integration.executeAction({
			chat: undefined,
			descriptor: mock(),
			action: 'respond',
			input: { notMessage: true },
			currentMessageContext: makeContext(),
		});
		expect(result).toMatchObject({ ok: false, error: { code: 'ACTION_FAILED' } });
	});

	it('get_user with missing userId returns CONTEXT_QUERY_FAILED', async () => {
		const result = await integration.executeContextQuery({
			chat: undefined,
			descriptor: mock(),
			query: 'get_user',
			input: {},
		});
		expect(result).toMatchObject({ ok: false, error: { code: 'CONTEXT_QUERY_FAILED' } });
	});

	it('unsupported context query returns UNSUPPORTED_QUERY error', async () => {
		const result = await integration.executeContextQuery({
			chat: undefined,
			descriptor: mock(),
			query: 'search_users' as never,
			input: {},
		});
		expect(result).toMatchObject({ ok: false, error: { code: 'UNSUPPORTED_QUERY' } });
	});

	it('get_user resolves the n8n user', async () => {
		userRepository.findOneBy.mockResolvedValue({
			id: 'user-1',
			firstName: 'Ada',
			lastName: 'Lovelace',
			email: 'ada@example.com',
		} as User);
		const result = await integration.executeContextQuery({
			chat: undefined,
			descriptor: mock(),
			query: 'get_user',
			input: { userId: 'user-1' },
		});
		expect(result).toEqual({
			ok: true,
			user: { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com' },
		});
	});

	it('get_user for an unknown user fails cleanly', async () => {
		userRepository.findOneBy.mockResolvedValue(null);
		const result = await integration.executeContextQuery({
			chat: undefined,
			descriptor: mock(),
			query: 'get_user',
			input: { userId: 'missing' },
		});
		expect(result).toMatchObject({ ok: false });
	});

	it('createAdapter throws (no platform surface)', async () => {
		await expect(integration.createAdapter()).rejects.toThrow();
	});
});

describe('ChatIntegrationRegistry.listPublic', () => {
	it('excludes internal integrations', () => {
		const registry = new ChatIntegrationRegistry();
		registry.register(new N8nChatIntegration(mock<UserRepository>()));
		expect(registry.list().map((i) => i.type)).toContain('n8n_chat');
		expect(registry.listPublic().map((i) => i.type)).not.toContain('n8n_chat');
	});
});

describe('internal integration dispatch', () => {
	const chatIntegrationService = mock<ChatIntegrationService>();
	const registry = new ChatIntegrationRegistry();
	const userRepository = mock<UserRepository>();
	registry.register(new N8nChatIntegration(userRepository));

	const descriptor: IntegrationToolConnectionDescriptor = {
		agentId: 'agent-1',
		integration: { type: 'n8n_chat' },
		integrationConnectionId: 'n8n_chat',
		contextToolName: 'chat_context',
		actionToolName: 'chat_action',
		contextQueries: ['get_current_message_context', 'get_current_subject', 'get_current_user'],
		actions: ['respond'],
	};

	it('action tool description warns against plain-text responds on the in-app channel', () => {
		const tool = createIntegrationActionTool({
			descriptor,
			messageContextStore: mock(),
			actionExecutor: mock(),
		}).build();
		expect(tool.description).toContain('NEVER call respond with only message.text');
	});

	it('action executor skips getChatInstance and routes respond to the integration', async () => {
		const executor = new ChatIntegrationActionExecutor(chatIntegrationService, registry);
		const result = await executor.execute({
			descriptor,
			action: 'respond',
			input: { message: { card: { components: [{ type: 'section', text: 'hello' }] } } },
			awaitResponse: false,
			currentMessageContext: makeContext(),
		});
		expect(result).toMatchObject({ ok: true });
		expect(chatIntegrationService.getChatInstance).not.toHaveBeenCalled();
	});

	it('action executor returns UNSUPPORTED_ACTION for send_dm on n8n_chat', async () => {
		const executor = new ChatIntegrationActionExecutor(chatIntegrationService, registry);
		const result = await executor.execute({
			descriptor,
			action: 'send_dm',
			input: { userId: 'user-1', message: { text: 'hi' } },
			awaitResponse: false,
		});
		expect(result).toMatchObject({ ok: false, error: { code: 'UNSUPPORTED_ACTION' } });
		expect(chatIntegrationService.getChatInstance).not.toHaveBeenCalled();
	});

	it('context executor skips getChatInstance for internal integrations', async () => {
		userRepository.findOneBy.mockResolvedValue({
			id: 'user-1',
			firstName: 'Ada',
			lastName: 'Lovelace',
			email: 'ada@example.com',
		} as User);
		const executor = new ChatIntegrationContextQueryExecutor(chatIntegrationService, registry);
		const result = await executor.execute({
			descriptor,
			query: 'get_user',
			input: { userId: 'user-1' },
		});
		expect(result).toMatchObject({ ok: true });
		expect(chatIntegrationService.getChatInstance).not.toHaveBeenCalled();
	});
});
