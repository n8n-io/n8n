import { autoSaveHighlightedDataProperty } from 'n8n-nodes-base/dist/utils/highlightedData';
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

const forceToolCallOnFirstIterationOption: INodeProperties = {
	displayName: 'Force Tool Call on First Iteration',
	name: 'forceToolCallOnFirstIteration',
	type: 'boolean',
	default: false,
	description:
		'Whether the model must call at least one tool on its first response of each run. Later responses are unrestricted so the agent can answer. Useful for smaller models that otherwise skip tool calls; the model must support forced tool choice.',
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
		autoSaveHighlightedDataProperty,
		enableStreaminOption,
		getBatchingOptionFields(undefined, 1),
		maxTokensFromMemoryOption,
		forceToolCallOnFirstIterationOption,
	],
};
