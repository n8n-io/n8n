import type { INodeProperties } from 'n8n-workflow';

import { getBatchingOptionFields } from '@utils/sharedFields';

import { commonOptions } from '../options';

const enableStreaminOption: INodeProperties = {
	displayName: 'Enable Streaming',
	name: 'enableStreaming',
	type: 'boolean',
	default: true,
	description: 'Whether this agent will stream the response in real-time as it generates text',
};

const maxTokensFromMemoryOption: INodeProperties = {
	displayName: 'Max Tokens To Read From Memory',
	name: 'maxTokensFromMemory',
	type: 'hidden',
	default: 0,
	description:
		'The maximum number of tokens to read from the chat memory history. Set to 0 to read all history.',
};

export const toolsAgentProperties: INodeProperties = {
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	default: {},
	placeholder: 'Add Option',
	options: [
		...commonOptions,
		enableStreaminOption,
		getBatchingOptionFields(undefined, 1),
		maxTokensFromMemoryOption,
	],
};
