export type CustomTemplateConfig =
	| {
			credentialType: 'apiKey' | 'bearer' | 'basicAuth' | 'custom' | 'none';
			baseUrl: string;
	  }
	| { credentialType: 'oauth2'; baseUrl: string; flow: string };

export type CredentialType = CustomTemplateConfig['credentialType'];
