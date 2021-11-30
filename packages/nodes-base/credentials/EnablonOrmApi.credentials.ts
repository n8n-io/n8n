import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class EnablonOrmApi implements ICredentialType {
	name = 'enablonOrmApi';
	displayName = 'Enablon ORM API';
	documentationUrl = 'enablon';
	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			default: '',
		},
		{
			displayName: 'APP Access Type',
			name: 'accessType',
			type: 'options',
			options: [
				{
					name: 'Permits',
					value: 'permits',
				},
				{
					name: 'Isolations',
					value: 'isolations',
				},
				{
					name: 'Risk Assessments',
					value: 'riskAssessments',
				},
				{
					name: 'Full Enablon ORM',
					value: 'full',
				},
			],
			default: 'full',
		},
	];
}
