import type { INodeUi, IWorkflowDb } from '@/Interface';
import { compareWorkflows, compareNodes } from '@/utils/workflowDiff';
import { NodeDiffStatus } from '@/types/workflowDiff.types';
import { NodeConnectionType } from 'n8n-workflow';

const baseWf: Pick<IWorkflowDb, 'nodes' | 'connections'> = {
	nodes: [
		{
			parameters: {
				options: {},
			},
			id: '180ad8e0-c891-4b37-bab3-0a5b306ca48d',
			name: 'When chat message received',
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			typeVersion: 1.1,
			position: [840, 320],
			webhookId: 'b2743a74-9ab7-4e8d-9965-5de7c4ddb719',
		},
		{
			parameters: {
				options: {},
			},
			id: '1cd4ee3f-5692-469c-a658-82483f1ef921',
			name: 'AI Agent',
			type: '@n8n/n8n-nodes-langchain.agent',
			typeVersion: 1.7,
			position: [1060, 320],
		},
		{
			parameters: {
				options: {},
			},
			id: '9eedaa9f-7735-4fef-af11-deba888005ac',
			name: 'OpenAI Chat Model',
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			typeVersion: 1,
			position: [1060, 540],
			credentials: {
				openAiApi: {
					id: '4y680HnLdPkUcfcr',
					name: 'OpenAi account',
				},
			},
		},
		{
			parameters: {},
			id: 'f8279104-a3e6-4663-b9bc-77fdbc615742',
			name: 'Window Buffer Memory',
			type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
			typeVersion: 1.2,
			position: [1220, 540],
		},
	],
	connections: {
		'When chat message received': {
			main: [
				[
					{
						node: 'AI Agent',
						type: NodeConnectionType.Main,
						index: 0,
					},
				],
			],
		},
		'OpenAI Chat Model': {
			ai_languageModel: [
				[
					{
						node: 'AI Agent',
						type: NodeConnectionType.AiLanguageModel,
						index: 0,
					},
				],
			],
		},
		'Window Buffer Memory': {
			ai_memory: [
				[
					{
						node: 'AI Agent',
						type: NodeConnectionType.AiMemory,
						index: 0,
					},
				],
			],
		},
	},
};

const targetWf: Pick<IWorkflowDb, 'nodes' | 'connections'> = {
	nodes: [
		{
			parameters: {
				options: {},
			},
			id: '180ad8e0-c891-4b37-bab3-0a5b306ca48d',
			name: 'When chat message received',
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			typeVersion: 1.1,
			position: [840, 320],
			webhookId: 'b2743a74-9ab7-4e8d-9965-5de7c4ddb719',
		},
		{
			parameters: {
				options: {
					temperature: 0.7,
				},
			},
			id: '9eedaa9f-7735-4fef-af11-deba888005ac',
			name: 'OpenAI Chat Model',
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			typeVersion: 1,
			position: [1040, 540],
			credentials: {
				openAiApi: {
					id: '4y680HnLdPkUcfcr',
					name: 'OpenAi account',
				},
			},
		},
		{
			parameters: {
				options: {
					systemMessage: "=You are a helpful assistant. Today is {{ $today.format('yyyy-MM-dd') }}",
				},
			},
			id: '1cd4ee3f-5692-469c-a658-82483f1ef921',
			name: 'AI Agent',
			type: '@n8n/n8n-nodes-langchain.agent',
			typeVersion: 1.7,
			position: [1060, 320],
		},
		{
			parameters: {},
			id: '22593885-07ce-49ea-8a6c-ad17d983cada',
			name: 'Redis Chat Memory',
			type: '@n8n/n8n-nodes-langchain.memoryRedisChat',
			typeVersion: 1.3,
			position: [1220, 540],
		},
		{
			parameters: {},
			id: 'bcf43c50-007f-4d04-a236-a3a1ef628fe2',
			name: 'No Operation, do nothing',
			type: 'n8n-nodes-base.noOp',
			typeVersion: 1,
			position: [1400, 320],
		},
	],
	connections: {
		'When chat message received': {
			main: [
				[
					{
						node: 'AI Agent',
						type: NodeConnectionType.Main,
						index: 0,
					},
				],
			],
		},
		'OpenAI Chat Model': {
			ai_languageModel: [
				[
					{
						node: 'AI Agent',
						type: NodeConnectionType.AiLanguageModel,
						index: 0,
					},
				],
			],
		},
		'AI Agent': {
			main: [
				[
					{
						node: 'No Operation, do nothing',
						type: NodeConnectionType.Main,
						index: 0,
					},
				],
			],
		},
		'Redis Chat Memory': {
			ai_memory: [
				[
					{
						node: 'AI Agent',
						type: NodeConnectionType.AiMemory,
						index: 0,
					},
				],
			],
		},
	},
};

