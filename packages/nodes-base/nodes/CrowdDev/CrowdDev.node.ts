import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { allProperties } from './descriptions';

export class CrowdDev implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'crowd.dev',
		name: 'crowdDev',
		icon: { light: 'file:crowdDev.svg', dark: 'file:crowdDev.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description:
			'crowd.dev is an open-source suite of community and data tools built to unlock community-led growth for your organization.',
		defaults: {
			name: 'crowd.dev',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'crowdDevApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.url}}/api/tenant/{{$credentials.tenantId}}',
			json: true,
			skipSslCertificateValidation: '={{ $credentials.allowUnauthorizedCerts }}',
		},
		properties: allProperties,
	};
}
