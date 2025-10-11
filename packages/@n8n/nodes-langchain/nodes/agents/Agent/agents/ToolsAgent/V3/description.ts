import type { INodeProperties } from 'n8n-workflow';

import { getBatchingOptionFields } from '@utils/sharedFields';

import { commonOptions, enableStreamingToolCallsOption } from '../options';

const enableStreaminOption: INodeProperties = {
	displayName: 'Enable Streaming',
	name: 'enableStreaming',
	type: 'boolean',
	default: true,
	description: 'Whether this agent will stream the response in real-time as it generates text',
};

export const toolsAgentProperties: INodeProperties = {
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	default: {},
	placeholder: 'Add Option',
	options: [...commonOptions, enableStreaminOption, enableStreamingToolCallsOption, getBatchingOptionFields(undefined, 1)],
};
