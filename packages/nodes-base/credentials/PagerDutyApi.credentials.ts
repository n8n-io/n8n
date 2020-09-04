import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class PagerDutyApi implements ICredentialType {
	name = 'pagerDutyApi';
	displayName = 'PagerDuty API';
	documentationUrl = 'pagerDuty';
	properties = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
