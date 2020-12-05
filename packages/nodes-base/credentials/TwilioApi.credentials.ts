import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class TwilioApi implements ICredentialType {
	name = 'twilioApi';
	displayName = 'Twilio API';
	documentationUrl = 'twilio';
	properties = [
		{
			displayName: 'Account SID',
			name: 'accountSid',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Auth Token',
			name: 'authToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
