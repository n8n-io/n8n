import type {
	Icon,
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class MindeeV2Api implements ICredentialType {
	name = 'mindeeV2Api';

	displayName = 'Mindee API V2';
	icon: Icon = 'file:icons/Mindee.svg';
	documentationUrl = 'mindee';

	properties: INodeProperties[] = [
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
		requestOptions.headers = {
			...(requestOptions.headers ?? {}),
			// eslint-disable-next-line @typescript-eslint/naming-convention
			Authorization: apiKey,
		};
		await Promise.resolve();
		return requestOptions;
	}
}
