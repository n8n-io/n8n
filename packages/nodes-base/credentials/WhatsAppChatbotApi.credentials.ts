import {
	ICredentialType,
	INodeProperties,
	ICredentialTestRequest,
	IHttpRequestOptions,
	ICredentialDataDecryptedObject,
} from 'n8n-workflow';

export class WhatsAppChatbotApi implements ICredentialType {
	name = 'whatsAppChatbotApi';
	displayName = 'WhatsApp Chatbot API';
	documentationUrl = 'https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages';
	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'Token de acceso permanente de WhatsApp Business API',
		},
		{
			displayName: 'Phone Number ID',
			name: 'phoneNumberId',
			type: 'string',
			default: '',
			required: true,
			description: 'ID del número de teléfono de WhatsApp Business',
		},
		{
			displayName: 'Business Account ID',
			name: 'businessAccountId',
			type: 'string',
			default: '',
			description: 'ID de tu cuenta de negocio de Meta (opcional)',
		},
		{
			displayName: 'Webhook Verify Token',
			name: 'webhookVerifyToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'Token para verificar webhooks de entrada (opcional)',
		},
	];

	authenticate = async (
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> => {
		// Validar que tenemos el token
		if (!credentials.apiToken) {
			throw new Error('API Token es requerido');
		}

		// Agregar token a headers
		requestOptions.headers = requestOptions.headers || {};
		requestOptions.headers.Authorization = `Bearer ${credentials.apiToken}`;

		return requestOptions;
	};

	// Test de conexión
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://graph.instagram.com',
			url: '/v18.0/me',
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
		},
		rules: [
			{
				type: 'responseCode',
				properties: {
					value: 200,
					message: 'Credencial válida',
				},
			},
		],
	};
}
