import { 
	INodeProperties,
	INodeTypeDescription,
} from 'n8n-workflow';
import * as employees from './employees';


export const versionDescription: INodeTypeDescription = {
	displayName: 'Mattermost',
	name: 'mattermost',
	icon: 'file:mattermost.svg',
	group: ['output'],
	version: 1,
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Sends data to Mattermost',
	defaults: {
		name: 'Mattermost',
		color: '#000000',
	},
	inputs: ['main'],
	outputs: ['main'],
	credentials: [
		{
			name: 'mattermostApi',
			required: true,
		},
	],
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			options: [
				{
          name: 'Employees',
          value: 'employees',
				}
			],
			default: 'message',
			description: 'The resource to operate on',
		},
    ...employees.descriptions
	],
};
