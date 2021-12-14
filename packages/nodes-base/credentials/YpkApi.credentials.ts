import {
		ICredentialType,
		NodePropertyTypes,
} from 'n8n-workflow';

export class YpkApi implements ICredentialType {
		name = 'ypkApi';
		displayName = 'YPK API';
		documentationUrl = 'ypk';
		properties = [
				{
						displayName: 'API Key',
						name: 'apiKey',
						type: 'string' as NodePropertyTypes,
						default: '',
				},
				{
						displayName: 'URL',
						name: 'apiURL',
						type: 'string' as NodePropertyTypes,
						default: '',
				},
		];
}
 