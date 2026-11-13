import type { INodeProperties } from 'n8n-workflow';

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
export const actionNodeOptions: INodeProperties = {
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	placeholder: 'Add Option',
	description: 'Additional options to add',
	default: {},
	options: [
		{
			displayName: 'Frequency Penalty',
			name: 'frequencyPenalty',
			type: 'number',
			default: 0,
			typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
			description:
				"Positive values penalise tokens by how often they have appeared, lowering the model's tendency to repeat a line",
		},
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
		{
			displayName: 'Presence Penalty',
			name: 'presencePenalty',
			type: 'number',
			default: 0,
			typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
			description:
				"Positive values penalise tokens that have appeared at all, raising the model's tendency to change subject",
		},
		{
			displayName: 'Sampling Temperature',
			name: 'temperature',
			type: 'number',
			default: 0.7,
			typeOptions: { maxValue: 2, minValue: 0, numberPrecision: 1 },
			description: 'Lower values make the answer more deterministic and repetitive',
		},
		{
			displayName: 'Seed',
			name: 'seed',
			type: 'number',
			default: 0,
			description: 'Ask the provider to sample deterministically. Not every provider honours it.',
		},
		{
			displayName: 'Stop Sequences',
			name: 'stop',
			type: 'string',
			default: '',
			placeholder: 'e.g. END,STOP',
			description: 'Comma-separated strings that end the answer when the model produces one',
		},
		{
			displayName: 'Timeout',
			name: 'timeout',
			type: 'number',
			default: 360000,
			description: 'How long one request may take, in milliseconds',
		},
		{
			displayName: 'Top P',
			name: 'topP',
			type: 'number',
			default: 1,
			typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
			description:
				'Nucleus sampling: 0.5 considers half of the likelihood-weighted options. Change this or the temperature, not both.',
		},
	],
};
