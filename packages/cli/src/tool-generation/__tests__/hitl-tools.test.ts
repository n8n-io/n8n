import type { INodeProperties, INodeTypeDescription } from 'n8n-workflow';
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
		let fullNodeWrapper: { description: INodeTypeDescription };

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
					displayName: 'Human Review',
					type: NodeConnectionTypes.AiTool,
				},
			]);
		});

		it('should keep webhooks in description', () => {
			const result = convertNodeToHitlTool(fullNodeWrapper);
			expect(result.description.webhooks).toBeDefined();
			expect(result.description.webhooks).toHaveLength(1);
		});

		it('should set descriptionType to manual', () => {
			const result = convertNodeToHitlTool(fullNodeWrapper);
			const descriptionTypeProp = result.description.properties.find(
				(prop: INodeProperties) => prop.name === 'descriptionType',
			);
			expect(descriptionTypeProp).toBeDefined();
			expect(descriptionTypeProp?.type).toBe('hidden');
			expect(descriptionTypeProp?.default).toBe('manual');
		});

		it('should add toolDescription property with displayName as default', () => {
			const result = convertNodeToHitlTool(fullNodeWrapper);
			const toolDescriptionProp = result.description.properties.find(
				(prop: INodeProperties) => prop.name === 'toolDescription',
			);
			expect(toolDescriptionProp).toBeDefined();
			expect(toolDescriptionProp?.type).toBe('string');
			expect(toolDescriptionProp?.default).toBe('Slack');
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

		it('should keep properties with sendAndWait displayOptions', () => {
			const result = convertNodeToHitlTool(fullNodeWrapper);
			const messageProp = result.description.properties.find(
				(prop: INodeProperties) => prop.name === 'message',
			);
			expect(messageProp).toBeDefined();
		});

		it('should preserve displayOptions on kept properties', () => {
			const result = convertNodeToHitlTool(fullNodeWrapper);
			const messageProp = result.description.properties.find(
				(prop: INodeProperties) => prop.name === 'message',
			);
			// displayOptions are preserved since operation exists as hidden property
			expect(messageProp?.displayOptions?.show?.operation).toContain(SEND_AND_WAIT_OPERATION);
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

		it('should keep responseType visible with approval as default', () => {
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
			expect(responseTypeProp?.type).toBe('options');
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
	});

	describe('createHitlTools', () => {
		let types: { nodes: INodeTypeDescription[]; credentials: unknown[] };
		let known: { nodes: Record<string, unknown>; credentials: Record<string, unknown> };

		beforeEach(() => {
			types = {
				nodes: [
					{
						name: 'slack',
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
					slack: { className: 'Slack', sourcePath: '/path/to/slack' },
				},
				credentials: {
					slackOAuth2Api: {
						className: 'SlackOAuth2Api',
						sourcePath: '/path/to/slackOAuth2Api',
						supportedNodes: ['slack'],
					},
				},
			};
		});

		it('should create HITL tools for nodes with sendAndWait operations', () => {
			createHitlTools(types as never, known as never);

			expect(types.nodes).toHaveLength(2); // Original node + HITL tool
			expect(types.nodes[1].name).toBe('slackHitlTool');
			expect(types.nodes[1].displayName).toBe('Slack');
			expect(types.nodes[1].subtitle).toBe('Send and wait');
		});

		it('should point to original node class for HITL tool', () => {
			createHitlTools(types as never, known as never);

			expect(known.nodes.slackHitlTool).toEqual({
				className: 'Slack',
				sourcePath: '/path/to/slack',
			});
		});

		it('should duplicate supportedNodes for HITL tools', () => {
			createHitlTools(types as never, known as never);

			expect(
				(known.credentials.slackOAuth2Api as { supportedNodes: string[] }).supportedNodes,
			).toEqual(['slack', 'slackHitlTool']);
		});

		it('should not create HITL tools for nodes without sendAndWait', () => {
			types.nodes[0].webhooks = undefined;
			createHitlTools(types as never, known as never);

			expect(types.nodes).toHaveLength(1); // No HITL tool created
			expect(types.nodes[0].name).toBe('slack');
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
					displayName: 'Human Review',
					type: NodeConnectionTypes.AiTool,
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
