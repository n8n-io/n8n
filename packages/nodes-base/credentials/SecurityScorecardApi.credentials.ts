import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class SecurityScorecardApi implements ICredentialType {
	name = 'securityScorecardApi';
	displayName = 'SecurityScorecard API';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
			required: true,
		},
	];
}
