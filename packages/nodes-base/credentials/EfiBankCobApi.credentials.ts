import {
	ICredentialType,
	INodeProperties,
	ICredentialDataDecryptedObject,
	IHttpRequestOptions,
	ICredentialTestRequest,
} from 'n8n-workflow';

export class EfiBankCobApi implements ICredentialType {
	name = 'EfiBankCobApi';
	displayName = 'Efí Bank | API Cobranças';
	documentationUrl = 'https://dev.efipay.com.br/docs/api-cobrancas/credenciais';

	properties: INodeProperties[] = [
		{
			displayName: 'Ambiente',
			name: 'environment',
			type: 'options',
			options: [
				{ name: 'Homologação', value: 'homolog' },
				{ name: 'Produção', value: 'prod' },
			],
			default: 'homolog',
			required: true,
			description: 'Selecione o ambiente correto para suas credenciais',
		},
		{
			displayName: 'Chave Client ID Produção',
			name: 'clientIdProd',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Chave Client Secret Produção',
			name: 'clientSecretProd',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Chave Client ID Homologação',
			name: 'clientIdHomolog',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Chave Client Secret Homologação',
			name: 'clientSecretHomolog',
			type: 'string',
			default: '',
			required: true,
		},
	];

	async authenticate(
    credentials: ICredentialDataDecryptedObject,
    requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const isProd = credentials.environment === 'prod';

    const clientId = isProd ? credentials.clientIdProd : credentials.clientIdHomolog;
    const clientSecret = isProd ? credentials.clientSecretProd : credentials.clientSecretHomolog;

    const encodedApiKey = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    requestOptions.headers = requestOptions.headers || {};
    requestOptions.body = requestOptions.body || {};

    requestOptions.headers.Authorization = `Basic ${encodedApiKey}`;
    requestOptions.headers['Content-Type'] = 'application/json';
		(requestOptions.body as Record<string, any>)['grant_type'] = 'client_credentials';

    return requestOptions;
	}

		test: ICredentialTestRequest = {
				request: {
						baseURL: '={{$credentials.environment === "prod" ? "https://cobrancas.api.efipay.com.br" : "https://cobrancas-h.api.efipay.com.br" }}',
						url: '/v1/authorize',
						method: 'POST',
				},
		};
}
