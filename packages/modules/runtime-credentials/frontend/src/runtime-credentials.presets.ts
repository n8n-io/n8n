import type { BaseTextKey } from '@n8n/i18n';

import type { RuntimeCredentialTransform } from './runtime-credentials.api';

/** `*` matches every trigger. The backend uses the same value. */
export const ANY_TRIGGER = '*';

export type TriggerOption = {
	id: 'webhook' | 'form' | 'chat' | 'any';
	/** The node type id that the backend matches. */
	nodeType: string;
	labelKey: BaseTextKey;
	/** Used until the node type file loads, and when it has no entry for the node. */
	fallbackIcon: 'webhook' | 'file-input' | 'message-circle' | 'zap';
};

export const TRIGGER_OPTIONS: readonly TriggerOption[] = [
	{
		id: 'webhook',
		nodeType: 'n8n-nodes-base.webhook',
		labelKey: 'runtimeCredentials.wizard.trigger.webhook',
		fallbackIcon: 'webhook',
	},
	{
		id: 'form',
		nodeType: 'n8n-nodes-base.formTrigger',
		labelKey: 'runtimeCredentials.wizard.trigger.form',
		fallbackIcon: 'file-input',
	},
	{
		id: 'chat',
		nodeType: '@n8n/n8n-nodes-langchain.chatTrigger',
		labelKey: 'runtimeCredentials.wizard.trigger.chat',
		fallbackIcon: 'message-circle',
	},
	{
		id: 'any',
		nodeType: ANY_TRIGGER,
		labelKey: 'runtimeCredentials.wizard.trigger.any',
		fallbackIcon: 'zap',
	},
];

export type PathPresetId = 'authorization' | 'header' | 'body' | 'query' | 'custom';

export type PathPreset = {
	id: PathPresetId;
	labelKey: BaseTextKey;
	/** The dotted path prefix. `authorization` has a fixed path, and `custom` has no prefix. */
	prefix: string;
};

export const PATH_PRESETS: readonly PathPreset[] = [
	{
		id: 'authorization',
		labelKey: 'runtimeCredentials.wizard.path.preset.authorization',
		prefix: 'headers.authorization',
	},
	{
		id: 'header',
		labelKey: 'runtimeCredentials.wizard.path.preset.header',
		prefix: 'headers.',
	},
	{ id: 'body', labelKey: 'runtimeCredentials.wizard.path.preset.body', prefix: 'body.' },
	{ id: 'query', labelKey: 'runtimeCredentials.wizard.path.preset.query', prefix: 'query.' },
	{ id: 'custom', labelKey: 'runtimeCredentials.wizard.path.preset.custom', prefix: '' },
];

export type RuleTemplateId = 'gmail' | 'bearer' | 'anthropic';

export type RuleTemplate = {
	id: RuleTemplateId;
	titleKey: BaseTextKey;
	hintKey: BaseTextKey;
	/** Suggested alias. */
	alias: string;
	nodeType: string;
	path: string;
	credentialType: string;
	transform: RuntimeCredentialTransform;
};

/**
 * Presets for the most common cases. `gmailOAuth2` is the credential type id that n8n registers
 * for the Gmail OAuth2 credential. The backend rejects a type id that it does not know.
 */
export const RULE_TEMPLATES: readonly RuleTemplate[] = [
	{
		id: 'gmail',
		titleKey: 'runtimeCredentials.templates.gmail.title',
		hintKey: 'runtimeCredentials.templates.gmail.hint',
		alias: 'google-token',
		nodeType: 'n8n-nodes-base.webhook',
		path: 'headers.gmail-authorization',
		credentialType: 'gmailOAuth2',
		transform: 'bearer',
	},
	{
		id: 'bearer',
		titleKey: 'runtimeCredentials.templates.bearer.title',
		hintKey: 'runtimeCredentials.templates.bearer.hint',
		alias: 'bearer-token',
		nodeType: 'n8n-nodes-base.webhook',
		path: 'headers.x-api-token',
		credentialType: 'httpBearerAuth',
		transform: 'field:token',
	},
	{
		id: 'anthropic',
		titleKey: 'runtimeCredentials.templates.anthropic.title',
		hintKey: 'runtimeCredentials.templates.anthropic.hint',
		alias: 'anthropic-key',
		nodeType: 'n8n-nodes-base.webhook',
		path: 'headers.x-anthropic-key',
		credentialType: 'anthropicApi',
		transform: 'field:apiKey',
	},
];

export function findTemplate(id: string | undefined): RuleTemplate | undefined {
	return RULE_TEMPLATES.find((template) => template.id === id);
}

/** Credential fields that the backend never fills from a request, whatever the type declares. */
export const PROTECTED_FIELD_NAMES: ReadonlySet<string> = new Set([
	'authUrl',
	'accessTokenUrl',
	'grantType',
	'authentication',
	'usePkce',
	'clientId',
	'clientSecret',
	'requestTokenUrl',
	'signatureMethod',
	'useDynamicClientRegistration',
	'allowedHttpRequestDomains',
	'allowedDomains',
]);

/** Field types that can hold a text value from a request. */
export const FILLABLE_FIELD_TYPES: ReadonlySet<string> = new Set(['string', 'number']);

/** Offered when the credential type list does not load. */
export const COMMON_CREDENTIAL_TYPES: readonly string[] = [
	'gmailOAuth2',
	'httpBearerAuth',
	'anthropicApi',
	'openAiApi',
	'slackApi',
	'githubApi',
];