describe('workflowDiff', () => {
	it('should compare workflows', () => {
		const diff = compareWorkflows(baseWf, targetWf);

		expect(diff).toEqual({
			'180ad8e0-c891-4b37-bab3-0a5b306ca48d': NodeDiffStatus.EQ,
			'1cd4ee3f-5692-469c-a658-82483f1ef921': NodeDiffStatus.MODIFIED,
			'9eedaa9f-7735-4fef-af11-deba888005ac': NodeDiffStatus.MODIFIED,
			'22593885-07ce-49ea-8a6c-ad17d983cada': NodeDiffStatus.ADDED,
			'bcf43c50-007f-4d04-a236-a3a1ef628fe2': NodeDiffStatus.ADDED,
			'f8279104-a3e6-4663-b9bc-77fdbc615742': NodeDiffStatus.DELETED,
		});
	});

	it('should compare workflows in reverse', () => {
		const diff = compareWorkflows(targetWf, baseWf);

		expect(diff).toEqual({
			'180ad8e0-c891-4b37-bab3-0a5b306ca48d': NodeDiffStatus.EQ,
			'1cd4ee3f-5692-469c-a658-82483f1ef921': NodeDiffStatus.MODIFIED,
			'9eedaa9f-7735-4fef-af11-deba888005ac': NodeDiffStatus.MODIFIED,
			'22593885-07ce-49ea-8a6c-ad17d983cada': NodeDiffStatus.DELETED,
			'bcf43c50-007f-4d04-a236-a3a1ef628fe2': NodeDiffStatus.DELETED,
			'f8279104-a3e6-4663-b9bc-77fdbc615742': NodeDiffStatus.ADDED,
		});
	});
});

