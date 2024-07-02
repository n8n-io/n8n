import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class DynatraceApi implements ICredentialType {
	name = 'dynatraceApi';

	displayName = 'DynatraceAPI';

	documentationUrl = 'dynatrace';

	icon = { light: 'file:icons/Dynatrace.svg', dark: 'file:icons/Dynatrace.svg' } as const;

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			required: true,
			type: 'string',
			typeOptions: { password: true },
			default: '',
		}
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.headers = {
			Authorization: 'Api-Token ' + credentials.apiKey,
		};
		return requestOptions;
	}
}
