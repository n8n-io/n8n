import { mock } from 'jest-mock-extended';
import type { LoadedClass, INodeTypeDescription } from 'n8n-workflow';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NodeTypes } from '@/node-types';

const createLoadedClass = (description: INodeTypeDescription): LoadedClass => ({
	sourcePath: '',
	type: {
		description,
		supplyData: undefined,
	},
});

const createChatTriggerDescription = (): INodeTypeDescription =>
	({
		name: 'chatTrigger',
		displayName: 'Chat Trigger',
		properties: [
			{
				displayName: 'Make Chat Publicly Available',
				name: 'public',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				default: 'hostedChat',
				options: [],
				displayOptions: {
					show: {
						public: [true],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				default: {},
				options: [],
				displayOptions: {
					show: {
						public: [false],
						'@version': [1],
					},
				},
			},
			{
				displayName: 'Make Available in n8n Chat Hub',
				name: 'availableInChat',
				type: 'boolean',
				default: false,
			},
		],
	}) as INodeTypeDescription;

describe('NodeTypes chat trigger policy', () => {
	const originalEnv = process.env.N8N_DISABLE_PUBLIC_CHAT_TRIGGER;
	const loadNodesAndCredentials = mock<LoadNodesAndCredentials>();
	const nodeTypes = new NodeTypes(loadNodesAndCredentials);

	beforeEach(() => {
		jest.clearAllMocks();

		loadNodesAndCredentials.getNode.mockImplementation((fullNodeType) => {
			if (fullNodeType === 'chatTrigger') {
				return createLoadedClass(createChatTriggerDescription());
			}

			if (fullNodeType === 'httpRequest') {
				return createLoadedClass({
					name: 'httpRequest',
					displayName: 'HTTP Request',
					properties: [
						{
							displayName: 'Public',
							name: 'public',
							type: 'boolean',
							default: false,
						},
					],
				} as INodeTypeDescription);
			}

			throw new Error(`Unexpected node type: ${fullNodeType}`);
		});
	});

	afterEach(() => {
		if (originalEnv === undefined) {
			delete process.env.N8N_DISABLE_PUBLIC_CHAT_TRIGGER;
		} else {
			process.env.N8N_DISABLE_PUBLIC_CHAT_TRIGGER = originalEnv;
		}
	});

	it('filters public chat properties from chat trigger descriptions when enabled', () => {
		process.env.N8N_DISABLE_PUBLIC_CHAT_TRIGGER = 'true';

		const [result] = nodeTypes.getNodeTypeDescriptions([{ name: 'chatTrigger', version: 1 }]);

		const publicProperty = result.properties.find((property) => property.name === 'public');
		const optionsProperty = result.properties.find((property) => property.name === 'options');
		const chatHubProperty = result.properties.find(
			(property) => property.name === 'availableInChat',
		);

		expect(publicProperty?.displayOptions).toEqual({
			show: {
				'@version': [999],
			},
		});
		expect(optionsProperty?.displayOptions).toEqual({
			show: {
				'@version': [1],
			},
		});
		expect(chatHubProperty).toBeDefined();
	});

	it('does not alter unrelated node descriptions', () => {
		process.env.N8N_DISABLE_PUBLIC_CHAT_TRIGGER = 'true';

		const [result] = nodeTypes.getNodeTypeDescriptions([{ name: 'httpRequest', version: 1 }]);

		expect(result.properties).toHaveLength(1);

		expect(result.properties[0]).toMatchObject({
			displayName: 'Public',
			name: 'public',
			type: 'boolean',
			default: false,
		});

		expect(result.properties[0]).not.toHaveProperty('displayOptions');
	});
});
