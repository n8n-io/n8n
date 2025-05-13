import type { INodeProperties } from 'n8n-workflow';

import { getBatchingOptionFields } from '@utils/sharedFields';

import { commonOptions } from '../options';

export const toolsAgentProperties: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		placeholder: 'Add Option',
		options: [...commonOptions, getBatchingOptionFields(undefined, 1)],
	},
];
