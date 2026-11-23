import type { INodeProperties } from 'n8n-workflow';

import { chatCompletionsOptions } from '@utils/custom-model-endpoint/descriptions';

export const messagesField: INodeProperties = {
	displayName: 'Messages',
	name: 'messages',
	type: 'fixedCollection',
	typeOptions: { multipleValues: true, sortable: true },
	placeholder: 'Add Message',
	default: { message: [{ role: 'user', content: '' }] },
	description: 'The conversation to send, in order',
	options: [
		{
			displayName: 'Message',
			name: 'message',
			values: [
				{
					displayName: 'Role',
					name: 'role',
					type: 'options',
					options: [
						{ name: 'System', value: 'system' },
						{ name: 'User', value: 'user' },
						{ name: 'Assistant', value: 'assistant' },
					],
					default: 'user',
				},
				{
					displayName: 'Content',
					name: 'content',
					type: 'string',
					typeOptions: { rows: 3 },
					default: '',
				},
			],
		},
	],
};

/**
 * The action node carries both token caps as separate fields rather than the one
 * auto-switching field the chat model uses: here the user is writing the request
 * body themselves, and a gateway in front of several providers may accept only one
 * of the two whatever the model name suggests.
 */
const tokenCapFields: INodeProperties[] = [
	{
		displayName: 'Max Completion Tokens',
		name: 'maxCompletionTokens',
		type: 'number',
		default: -1,
		description: 'The cap on the tokens generated, sent as max_completion_tokens',
	},
	{
		displayName: 'Maximum Number of Tokens',
		name: 'maxTokens',
		type: 'number',
		default: -1,
		description: 'The cap on the tokens generated, sent as max_tokens',
	},
];

/** The chat model's single auto-switching cap, and a retry count the node does not own. */
const REPLACED = new Set(['maxTokens', 'maxRetries']);

export const actionNodeOptions: INodeProperties = {
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	placeholder: 'Add Option',
	description: 'Additional options to add',
	default: {},
	options: [
		...chatCompletionsOptions.filter(({ name }) => !REPLACED.has(name)),
		...tokenCapFields,
	].sort((left, right) => left.displayName.localeCompare(right.displayName)),
};
