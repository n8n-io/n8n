import type {
	Icon,
	ICredentialDataDecryptedObject,
	ICredentialType,
	IDataObject,
	IHttpRequestOptions,
	INodeProperties,
	IRequestOptions,
} from 'n8n-workflow';

export class MindeeReceiptApi implements ICredentialType {
	name = 'mindeeReceiptApi';

	displayName = 'Mindee Receipt API';

	icon: Icon = 'file:icons/Mindee.svg';

	documentationUrl = 'mindee';

	properties: INodeProperties[] = [
		{
			displayName:
				'⚠️ This credential targets Mindee V1, which is on legacy support and only works with products created before ' +
				'its retirement. Use the <strong>Mindee API (V2)</strong> credential with the latest node version instead.',
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
		const apiKey = credentials.apiKey;
		if (typeof apiKey !== 'string') {
			throw new Error('Mindee API key must be a string');
		}
		const url = new URL((requestOptions as IRequestOptions).uri ?? requestOptions.url);
		const headers: IDataObject = { ...(requestOptions.headers ?? {}) };
		if (url.hostname === 'api.mindee.net' && url.pathname.startsWith('/v1/')) {
			headers.Authorization = `Token ${apiKey}`;
		} else {
			headers['X-Inferuser-Token'] = apiKey;
		}
		requestOptions.headers = headers;
		await Promise.resolve();
		return requestOptions;
	}
}
