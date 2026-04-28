import { createWorkflow } from '@n8n/backend-test-utils';
import { GLOBAL_OWNER_ROLE, type User, type WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { V0Client } from '@/modules/frontend-builder/v0-client';

import { createUser } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import * as utils from './shared/utils';

const testServer = utils.setupTestServer({
	endpointGroups: ['workflows', 'frontend-builder'],
	modules: ['frontend-builder'],
});

let owner: User;
let authOwnerAgent: SuperAgentTest;

beforeAll(async () => {
	owner = await createUser({ role: GLOBAL_OWNER_ROLE });
	authOwnerAgent = testServer.authAgentFor(owner);
});

describe('FrontendBuilderController', () => {
	describe('POST /workflows/:workflowId/frontend/messages', () => {
		it('creates a chat on first message and persists chatId', async () => {
			const workflow = await createWorkflow({ name: 'WF', active: true }, owner);

			const response = await authOwnerAgent
				.post(`/workflows/${workflow.id}/frontend/messages`)
				.send({
					prompt: 'a hello form',
					endpoints: [
						{ nodeName: 'Webhook', method: 'POST', url: 'https://example.invalid/webhook/x' },
					],
				});

			expect(response.statusCode).toBe(200);
			expect(response.body.data.chatId).toMatch(/^fake-chat-/);
			expect(response.body.data.demoUrl).toContain('fake-demo');
			expect(response.body.data.assistantMessage.role).toBe('assistant');

			const saved = (await Container.get(WorkflowRepository).findOneBy({
				id: workflow.id,
			})) as WorkflowEntity;
			const staticData = saved.staticData as { global?: { v0Chat?: { chatId: string } } };
			expect(staticData.global?.v0Chat?.chatId).toBe(response.body.data.chatId);
		});

		it('continues an existing chat when chatId is persisted', async () => {
			const workflow = await createWorkflow({ name: 'WF', active: true }, owner);

			const first = await authOwnerAgent.post(`/workflows/${workflow.id}/frontend/messages`).send({
				prompt: 'first message',
				endpoints: [
					{ nodeName: 'Webhook', method: 'POST', url: 'https://example.invalid/webhook/x' },
				],
			});
			expect(first.statusCode).toBe(200);
			const firstChatId = first.body.data.chatId;

			const second = await authOwnerAgent.post(`/workflows/${workflow.id}/frontend/messages`).send({
				prompt: 'follow up',
				endpoints: [
					{ nodeName: 'Webhook', method: 'POST', url: 'https://example.invalid/webhook/x' },
				],
			});
			expect(second.statusCode).toBe(200);
			expect(second.body.data.chatId).toBe(firstChatId);
			expect(second.body.data.assistantMessage.content).toContain('(fake follow-up)');
		});

		it('rejects unauthenticated callers', async () => {
			const workflow = await createWorkflow({ name: 'WF', active: true }, owner);

			const response = await testServer.authlessAgent
				.post(`/workflows/${workflow.id}/frontend/messages`)
				.send({
					prompt: 'hi',
					endpoints: [
						{ nodeName: 'Webhook', method: 'POST', url: 'https://example.invalid/webhook/x' },
					],
				});

			expect(response.statusCode).toBe(401);
		});

		it('returns 400 when endpoints array is empty', async () => {
			const workflow = await createWorkflow({ name: 'WF', active: true }, owner);

			const response = await authOwnerAgent
				.post(`/workflows/${workflow.id}/frontend/messages`)
				.send({ prompt: 'hi', endpoints: [] });

			expect(response.statusCode).toBe(400);
		});

		it('returns 502 with a clear message when the v0 client throws', async () => {
			const previous = Container.get(V0Client);

			const throwingClient = mock<V0Client>();
			throwingClient.create.mockRejectedValue(new Error('upstream down'));
			throwingClient.sendMessage.mockRejectedValue(new Error('upstream down'));
			throwingClient.getChat.mockRejectedValue(new Error('upstream down'));
			Container.set(V0Client, throwingClient);

			try {
				const workflow = await createWorkflow({ name: 'WF', active: true }, owner);

				const response = await authOwnerAgent
					.post(`/workflows/${workflow.id}/frontend/messages`)
					.send({
						prompt: 'hi',
						endpoints: [
							{ nodeName: 'Webhook', method: 'POST', url: 'https://example.invalid/webhook/x' },
						],
					});

				expect(response.statusCode).toBe(502);
				expect(response.body.message).toMatch(/upstream down|frontend generation failed/i);
			} finally {
				Container.set(V0Client, previous);
			}
		});

		it('forwards composed prompt with sanitized endpoint examples', async () => {
			const workflow = await createWorkflow({ name: 'WF', active: true }, owner);

			const response = await authOwnerAgent
				.post(`/workflows/${workflow.id}/frontend/messages`)
				.send({
					prompt: 'show a table',
					endpoints: [
						{
							nodeName: 'List',
							method: 'GET',
							url: 'https://example.invalid/webhook/list',
							responseExample: Array.from({ length: 50 }, (_, i) => ({ id: i, name: `n${i}` })),
						},
					],
				});
			expect(response.statusCode).toBe(200);

			// FakeV0Client echoes the composed message verbatim back as the
			// first user message in the chat. Re-fetch state and assert the
			// recorded user message contains the prompt + sanitized example.
			const got = await authOwnerAgent.get(`/workflows/${workflow.id}/frontend`);
			const userMessage = got.body.data.messages.find((m: { role: string }) => m.role === 'user');
			expect(userMessage.content).toContain('GET https://example.invalid/webhook/list');
			expect(userMessage.content).toContain('User request: show a table');
			expect(userMessage.content).toContain('Constraints:');

			// The 50-item array must have been truncated to the first 20.
			const exampleMatch = userMessage.content.match(/Example response: (\[.*?\])/);
			expect(exampleMatch).not.toBeNull();
			const truncated = JSON.parse(exampleMatch![1]) as Array<{ id: number }>;
			expect(truncated).toHaveLength(20);
			expect(truncated[0].id).toBe(0);
			expect(truncated[19].id).toBe(19);
		});
	});

	describe('GET /workflows/:workflowId/frontend', () => {
		it('returns { chatId: null } when no chat has been started', async () => {
			const workflow = await createWorkflow({ name: 'WF', active: true }, owner);

			const response = await authOwnerAgent.get(`/workflows/${workflow.id}/frontend`);

			expect(response.statusCode).toBe(200);
			expect(response.body.data).toEqual({ chatId: null });
		});

		it('rehydrates drawer state from v0 when a chat is persisted', async () => {
			const workflow = await createWorkflow({ name: 'WF', active: true }, owner);

			const posted = await authOwnerAgent.post(`/workflows/${workflow.id}/frontend/messages`).send({
				prompt: 'a form',
				endpoints: [
					{ nodeName: 'Webhook', method: 'POST', url: 'https://example.invalid/webhook/x' },
				],
			});
			expect(posted.statusCode).toBe(200);
			const chatId = posted.body.data.chatId;

			const got = await authOwnerAgent.get(`/workflows/${workflow.id}/frontend`);

			expect(got.statusCode).toBe(200);
			expect(got.body.data.chatId).toBe(chatId);
			expect(got.body.data.demoUrl).toBe(posted.body.data.demoUrl);
			expect(got.body.data.messages.length).toBeGreaterThan(0);
			expect(
				got.body.data.messages.some(
					(m: { role: string; content: string }) =>
						m.role === 'user' && m.content.includes('User request: a form'),
				),
			).toBe(true);
		});

		it('rejects unauthenticated callers', async () => {
			const workflow = await createWorkflow({ name: 'WF', active: true }, owner);

			const response = await testServer.authlessAgent.get(`/workflows/${workflow.id}/frontend`);

			expect(response.statusCode).toBe(401);
		});
	});

	describe('DELETE /workflows/:workflowId/frontend', () => {
		it('clears the persisted chatId so the next message starts a new chat', async () => {
			const workflow = await createWorkflow({ name: 'WF', active: true }, owner);

			const first = await authOwnerAgent.post(`/workflows/${workflow.id}/frontend/messages`).send({
				prompt: 'first',
				endpoints: [
					{ nodeName: 'Webhook', method: 'POST', url: 'https://example.invalid/webhook/x' },
				],
			});
			const firstChatId = first.body.data.chatId;

			const cleared = await authOwnerAgent.delete(`/workflows/${workflow.id}/frontend`);
			expect(cleared.statusCode).toBe(200);
			expect(cleared.body.data).toEqual({ chatId: null });

			const got = await authOwnerAgent.get(`/workflows/${workflow.id}/frontend`);
			expect(got.body.data).toEqual({ chatId: null });

			const second = await authOwnerAgent.post(`/workflows/${workflow.id}/frontend/messages`).send({
				prompt: 'second',
				endpoints: [
					{ nodeName: 'Webhook', method: 'POST', url: 'https://example.invalid/webhook/x' },
				],
			});
			expect(second.body.data.chatId).not.toBe(firstChatId);
		});

		it('rejects unauthenticated callers', async () => {
			const workflow = await createWorkflow({ name: 'WF', active: true }, owner);

			const response = await testServer.authlessAgent.delete(`/workflows/${workflow.id}/frontend`);

			expect(response.statusCode).toBe(401);
		});
	});
});
