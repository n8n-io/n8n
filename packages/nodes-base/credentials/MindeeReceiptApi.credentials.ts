import type {
	Icon,
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class MindeeReceiptApi implements ICredentialType {
	name = 'mindeeReceiptApi';

	displayName = 'Mindee Receipt API';

	icon: Icon = 'file:icons/Mindee.svg';

	documentationUrl = 'mindee';

	properties: INodeProperties[] = [
		{
			displayName:
				'⚠️ This credential targets Mindee V1, which is on legacy support and only works with products created before its retirement. Use the <strong>Mindee API (V2)</strong> credential with the latest node version instead.',
			name: 'deprecationNotice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		// @ts-ignore
		const url = new URL(requestOptions.url ? requestOptions.url : requestOptions.uri);
		if (url.hostname === 'api.mindee.net' && url.pathname.startsWith('/v1/')) {
			requestOptions.headers!.Authorization = `Token ${credentials.apiKey}`;
		} else {
			requestOptions.headers!['X-Inferuser-Token'] = `${credentials.apiKey}`;
		}
		return requestOptions;
	}
}
