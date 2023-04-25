import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { allProperties } from './descriptions';

export class CrowdNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'crowd.dev Node',
		name: 'crowdNode',
		icon: 'file:crowd.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description:
			'crowd.dev is an open-source suite of community and data tools built to unlock community-led growth for your organization.',
		defaults: {
			name: 'Crowd Node',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'crowdApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.domain}}/api/tenant/{{$credentials.tenantId}}',
			json: true,
		},
		properties: allProperties,
	};
}
