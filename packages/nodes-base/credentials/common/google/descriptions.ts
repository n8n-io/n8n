import type { INodeProperties } from 'n8n-workflow';

import { regions } from './regions';

export const googleRegionProperty: INodeProperties = {
	displayName: 'Region',
	name: 'region',
	type: 'options',
	options: [
		// Newer Gemini models (e.g. Gemini 3.x) are only served from `global` or the
		// `eu`/`us` multi-region locations, not individual regions, so list them first.
		{ name: 'Global (multi-region) - global', value: 'global' },
		{ name: 'EU (multi-region) - eu', value: 'eu' },
		{ name: 'US (multi-region) - us', value: 'us' },
		...regions.map((r) => ({
			name: `${r.displayName} (${r.location}) - ${r.name}`,
			value: r.name,
		})),
	],
	// Global is the only location that serves both Gemini 2.x and 3.x models.
	default: 'global',
	description:
		'The region where the Google Cloud service is located. This applies only to specific nodes, like the Google Vertex Chat Model',
};

export const googleServiceAccountEmailProperty: INodeProperties = {
	displayName: 'Service Account Email',
	name: 'email',
	type: 'string',
	placeholder: 'name@email.com',
	default: '',
	description: 'The Google Service account similar to user-808@project.iam.gserviceaccount.com',
	required: true,
};

export const googleServiceAccountPrivateKeyProperty: INodeProperties = {
	displayName: 'Private Key',
	name: 'privateKey',
	type: 'string',
	default: '',
	placeholder:
		'-----BEGIN PRIVATE KEY-----\nXIYEvQIBADANBg<...>0IhA7TMoGYPQc=\n-----END PRIVATE KEY-----\n',
	description:
		'Enter the private key located in the JSON file downloaded from Google Cloud Console',
	required: true,
	typeOptions: {
		password: true,
	},
};

export const googleServiceAccountProperties: INodeProperties[] = [
	googleRegionProperty,
	googleServiceAccountEmailProperty,
	googleServiceAccountPrivateKeyProperty,
];
