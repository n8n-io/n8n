import {
	ICredentialType,
	INodeProperties,
	ICredentialDataDecryptedObject,
	IHttpRequestOptions
} from 'n8n-workflow';


import * as forge from 'node-forge';

export class EfiBankPixApi implements ICredentialType {
	name = 'EfiBankPixApi';
	displayName = 'Efí Bank | API Pix';
	documentationUrl = 'https://dev.efipay.com.br/docs/api-pix/credenciais';

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
			{
				displayName: 'Certificado',
				name: 'certificatePem',
				type: 'string',
				default: '',
				required: true,
				description: 'Cole o conteúdo completo do certificado PEM (BEGIN/END)',
			},
			{
				displayName: 'Key',
				name: 'keyPem',
				type: 'string',
				default: '',
				required: true,
				description: 'Cole o conteúdo completo da chave privada PEM (BEGIN/END)',
			},
	];

	private convertPemToP12Base64(credentials: ICredentialDataDecryptedObject): string {
		try {
			const certificatePem = String(credentials.certificatePem || "").replace(/\\n/g, "\n");
			const keyPem = String(credentials.keyPem || "").replace(/\\n/g, "\n");

			const certificate = forge.pki.certificateFromPem(certificatePem);
			const privateKey = forge.pki.privateKeyFromPem(keyPem);

			const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
				privateKey,
				[certificate],
				'',
				{
					friendlyName: 'Efi Bank Certificate',
					generateLocalKeyId: true,
				}
			);

			const p12Der = forge.asn1.toDer(p12Asn1).getBytes();

			const certificate_base64 = Buffer.from(p12Der, 'binary').toString('base64');

        return certificate_base64;
		} catch (error) {
			console.error('Erro ao converter PEM para P12 Base64:', error);
			throw new Error(`Falha na conversão de certificados: ${error.message}`);
		}
	}

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions
	): Promise<IHttpRequestOptions> {

		const isProd = credentials.environment === "prod";

		const clientId = isProd ? credentials.clientIdProd : credentials.clientIdHomolog;
		const clientSecret = isProd ? credentials.clientSecretProd : credentials.clientSecretHomolog;

		const encodedApiKey = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

		const certificate_base64 = this.convertPemToP12Base64(credentials);

		requestOptions.headers = requestOptions.headers || {};
		requestOptions.body = requestOptions.body || {};

		requestOptions.headers.Authorization = `Basic ${encodedApiKey}`;
		requestOptions.headers["Content-Type"] = "application/json";

		const bodyData = requestOptions.body as Record<string, any>;
		bodyData.grant_type = "client_credentials";
		bodyData.certificate_base64 = certificate_base64;

		console.log("Request Options:", {
			url: requestOptions.url,
			method: requestOptions.method,
			headers: requestOptions.headers,
			bodyKeys: Object.keys(bodyData),
		});

		return requestOptions;
	}

}
