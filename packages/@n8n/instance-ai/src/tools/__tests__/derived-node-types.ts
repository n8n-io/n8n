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

/** The node types of an instance with the given `n8n-nodes-base` descriptions. */
export function derivedNodeTypes(descriptions: INodeTypeDescription[] = [mattermostDescription]) {
	const getByNameAndVersion = vi.fn((nodeType: string) => {
		const description = descriptions.find(({ name }) => `n8n-nodes-base.${name}` === nodeType);
		if (!description) throw new Error(`Unknown node type ${nodeType}`);
		return { description };
	});
	return {
		getByNameAndVersion,
		getByName: vi.fn(),
		getKnownTypes: vi.fn(() => ({})),
	} as unknown as INodeTypes & { getByNameAndVersion: typeof getByNameAndVersion };
}
