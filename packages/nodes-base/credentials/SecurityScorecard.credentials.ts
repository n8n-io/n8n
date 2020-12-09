import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class SecurityScorecard implements ICredentialType {
	name = 'securityScorecard';
	displayName = 'SecurityScorecard';
	properties = [
		{
			displayName: 'API key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
			required: true,
		},
	];
}
