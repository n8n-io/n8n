import type {
	EngineResponse,
	IExecuteFunctions,
	INodeProperties,
	INodeTypeDescription,
	NodeOutput,
} from 'n8n-workflow';
import { NodeConnectionTypes, SEND_AND_WAIT_OPERATION } from 'n8n-workflow';

import { convertNodeToHitlTool, createHitlTools, hasSendAndWaitOperation } from '../hitl-tools';

describe('hitl-tools', () => {
	describe('hasSendAndWaitOperation', () => {
		it('should return true for nodes with webhooks and sendAndWait operation', () => {
			const nodeType = {
				name: 'slack',
				displayName: 'Slack',
				webhooks: [{ name: 'default', httpMethod: 'POST', path: 'webhook' }],
				properties: [
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						options: [
							{ name: 'Send Message', value: 'sendMessage' },
							{ name: 'Send and Wait', value: SEND_AND_WAIT_OPERATION },
						],
						default: 'sendMessage',
					},
				],
			} as unknown as INodeTypeDescription;

			expect(hasSendAndWaitOperation(nodeType)).toBe(true);
		});

		it('should return false for nodes with webhooks and non-array operation options', () => {
			const nodeType = {
				name: 'slack',
				displayName: 'Slack',
				webhooks: [{ name: 'default', httpMethod: 'POST', path: 'webhook' }],
				properties: [
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						options: { name: 'Send Message', value: 'sendMessage' },
						default: 'sendMessage',
					},
				],
			} as unknown as INodeTypeDescription;

			expect(hasSendAndWaitOperation(nodeType)).toBe(false);
		});

		it('should return false for nodes without webhooks', () => {
			const nodeType = {
				name: 'slack',
				displayName: 'Slack',
				properties: [
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						options: [{ name: 'Send and Wait', value: SEND_AND_WAIT_OPERATION }],
						default: SEND_AND_WAIT_OPERATION,
					},
				],
			} as unknown as INodeTypeDescription;

			expect(hasSendAndWaitOperation(nodeType)).toBe(false);
		});

		it('should return false for nodes without operation property', () => {
			const nodeType = {
				name: 'slack',
				displayName: 'Slack',
				webhooks: [{ name: 'default', httpMethod: 'POST', path: 'webhook' }],
				properties: [
					{
						displayName: 'Message',
						name: 'message',
						type: 'string',
						default: '',
					},
				],
			} as unknown as INodeTypeDescription;

			expect(hasSendAndWaitOperation(nodeType)).toBe(false);
		});

		it('should return false for nodes without sendAndWait in operation options', () => {
			const nodeType = {
				name: 'slack',
				displayName: 'Slack',
				webhooks: [{ name: 'default', httpMethod: 'POST', path: 'webhook' }],
				properties: [
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						options: [
							{ name: 'Send Message', value: 'sendMessage' },
							{ name: 'Update Message', value: 'updateMessage' },
						],
						default: 'sendMessage',
					},
				],
			} as unknown as INodeTypeDescription;

			expect(hasSendAndWaitOperation(nodeType)).toBe(false);
		});

		it('should return false for nodes with empty webhooks array', () => {
			const nodeType = {
				name: 'slack',
				displayName: 'Slack',
				webhooks: [],
				properties: [
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						options: [{ name: 'Send and Wait', value: SEND_AND_WAIT_OPERATION }],
						default: SEND_AND_WAIT_OPERATION,
					},
				],
			} as unknown as INodeTypeDescription;

			expect(hasSendAndWaitOperation(nodeType)).toBe(false);
		});
	});

	describe('convertNodeToHitlTool', () => {
		let fullNodeWrapper: {
			description: INodeTypeDescription;
			execute?: (this: IExecuteFunctions, response?: EngineResponse) => Promise<NodeOutput>;
		};

		beforeEach(() => {
			fullNodeWrapper = {
				description: {
					displayName: 'Slack',
					name: 'slack',
					group: ['output'],
					description: 'Send messages to Slack',
					version: 1,
					defaults: {},
					inputs: [NodeConnectionTypes.Main],
					outputs: [NodeConnectionTypes.Main],
					webhooks: [{ name: 'default', httpMethod: 'POST', path: 'webhook' }],
					properties: [
						{
							displayName: 'Operation',
							name: 'operation',
							type: 'options',
							options: [
								{ name: 'Send Message', value: 'sendMessage' },
								{ name: 'Send and Wait', value: SEND_AND_WAIT_OPERATION },
							],
							default: 'sendMessage',
						},
						{
							displayName: 'Message',
							name: 'message',
							type: 'string',
							default: '',
							displayOptions: {
								show: {
									operation: [SEND_AND_WAIT_OPERATION],
								},
							},
						},
					],
				},
			};
		});

		it('should modify the name and displayName correctly', () => {
			const result = convertNodeToHitlTool(fullNodeWrapper);
			expect(result.description.name).toBe('slackHitlTool');
			expect(result.description.displayName).toBe('Slack');
			expect(result.description.subtitle).toBe('Send and wait');
		});

		it('should modify the execute method to ensure proper ai_tool logging', async () => {
			const originalExecute = jest.fn();
			fullNodeWrapper.execute = originalExecute;
			const result = convertNodeToHitlTool(fullNodeWrapper);

			const node = {
				rewireOutputLogTo: undefined,
			};
			const context = {
				getNode: () => node,
			} as unknown as IExecuteFunctions;

			await result.execute?.call(context);

			expect(node.rewireOutputLogTo).toBe(NodeConnectionTypes.AiTool);
			expect(originalExecute).toHaveBeenCalled();
		});

		it('should update inputs and outputs for HITL with labels', () => {
			const result = convertNodeToHitlTool(fullNodeWrapper);
			expect(result.description.inputs).toEqual([
				{
					displayName: 'Tool',
					type: NodeConnectionTypes.AiTool,
					required: true,
				},
			]);
			expect(result.description.outputs).toEqual([
				{
					displayName: 'Human review',
					type: NodeConnectionTypes.AiTool,
					filter: {
						nodes: ['@n8n/n8n-nodes-langchain.agent', '@n8n/n8n-nodes-langchain.agentTool'],
					},
				},
			]);
		});

		it('should keep webhooks in description', () => {
			const result = convertNodeToHitlTool(fullNodeWrapper);
			expect(result.description.webhooks).toBeDefined();
			expect(result.description.webhooks).toHaveLength(1);
		});

		it('should set defaults.name to displayName', () => {
			const result = convertNodeToHitlTool(fullNodeWrapper);
			expect(result.description.defaults?.name).toBe('Slack');
		});

		it('should not have toolDescription property', () => {
			const result = convertNodeToHitlTool(fullNodeWrapper);
			const toolDescriptionProp = result.description.properties.find(
				(prop: INodeProperties) => prop.name === 'toolDescription',
			);
			expect(toolDescriptionProp).toBeUndefined();
		});

		it('should convert operation to hidden property with sendAndWait default', () => {
			const result = convertNodeToHitlTool(fullNodeWrapper);
			const operationProp = result.description.properties.find(
				(prop: INodeProperties) => prop.name === 'operation',
			);
			expect(operationProp).toBeDefined();
			expect(operationProp?.type).toBe('hidden');
			expect(operationProp?.default).toBe(SEND_AND_WAIT_OPERATION);
		});

		it('should set skipNameGeneration to true', () => {
			const result = convertNodeToHitlTool(fullNodeWrapper);
			expect(result.description.skipNameGeneration).toBe(true);
		});

		it('should convert resource to hidden property with sendAndWait resource default', () => {
			// Add a resource-aware operation property
			fullNodeWrapper.description.properties = [
				{
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					options: [{ name: 'Message', value: 'message' }],
					default: 'message',
				},
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					options: [
						{ name: 'Send Message', value: 'sendMessage' },
						{ name: 'Send and Wait', value: SEND_AND_WAIT_OPERATION },
					],
					default: 'sendMessage',
					displayOptions: {
						show: {
							resource: ['message'],
						},
					},
				},
			];
			const result = convertNodeToHitlTool(fullNodeWrapper);
			const resourceProp = result.description.properties.find(
				(prop: INodeProperties) => prop.name === 'resource',
			);
			expect(resourceProp).toBeDefined();
			expect(resourceProp?.type).toBe('hidden');
			expect(resourceProp?.default).toBe('message');
		});

		it('should add message property with HITL-specific default', () => {
			const result = convertNodeToHitlTool(fullNodeWrapper);
			const messageProp = result.description.properties.find(
				(prop: INodeProperties) => prop.name === 'message',
			);
			expect(messageProp).toBeDefined();
			expect(messageProp?.type).toBe('string');
			expect(messageProp?.default).toBe('=The agent wants to call {{ $tool.name }}');
		});

		it('should replace original message property with HITL message', () => {
			// Add an original message property like sendAndWait nodes have
			fullNodeWrapper.description.properties.push({
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: 'Original default',
				displayOptions: {
					show: {
						operation: [SEND_AND_WAIT_OPERATION],
					},
				},
			});
			const result = convertNodeToHitlTool(fullNodeWrapper);
			const messageProps = result.description.properties.filter(
				(prop: INodeProperties) => prop.name === 'message',
			);
			// Should only have one message property (our HITL one, not the original)
			expect(messageProps).toHaveLength(1);
			expect(messageProps[0].default).toBe('=The agent wants to call {{ $tool.name }}');
		});

		it('should set codex categories correctly for HITL', () => {
			const result = convertNodeToHitlTool(fullNodeWrapper);
			expect(result.description.codex).toEqual({
				categories: ['AI'],
				subcategories: {
					AI: ['Tools'],
					Tools: ['Human in the Loop'],
				},
				resources: {},
			});
		});

		it('should preserve existing codex resources', () => {
			fullNodeWrapper.description.codex = {
				categories: ['Communication'],
				subcategories: {},
				resources: {
					primaryDocumentation: [{ url: 'https://docs.n8n.io/nodes/slack' }],
				},
			};
			const result = convertNodeToHitlTool(fullNodeWrapper);
			expect(result.description.codex?.resources).toEqual({
				primaryDocumentation: [{ url: 'https://docs.n8n.io/nodes/slack' }],
			});
		});

		it('should make responseType hidden with approval as default', () => {
			fullNodeWrapper.description.properties.push({
				displayName: 'Response Type',
				name: 'responseType',
				type: 'options',
				options: [
					{ name: 'Approval', value: 'approval' },
					{ name: 'Free Text', value: 'freeText' },
				],
				default: 'freeText',
			});
			const result = convertNodeToHitlTool(fullNodeWrapper);
			const responseTypeProp = result.description.properties.find(
				(prop: INodeProperties) => prop.name === 'responseType',
			);
			expect(responseTypeProp).toBeDefined();
			expect(responseTypeProp?.type).toBe('hidden');
			expect(responseTypeProp?.default).toBe('approval');
		});

		it('should keep approvalOptions visible for customization', () => {
			fullNodeWrapper.description.properties.push({
				displayName: 'Approval Options',
				name: 'approvalOptions',
				type: 'fixedCollection',
				default: {},
			});
			const result = convertNodeToHitlTool(fullNodeWrapper);
			const approvalOptionsProp = result.description.properties.find(
				(prop: INodeProperties) => prop.name === 'approvalOptions',
			);
			expect(approvalOptionsProp).toBeDefined();
			expect(approvalOptionsProp?.type).toBe('fixedCollection');
		});

		it('should keep other options visible for customization', () => {
			fullNodeWrapper.description.properties.push({
				displayName: 'Some parameter',
				name: 'someParameter',
				type: 'collection',
				default: {},
			});
			const result = convertNodeToHitlTool(fullNodeWrapper);
			const optionsProp = result.description.properties.find(
				(prop: INodeProperties) => prop.name === 'someParameter',
			);
			expect(optionsProp).toBeDefined();
		});
	});

	describe('createHitlTools', () => {
		let types: { nodes: INodeTypeDescription[]; credentials: unknown[] };
		let known: { nodes: Record<string, unknown>; credentials: Record<string, unknown> };

		beforeEach(() => {
			types = {
				nodes: [
					{
						name: 'n8n-nodes-base.slack',
						displayName: 'Slack',
						group: ['output'],
						description: 'Send messages to Slack',
						webhooks: [{ name: 'default', httpMethod: 'POST', path: 'webhook' }],
						properties: [
							{
								displayName: 'Operation',
								name: 'operation',
								type: 'options',
								options: [
									{ name: 'Send Message', value: 'sendMessage' },
									{ name: 'Send and Wait', value: SEND_AND_WAIT_OPERATION },
								],
								default: 'sendMessage',
							},
						],
					},
				] as unknown as INodeTypeDescription[],
				credentials: [],
			};

			known = {
				nodes: {
					'n8n-nodes-base.slack': { className: 'Slack', sourcePath: '/path/to/slack' },
				},
				credentials: {
					slackOAuth2Api: {
						className: 'SlackOAuth2Api',
						sourcePath: '/path/to/slackOAuth2Api',
						supportedNodes: ['n8n-nodes-base.slack'],
					},
				},
			};
		});

		it('should create HITL tools for nodes with sendAndWait operations', () => {
			createHitlTools(types as never, known as never);

			expect(types.nodes).toHaveLength(2); // Original node + HITL tool
			expect(types.nodes[1].name).toBe('n8n-nodes-base.slackHitlTool');
			expect(types.nodes[1].displayName).toBe('Slack');
			expect(types.nodes[1].subtitle).toBe('Send and wait');
		});

		it('should point to original node class for HITL tool', () => {
			createHitlTools(types as never, known as never);

			expect(known.nodes['n8n-nodes-base.slackHitlTool']).toEqual({
				className: 'Slack',
				sourcePath: '/path/to/slack',
			});
		});

		it('should duplicate supportedNodes for HITL tools', () => {
			createHitlTools(types as never, known as never);

			expect(
				(known.credentials.slackOAuth2Api as { supportedNodes: string[] }).supportedNodes,
			).toEqual(['n8n-nodes-base.slack', 'n8n-nodes-base.slackHitlTool']);
		});

		it('should not create HITL tools for nodes without sendAndWait', () => {
			types.nodes[0].webhooks = undefined;
			createHitlTools(types as never, known as never);

			expect(types.nodes).toHaveLength(1); // No HITL tool created
			expect(types.nodes[0].name).toBe('n8n-nodes-base.slack');
		});

		it('should set correct inputs and outputs on HITL tool', () => {
			createHitlTools(types as never, known as never);

			expect(types.nodes[1].inputs).toEqual([
				{
					displayName: 'Tool',
					type: NodeConnectionTypes.AiTool,
					required: true,
				},
			]);
			expect(types.nodes[1].outputs).toEqual([
				{
					displayName: 'Human review',
					type: NodeConnectionTypes.AiTool,
					filter: {
						nodes: ['@n8n/n8n-nodes-langchain.agent', '@n8n/n8n-nodes-langchain.agentTool'],
					},
				},
			]);
		});

		it('should set correct codex categories on HITL tool', () => {
			createHitlTools(types as never, known as never);

			expect(types.nodes[1].codex).toEqual({
				categories: ['AI'],
				subcategories: {
					AI: ['Tools'],
					Tools: ['Human in the Loop'],
				},
				resources: {},
			});
		});
	});
});
