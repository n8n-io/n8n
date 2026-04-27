import { createWorkflow } from '@n8n/backend-test-utils';
import { GLOBAL_OWNER_ROLE, type User, type WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';

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
					(m: { role: string; content: string }) => m.role === 'user' && m.content === 'a form',
				),
			).toBe(true);
		});

		it('rejects unauthenticated callers', async () => {
			const workflow = await createWorkflow({ name: 'WF', active: true }, owner);

			const response = await testServer.authlessAgent.get(`/workflows/${workflow.id}/frontend`);

			expect(response.statusCode).toBe(401);
		});
	});
});
