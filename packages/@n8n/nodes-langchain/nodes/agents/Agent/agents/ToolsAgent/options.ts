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
		displayName: "Make Model Aware of Tool's Binaries",
		name: 'modelAwareOfToolBinaries',
		type: 'boolean',
		default: false,
		description:
			'Whether the language model is aware of the binary outputs from tools when generating responses. This allows the model, if capable, to describe images or the contents of text files returned by those tools. Enabling this option will increase token usage.',
	},
	{
		displayName: "Include Binaries From Tools in Agent's Ouput",
		name: 'includeToolBinariesInOutput',
		type: 'boolean',
		default: false,
		description: "Whether to include binaries produced by tools in the agent's final output",
	},
];
