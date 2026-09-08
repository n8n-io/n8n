import { autoSaveHighlightedDataProperty } from 'n8n-nodes-base/dist/utils/highlightedData';
import type { INodeProperties } from 'n8n-workflow';

import { getBatchingOptionFields } from '@n8n/ai-utilities';

import { commonOptions } from '../options';

const enableStreaminOption: INodeProperties = {
	displayName: 'Enable streaming',
	name: 'enableStreaming',
	type: 'boolean',
	default: true,
	description: 'Whether this agent will stream the response in real-time as it generates text',
};

const maxTokensFromMemoryOption: INodeProperties = {
	displayName: 'Max tokens to read from memory',
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
	placeholder: 'Add option',
	options: [
		...commonOptions,
		autoSaveHighlightedDataProperty,
		enableStreaminOption,
		getBatchingOptionFields(undefined, 1),
		maxTokensFromMemoryOption,
	],
};
