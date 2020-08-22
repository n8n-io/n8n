import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class FlowApi implements ICredentialType {
	name = 'flowApi';
	displayName = 'Flow API';
	documentationUrl = 'flow';
	properties = [
		{
			displayName: 'Organization ID',
			name: 'organizationId',
			type: 'number' as NodePropertyTypes,
			default: 0,
		},
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
