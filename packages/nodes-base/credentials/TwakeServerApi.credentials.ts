import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class TwakeServerApi implements ICredentialType {
	name = 'twakeServerApi';
	displayName = 'Twake API';
	documentationUrl = 'twake';
	properties = [
		{
			displayName: 'Host URL',
			name: 'hostUrl',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Public ID',
			name: 'publicId',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Private API Key',
			name: 'privateApiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
