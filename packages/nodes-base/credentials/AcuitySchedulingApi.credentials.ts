import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class AcuitySchedulingApi implements ICredentialType {
	name = 'acuitySchedulingApi';
	displayName = 'Acuity Scheduling API';
	documentationUrl = 'acuityScheduling';
	properties = [
		{
			displayName: 'User ID',
			name: 'userId',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
