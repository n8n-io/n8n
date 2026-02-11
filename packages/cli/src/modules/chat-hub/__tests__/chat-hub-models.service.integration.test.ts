import type { ChatHubN8nModel } from '@n8n/api-types';
import {
	createActiveWorkflow,
	createWorkflow,
	mockInstance,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { BinaryDataService } from 'n8n-core';
import { CHAT_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { createMember } from '@test-integration/db/users';

import { ChatHubModelsService } from '../chat-hub.models.service';

mockInstance(BinaryDataService);

beforeAll(async () => {
	await testModules.loadModules(['chat-hub']);
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity']);
});

afterAll(async () => {
	await testDb.terminate();
});

const emptyCredentialIds = {
	openai: null,
	anthropic: null,
	google: null,
	azureOpenAi: null,
	azureEntraId: null,
	ollama: null,
	awsBedrock: null,
	vercelAiGateway: null,
	xAiGrok: null,
	groq: null,
	openRouter: null,
	deepSeek: null,
	cohere: null,
	mistralCloud: null,
};

describe('ChatHubModelsService', () => {
	let chatHubModelsService: ChatHubModelsService;
	let member: User;

	beforeAll(() => {
		chatHubModelsService = Container.get(ChatHubModelsService);
	});

	beforeEach(async () => {
		member = await createMember();
	});

	describe('getModels', () => {
		describe('n8n workflow agents', () => {
			it('should return empty models when user has no workflows', async () => {
				const result = await chatHubModelsService.getModels(member, emptyCredentialIds);

				expect(result.n8n).toBeDefined();
				expect(result.n8n.models).toEqual([]);
			});

			it('should return workflow as model when user has active workflow with chat trigger', async () => {
				const workflowName = 'Test Agent Workflow';
				const agentName = 'Custom Agent Name';
				const agentDescription = 'This is a test agent';

				await createActiveWorkflow(
					{
						name: workflowName,
						nodes: [
							{
								id: uuid(),
								name: 'Chat Trigger',
								type: CHAT_TRIGGER_NODE_TYPE,
								typeVersion: 1,
								position: [0, 0],
								parameters: {
									availableInChat: true,
									agentName,
									agentDescription,
								},
							},
						],
						connections: {},
					},
					member,
				);

				const result = await chatHubModelsService.getModels(member, emptyCredentialIds);

				expect(result.n8n).toBeDefined();
				expect(result.n8n.models).toHaveLength(1);

				const model = result.n8n.models[0];
				expect(model.name).toBe(agentName);
				expect(model.description).toBe(agentDescription);
				expect(model.model.provider).toBe('n8n');
				expect((model.model as ChatHubN8nModel).workflowId).toBeDefined();
				expect(model.metadata.available).toBe(true);
			});

			it('should use workflow name when agentName is not provided', async () => {
				const workflowName = 'Test Workflow';

				await createActiveWorkflow(
					{
						name: workflowName,
						nodes: [
							{
								id: uuid(),
								name: 'Chat Trigger',
								type: CHAT_TRIGGER_NODE_TYPE,
								typeVersion: 1,
								position: [0, 0],
								parameters: {
									availableInChat: true,
								},
							},
						],
						connections: {},
					},
					member,
				);

				const result = await chatHubModelsService.getModels(member, emptyCredentialIds);

				expect(result.n8n.models).toHaveLength(1);
				expect(result.n8n.models[0].name).toBe(workflowName);
			});

			it('should not return workflow when it is not active', async () => {
				await createWorkflow(
					{
						name: 'Inactive Workflow',
						nodes: [
							{
								id: uuid(),
								name: 'Chat Trigger',
								type: CHAT_TRIGGER_NODE_TYPE,
								typeVersion: 1,
								position: [0, 0],
								parameters: {
									availableInChat: true,
								},
							},
						],
						connections: {},
					},
					member,
				);

				const result = await chatHubModelsService.getModels(member, emptyCredentialIds);

				expect(result.n8n.models).toEqual([]);
			});

			it('should not return workflow when availableInChat is false', async () => {
				await createActiveWorkflow(
					{
						name: 'Not Available Workflow',
						nodes: [
							{
								id: uuid(),
								name: 'Chat Trigger',
								type: CHAT_TRIGGER_NODE_TYPE,
								typeVersion: 1,
								position: [0, 0],
								parameters: {
									availableInChat: false,
								},
							},
						],
						connections: {},
					},
					member,
				);

				const result = await chatHubModelsService.getModels(member, emptyCredentialIds);

				expect(result.n8n.models).toEqual([]);
			});

			it('should not return workflow without chat trigger node', async () => {
				await createActiveWorkflow(
					{
						name: 'Workflow Without Chat Trigger',
						nodes: [
							{
								id: uuid(),
								name: 'Manual Trigger',
								type: 'n8n-nodes-base.manualTrigger',
								typeVersion: 1,
								position: [0, 0],
								parameters: {},
							},
						],
						connections: {},
					},
					member,
				);

				const result = await chatHubModelsService.getModels(member, emptyCredentialIds);

				expect(result.n8n.models).toEqual([]);
			});

			it('should return multiple workflow agents', async () => {
				await createActiveWorkflow(
					{
						name: 'Agent 1',
						nodes: [
							{
								id: uuid(),
								name: 'Chat Trigger',
								type: CHAT_TRIGGER_NODE_TYPE,
								typeVersion: 1,
								position: [0, 0],
								parameters: {
									availableInChat: true,
									agentName: 'First Agent',
								},
							},
						],
						connections: {},
					},
					member,
				);

				await createActiveWorkflow(
					{
						name: 'Agent 2',
						nodes: [
							{
								id: uuid(),
								name: 'Chat Trigger',
								type: CHAT_TRIGGER_NODE_TYPE,
								typeVersion: 1,
								position: [0, 0],
								parameters: {
									availableInChat: true,
									agentName: 'Second Agent',
								},
							},
						],
						connections: {},
					},
					member,
				);

				const result = await chatHubModelsService.getModels(member, emptyCredentialIds);

				expect(result.n8n.models).toHaveLength(2);
				const agentNames = result.n8n.models.map((m) => m.name);
				expect(agentNames).toContain('First Agent');
				expect(agentNames).toContain('Second Agent');
			});

			it('should parse input modalities from chat trigger options', async () => {
				await createActiveWorkflow(
					{
						name: 'Agent with specific mime types',
						nodes: [
							{
								id: uuid(),
								name: 'Chat Trigger',
								type: CHAT_TRIGGER_NODE_TYPE,
								typeVersion: 1,
								position: [0, 0],
								parameters: {
									availableInChat: true,
									options: {
										allowFileUploads: true,
										allowedFilesMimeTypes: 'image/png, audio/mp3, application/pdf',
									},
								},
							},
						],
						connections: {},
					},
					member,
				);

				const result = await chatHubModelsService.getModels(member, emptyCredentialIds);

				expect(result.n8n.models).toHaveLength(1);
				const inputModalities = result.n8n.models[0].metadata.inputModalities;
				expect(inputModalities).toEqual(['text', 'image', 'audio', 'file']);
			});

			it('should parse all input modalities when wildcard mime type is used', async () => {
				await createActiveWorkflow(
					{
						name: 'Agent with all file types',
						nodes: [
							{
								id: uuid(),
								name: 'Chat Trigger',
								type: CHAT_TRIGGER_NODE_TYPE,
								typeVersion: 1,
								position: [0, 0],
								parameters: {
									availableInChat: true,
									options: {
										allowFileUploads: true,
										allowedFilesMimeTypes: '*/*',
									},
								},
							},
						],
						connections: {},
					},
					member,
				);

				const result = await chatHubModelsService.getModels(member, emptyCredentialIds);

				expect(result.n8n.models).toHaveLength(1);
				const inputModalities = result.n8n.models[0].metadata.inputModalities;
				expect(inputModalities).toEqual(['text', 'image', 'audio', 'video', 'file']);
			});

			it('should return only text modality when file uploads are disabled', async () => {
				await createActiveWorkflow(
					{
						name: 'Agent without file uploads',
						nodes: [
							{
								id: uuid(),
								name: 'Chat Trigger',
								type: CHAT_TRIGGER_NODE_TYPE,
								typeVersion: 1,
								position: [0, 0],
								parameters: {
									availableInChat: true,
									options: {
										allowFileUploads: false,
									},
								},
							},
						],
						connections: {},
					},
					member,
				);

				const result = await chatHubModelsService.getModels(member, emptyCredentialIds);

				expect(result.n8n.models).toHaveLength(1);
				expect(result.n8n.models[0].metadata.inputModalities).toEqual(['text']);
			});

			it('should include agent icon from chat trigger in workflow model', async () => {
				const agentIcon = { type: 'emoji' as const, value: '🤖' };

				await createActiveWorkflow(
					{
						name: 'Agent with icon',
						nodes: [
							{
								id: uuid(),
								name: 'Chat Trigger',
								type: CHAT_TRIGGER_NODE_TYPE,
								typeVersion: 1,
								position: [0, 0],
								parameters: {
									availableInChat: true,
									agentName: 'Icon Agent',
									agentIcon,
								},
							},
						],
						connections: {},
					},
					member,
				);

				const result = await chatHubModelsService.getModels(member, emptyCredentialIds);

				expect(result.n8n.models).toHaveLength(1);
				expect(result.n8n.models[0].icon).toEqual(agentIcon);
			});
		});
	});
});
