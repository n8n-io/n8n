import type {
	IAuthenticateGeneric,
	ICredentialTestFunctions,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class NvidiaNimApi implements ICredentialType {
	name = 'nvidiaNimApi';

	displayName = 'NVIDIA NIM API';

	documentationUrl = 'nvidianim';

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://integrate.api.nvidia.com/v1',
			required: true,
			description: 'The base URL for the NVIDIA NIM instance. Use the default for NVIDIA-hosted NIMs.',
			placeholder: 'e.g. http://localhost:8000/v1',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'The API key for authentication. For self-hosted NIMs, this might be optional.',
		},
	];

	test: ICredentialTestFunctions = {
		async test(this: ICredentialTestFunctions) {
			const baseUrl = (this.getCredentialData('baseUrl') as string) || 'https://integrate.api.nvidia.com/v1';
			const url = `${baseUrl.replace(/\/$/, '')}/models`;

			try {
				await this.helpers.requestWithAuthentication.call(this, 'nvidiaNimApi', {
					method: 'GET',
					uri: url,
					json: true,
				});
				return {
					status: 'OK',
					message: 'Connection successful',
				};
			} catch (error) {
				// Provide a clear error message to help users debug self-hosting issues
				return {
					status: 'Error',
					message: `Connection failed: ${error.message}. Check your Base URL and API key.`,
				};
			}
		},
	};
}
