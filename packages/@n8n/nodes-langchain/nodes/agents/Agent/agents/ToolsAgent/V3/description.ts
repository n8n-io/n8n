import type { INodeProperties } from 'n8n-workflow';

import { getBatchingOptionFields } from '@n8n/ai-utilities';

import { commonOptions } from '../options';

const enableStreaminOption: INodeProperties = {
	displayName: 'Enable Streaming',
	name: 'enableStreaming',
	type: 'boolean',
	default: true,
	description: 'Whether this agent will stream the response in real-time as it generates text',
};

const parseOutputOption: INodeProperties = {
	displayName: 'Parse JSON Output',
	name: 'parseOutput',
	type: 'boolean',
	default: false,
	description:
		"Whether to automatically extract and parse JSON from the agent's output. When enabled, if the output contains JSON (even wrapped in markdown code blocks or mixed with other text), it will be parsed and returned as a JSON object. Falls back to the raw text if no valid JSON is found.",
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
		parseOutputOption,
	],
};
