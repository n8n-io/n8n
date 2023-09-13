import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class TwakeServerApi implements ICredentialType {
	name = 'twakeServerApi';

	displayName = 'Twake Server API';

	documentationUrl = 'twake';

	httpRequestNodeVariant = {
		docsUrl: 'https://doc.twake.app/developers-api/home',
		apiBaseUrl: '',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Host URL',
			name: 'hostUrl',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Public ID',
			name: 'publicId',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Private API Key',
			name: 'privateApiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
}
