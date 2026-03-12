import type { INodeProperties } from 'n8n-workflow';

import { SYSTEM_MESSAGE } from './prompt';

export const commonOptions: INodeProperties[] = [
	{
		displayName: 'System Message',
		name: 'systemMessage',
		type: 'string',
		default: SYSTEM_MESSAGE,
		description: 'The message that will be sent to the agent before the conversation starts',
		typeOptions: {
			rows: 6,
		},
	},
	{
		displayName: 'Max Iterations',
		name: 'maxIterations',
		type: 'number',
		default: 10,
		description: 'The maximum number of iterations the agent will run before stopping',
	},
	{
		displayName: 'Return Intermediate Steps',
		name: 'returnIntermediateSteps',
		type: 'boolean',
		default: false,
		description: 'Whether or not the output should include intermediate steps the agent took',
	},
	{
		displayName: 'Automatically Passthrough Binary Images',
		name: 'passthroughBinaryImages',
		type: 'boolean',
		default: true,
		description:
			'Whether or not binary images should be automatically passed through to the agent as image type messages',
	},
	{
		displayName: 'Save AI Announcements',
		name: 'saveAnnouncements',
		type: 'boolean',
		default: true,
		description:
			'Whether or not to save AI streamed text as a separate message in the agent context before tool calls',
		displayOptions: {
			show: {
				enableStreaming: [true],
			},
		},
	},
	{
		displayName: 'Clean Tool Call Content',
		name: 'cleanToolCallContent',
		type: 'boolean',
		default: true,
		description:
			'Whether to remove redundant "Calling tool with input" text by merging the AI announcement into the tool call message',
		displayOptions: {
			show: {
				enableStreaming: [true],
				saveAnnouncements: [true],
			},
		},
	},
];
