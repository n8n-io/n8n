export const RUNTIME_CREDENTIALS_MODULE_ID = 'runtime-credentials';

export const RUNTIME_CREDENTIALS_STORE = 'runtimeCredentials';

export const RUNTIME_CREDENTIALS_SETTINGS_VIEW = 'RuntimeCredentialsSettings';

/** The backend gates the rules endpoints on this scope. */
export const RUNTIME_CREDENTIALS_MANAGE_SCOPE = 'securitySettings:manage';

/** `*` matches every trigger. The select also accepts any other node type. */
export const ANY_TRIGGER = '*';

export const SUGGESTED_TRIGGER_TYPES = [
	ANY_TRIGGER,
	'n8n-nodes-base.webhook',
	'n8n-nodes-base.formTrigger',
	'@n8n/n8n-nodes-langchain.chatTrigger',
] as const;