describe('compareNodes', () => {
	it('should be equal', () => {
		const baseNode: INodeUi = {
			parameters: {
				options: {},
			},
			id: '180ad8e0-c891-4b37-bab3-0a5b306ca48d',
			name: 'When chat message received',
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			typeVersion: 1.1,
			position: [840, 320],
			webhookId: 'b2743a74-9ab7-4e8d-9965-5de7c4ddb719',
		};

		const targetNode: INodeUi = {
			parameters: {
				options: {},
			},
			id: '180ad8e0-c891-4b37-bab3-0a5b306ca48d',
			name: 'When chat message received',
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			typeVersion: 1.1,
			position: [840, 320],
			webhookId: 'b2743a74-9ab7-4e8d-9965-5de7c4ddb719',
		};

		expect(compareNodes(baseNode, targetNode)).toBe(true);
	});

	it('should be equal if position is different', () => {
		const baseNode: INodeUi = {
			parameters: {
				options: {},
			},
			id: '180ad8e0-c891-4b37-bab3-0a5b306ca48d',
			name: 'When chat message received',
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			typeVersion: 1.1,
			position: [840, 320],
			webhookId: 'b2743a74-9ab7-4e8d-9965-5de7c4ddb719',
		};

		const targetNode: INodeUi = {
			parameters: {
				options: {},
			},
			id: '180ad8e0-c891-4b37-bab3-0a5b306ca48d',
			name: 'When chat message received',
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			typeVersion: 1.1,
			position: [100, 500],
			webhookId: 'b2743a74-9ab7-4e8d-9965-5de7c4ddb719',
		};

		expect(compareNodes(baseNode, targetNode)).toBe(true);
	});

	it('should be equal if order of props is different', () => {
		const baseNode: INodeUi = {
			parameters: {
				options: {},
			},
			id: '180ad8e0-c891-4b37-bab3-0a5b306ca48d',
			name: 'When chat message received',
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			typeVersion: 1.1,
			position: [840, 320],
			webhookId: 'b2743a74-9ab7-4e8d-9965-5de7c4ddb719',
		};

		const targetNode: INodeUi = {
			id: '180ad8e0-c891-4b37-bab3-0a5b306ca48d',
			parameters: {
				options: {},
			},
			position: [840, 320],
			name: 'When chat message received',
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			typeVersion: 1.1,
			webhookId: 'b2743a74-9ab7-4e8d-9965-5de7c4ddb719',
		};

		expect(compareNodes(baseNode, targetNode)).toBe(true);
	});

	it('should not be equal if type is different', () => {
		const baseNode: INodeUi = {
			parameters: {
				options: {},
			},
			id: '180ad8e0-c891-4b37-bab3-0a5b306ca48d',
			name: 'When chat message received',
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			typeVersion: 1.1,
			position: [840, 320],
			webhookId: 'b2743a74-9ab7-4e8d-9965-5de7c4ddb719',
		};

		const targetNode: INodeUi = {
			parameters: {
				options: {},
			},
			id: '180ad8e0-c891-4b37-bab3-0a5b306ca48d',
			name: 'When chat message received',
			type: '@n8n/n8n-nodes-langchain.agent',
			typeVersion: 1.7,
			position: [840, 320],
		};

		expect(compareNodes(baseNode, targetNode)).toBe(false);
	});

	it('should not be equal if typeVersion is different', () => {
		const baseNode: INodeUi = {
			parameters: {
				options: {},
			},
			id: '180ad8e0-c891-4b37-bab3-0a5b306ca48d',
			name: 'When chat message received',
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			typeVersion: 1.1,
			position: [840, 320],
			webhookId: 'b2743a74-9ab7-4e8d-9965-5de7c4ddb719',
		};

		const targetNode: INodeUi = {
			parameters: {
				options: {},
			},
			id: '180ad8e0-c891-4b37-bab3-0a5b306ca48d',
			name: 'When chat message received',
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			typeVersion: 1.2,
			position: [840, 320],
			webhookId: 'b2743a74-9ab7-4e8d-9965-5de7c4ddb719',
		};

		expect(compareNodes(baseNode, targetNode)).toBe(false);
	});

	it('should not be equal if name is different', () => {
		const baseNode: INodeUi = {
			parameters: {
				options: {},
			},
			id: '180ad8e0-c891-4b37-bab3-0a5b306ca48d',
			name: 'When chat message received',
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			typeVersion: 1.1,
			position: [840, 320],
			webhookId: 'b2743a74-9ab7-4e8d-9965-5de7c4ddb719',
		};

		const targetNode: INodeUi = {
			parameters: {
				options: {},
			},
			id: '180ad8e0-c891-4b37-bab3-0a5b306ca48d',
			name: 'When chat message sent',
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			typeVersion: 1.1,
			position: [840, 320],
			webhookId: 'b2743a74-9ab7-4e8d-9965-5de7c4ddb719',
		};

		expect(compareNodes(baseNode, targetNode)).toBe(false);
	});

	it('should not be equal if some option was removed', () => {
		const baseNode: INodeUi = {
			parameters: {
				options: {
					systemMessage: "=You are a helpful assistant. Today is {{ $today.format('yyyy-MM-dd') }}",
				},
			},
			id: '1cd4ee3f-5692-469c-a658-82483f1ef921',
			name: 'AI Agent',
			type: '@n8n/n8n-nodes-langchain.agent',
			typeVersion: 1.7,
			position: [1060, 320],
		};

		const targetNode: INodeUi = {
			parameters: {
				options: {},
			},
			id: '1cd4ee3f-5692-469c-a658-82483f1ef921',
			name: 'AI Agent',
			type: '@n8n/n8n-nodes-langchain.agent',
			typeVersion: 1.7,
			position: [1060, 320],
		};

		expect(compareNodes(baseNode, targetNode)).toBe(false);
	});

	it('should not be equal if some option was added', () => {
		const baseNode: INodeUi = {
			parameters: {
				options: {},
			},
			id: '1cd4ee3f-5692-469c-a658-82483f1ef921',
			name: 'AI Agent',
			type: '@n8n/n8n-nodes-langchain.agent',
			typeVersion: 1.7,
			position: [1060, 320],
		};

		const targetNode: INodeUi = {
			parameters: {
				options: {
					systemMessage: "=You are a helpful assistant. Today is {{ $today.format('yyyy-MM-dd') }}",
				},
			},
			id: '1cd4ee3f-5692-469c-a658-82483f1ef921',
			name: 'AI Agent',
			type: '@n8n/n8n-nodes-langchain.agent',
			typeVersion: 1.7,
			position: [1060, 320],
		};

		expect(compareNodes(baseNode, targetNode)).toBe(false);
	});

	it('should not be equal if some option was changed', () => {
		const baseNode: INodeUi = {
			parameters: {
				options: {
					temperature: 0.7,
				},
			},
			id: '9eedaa9f-7735-4fef-af11-deba888005ac',
			name: 'OpenAI Chat Model',
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			typeVersion: 1,
			position: [1060, 540],
			credentials: {
				openAiApi: {
					id: '4y680HnLdPkUcfcr',
					name: 'OpenAi account',
				},
			},
		};

		const targetNode: INodeUi = {
			parameters: {
				options: {
					temperature: 0.5,
				},
			},
			id: '9eedaa9f-7735-4fef-af11-deba888005ac',
			name: 'OpenAI Chat Model',
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			typeVersion: 1,
			position: [1060, 540],
			credentials: {
				openAiApi: {
					id: '4y680HnLdPkUcfcr',
					name: 'OpenAi account',
				},
			},
		};

		expect(compareNodes(baseNode, targetNode)).toBe(false);
	});

	it('should not be equal if credentials are different', () => {
		const baseNode: INodeUi = {
			parameters: {
				options: {},
			},
			id: '9eedaa9f-7735-4fef-af11-deba888005ac',
			name: 'OpenAI Chat Model',
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			typeVersion: 1,
			position: [1060, 540],
			credentials: {
				openAiApi: {
					id: '4y680HnLdPkUcfcr',
					name: 'OpenAi account',
				},
			},
		};

		const targetNode: INodeUi = {
			parameters: {
				options: {},
			},
			id: '9eedaa9f-7735-4fef-af11-deba888005ac',
			name: 'OpenAI Chat Model',
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			typeVersion: 1,
			position: [1060, 540],
			credentials: {
				openAiApi: {
					id: '83h4g03h89gh93',
					name: 'OpenAi account 2',
				},
			},
		};

		expect(compareNodes(baseNode, targetNode)).toBe(false);
	});
});
