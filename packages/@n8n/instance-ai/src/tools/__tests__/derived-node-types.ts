import type { INodeTypeDescription, INodeTypes } from 'n8n-workflow';

const operation = (resource: string, options: Array<[string, string]>) => ({
	displayName: 'Operation',
	name: 'operation',
	type: 'options' as const,
	noDataExpression: true,
	displayOptions: { show: { resource: [resource] } },
	options: options.map(([value, action]) => ({ name: value, value, action })),
	default: options[0]?.[0] ?? '',
});

/** A legacy node without a typed module: 4 actions, one with a resource locator. */
export const mattermostDescription: INodeTypeDescription = {
	displayName: 'Mattermost',
	name: 'mattermost',
	group: ['output'],
	version: [2, 2.3],
	description: 'Consume Mattermost API',
	defaults: { name: 'Mattermost' },
	inputs: ['main'],
	outputs: ['main'],
	credentials: [{ name: 'mattermostApi', required: true }],
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{ name: 'Message', value: 'message' },
				{ name: 'Channel', value: 'channel' },
			],
			default: 'message',
		},
		operation('message', [
			['post', 'Post a message'],
			['delete', 'Delete a message'],
		]),
		operation('channel', [
			['create', 'Create a channel'],
			['archive', 'Archive a channel'],
		]),
		{
			displayName: 'Channel',
			name: 'channelId',
			type: 'resourceLocator',
			required: true,
			displayOptions: { show: { resource: ['message'], operation: ['post'] } },
			default: { mode: 'id', value: '' },
			modes: [{ displayName: 'ID', name: 'id', type: 'string' }],
		},
		{
			displayName: 'Message',
			name: 'message',
			type: 'string',
			required: true,
			displayOptions: { show: { resource: ['message'], operation: ['post'] } },
			default: '',
		},
		{
			displayName: 'Post ID',
			name: 'postId',
			type: 'string',
			required: true,
			displayOptions: { show: { resource: ['message'], operation: ['delete'] } },
			default: '',
		},
		{
			displayName: 'Name',
			name: 'name',
			type: 'string',
			required: true,
			displayOptions: { show: { resource: ['channel'] } },
			default: '',
		},
	],
};

const text = { displayName: 'Text', name: 'text', type: 'string' as const, default: '' };

const node = (
	name: string,
	connections: Pick<INodeTypeDescription, 'inputs' | 'outputs'>,
	change: Partial<INodeTypeDescription> = {},
): INodeTypeDescription => ({
	displayName: name,
	name,
	group: ['transform'],
	version: 1,
	description: `The ${name} node`,
	defaults: { name },
	properties: [text],
	...connections,
	...change,
});

/** An AI root node, a chat model, a memory, and a community trigger, by node type. */
export const aiNodeTypes: ReadonlyArray<readonly [string, INodeTypeDescription]> = [
	[
		'@n8n/n8n-nodes-langchain.agentRoot',
		node('agentRoot', {
			inputs: [
				'main',
				{ type: 'ai_languageModel', required: true, maxConnections: 1 },
				{ type: 'ai_memory', maxConnections: 1 },
				'ai_tool',
			],
			outputs: ['main'],
		}),
	],
	[
		'@n8n/n8n-nodes-langchain.lmChatAcme',
		node('lmChatAcme', { inputs: [], outputs: ['ai_languageModel'] }, { version: [1, 1.2] }),
	],
	[
		'@n8n/n8n-nodes-langchain.memoryAcme',
		node('memoryAcme', { inputs: [], outputs: ['ai_memory'] }),
	],
	[
		'n8n-nodes-acme.acmeTrigger',
		node(
			'acmeTrigger',
			{ inputs: [], outputs: ['main'] },
			{ group: ['trigger'], version: 2, webhooks: [] },
		),
	],
];

/**
 * The node types of an instance with the given `n8n-nodes-base` descriptions, and `others` by
 * node type, e.g. of a community package.
 */
export function derivedNodeTypes(
	descriptions: INodeTypeDescription[] = [mattermostDescription],
	others: ReadonlyArray<readonly [string, INodeTypeDescription]> = [],
) {
	const getByNameAndVersion = vi.fn((nodeType: string) => {
		const description =
			descriptions.find(({ name }) => `n8n-nodes-base.${name}` === nodeType) ??
			others.find(([type]) => type === nodeType)?.[1];
		if (!description) throw new Error(`Unknown node type ${nodeType}`);
		return { description };
	});
	return {
		getByNameAndVersion,
		getByName: vi.fn(),
		getKnownTypes: vi.fn(() => ({})),
	} as unknown as INodeTypes & { getByNameAndVersion: typeof getByNameAndVersion };
}
