export const SHARED_CREDENTIAL_TYPES = [
	'openAiApi',
	'deepSeekApi',
	'anthropicApi',
	'azureOpenAiApi',
	'googlePalmApi',
	'postgres',
	'mongoDb',
	'replicateApi',
	'mcpClientApi',
	'mcpClientSseApi',
	'mcpClientHttpApi',
	'serpApi',
] as const;

export type CredentialType = (typeof SHARED_CREDENTIAL_TYPES)[number];
