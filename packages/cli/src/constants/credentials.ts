export const SHARED_CREDENTIAL_TYPES = [
	'openAiApi',
	'deepSeekApi',
	'anthropicApi',
	'azureOpenAiApi',
	'googlePalmApi',
	'postgres',
	'mongoDb',
	'mcpClientApi',
	'mcpClientSseApi',
	'mcpClientHttpApi',
] as const;

export type CredentialType = (typeof SHARED_CREDENTIAL_TYPES)[number];
