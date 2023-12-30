/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { INodeTypeDescription } from 'n8n-workflow';
import { properties as generateProperties } from './actions/generate/properties';
import { properties as hashProperties } from './actions/hash/properties';
import { properties as hmacProperties } from './actions/hmac/properties';
import { properties as signProperties } from './actions/sign/properties';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Crypto',
	name: 'crypto',
	icon: 'fa:key',
	group: ['transform'],
	version: 2,
	subtitle: '={{$parameter["action"]}}',
	description: 'Provide cryptographic utilities',
	defaults: {
		name: 'Crypto',
		color: '#408000',
	},
	inputs: ['main'],
	outputs: ['main'],
	credentials: [
		{
			// eslint-disable-next-line n8n-nodes-base/node-class-description-credentials-name-unsuffixed
			name: 'crypto',
			required: false,
			displayOptions: { show: { action: ['hmac', 'sign'] } },
		},
	],
	properties: [
		{
			displayName: 'Action',
			name: 'action',
			type: 'options',
			options: [
				{
					name: 'Generate',
					description: 'Generate random string',
					value: 'generate',
					action: 'Generate random string',
				},
				{
					name: 'Hash',
					description: 'Hash a text or file in a specified format',
					value: 'hash',
					action: 'Hash a text or file in a specified format',
				},
				{
					name: 'Hmac',
					description: 'Hmac a text or file in a specified format',
					value: 'hmac',
					action: 'HMAC a text or file in a specified format',
				},
				{
					name: 'Sign',
					description: 'Sign a string using a private key',
					value: 'sign',
					action: 'Sign a string using a private key',
				},
			],
			default: 'hash',
		},
		...generateProperties,
		...hashProperties,
		...hmacProperties,
		...signProperties,
	],
};
