import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { allProperties } from './descriptions';

export class CrowdDevNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'crowd.dev Node',
		name: 'crowdDevNode',
		icon: 'file:crowdDev.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description:
			'crowd.dev is an open-source suite of community and data tools built to unlock community-led growth for your organization.',
		defaults: {
			name: 'crowd.dev Node',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'crowdDevApi',
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
