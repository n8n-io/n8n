/**
 * Bidirectional mapping between simplified trigger callbacks and n8n trigger node types.
 * Used by both the compiler (simplified → SDK) and the generator (SDK → simplified).
 */

export interface TriggerTypeInfo {
	nodeType: string;
	version: number;
	callbackName: string;
}

export const TRIGGER_TYPES: Record<string, TriggerTypeInfo> = {
	manual: {
		nodeType: 'n8n-nodes-base.manualTrigger',
		version: 1,
		callbackName: 'onManual',
	},
	webhook: {
		nodeType: 'n8n-nodes-base.webhook',
		version: 2,
		callbackName: 'onWebhook',
	},
	schedule: {
		nodeType: 'n8n-nodes-base.scheduleTrigger',
		version: 1.2,
		callbackName: 'onSchedule',
	},
	error: {
		nodeType: 'n8n-nodes-base.errorTrigger',
		version: 1,
		callbackName: 'onError',
	},
};

/** Map callback name (onManual) → trigger key (manual) */
export const CALLBACK_TO_TRIGGER: Record<string, string> = Object.fromEntries(
	Object.entries(TRIGGER_TYPES).map(([key, info]) => [info.callbackName, key]),
);

/** Map node type (n8n-nodes-base.manualTrigger) → trigger key (manual) */
export const NODE_TYPE_TO_TRIGGER: Record<string, string> = Object.fromEntries(
	Object.entries(TRIGGER_TYPES).map(([key, info]) => [info.nodeType, key]),
);

// ─── App Trigger Registry ───────────────────────────────────────────────────

export interface AppTriggerEntry {
	nodeType: string;
	version: number;
	/** All valid credential type keys for this node. First entry is the default. */
	credentialTypes: string[];
}

/**
 * Registry mapping service names to n8n trigger node types.
 * Used by `onTrigger('serviceName', options, callback)` in the DSL.
 * Parameters are passed through directly — no custom mapping per service.
 *
 * `credentialTypes` lists all valid credential keys (first = default).
 * User can specify `credentialType: 'specificType'` in options to pick a non-default.
 */
export const APP_TRIGGER_REGISTRY: Record<string, AppTriggerEntry> = {
	jira: {
		nodeType: 'n8n-nodes-base.jiraTrigger',
		version: 1,
		credentialTypes: ['jiraSoftwareCloudApi', 'jiraSoftwareServerApi', 'jiraSoftwareServerPatApi'],
	},
	github: {
		nodeType: 'n8n-nodes-base.githubTrigger',
		version: 1,
		credentialTypes: ['githubApi', 'githubOAuth2Api'],
	},
	gitlab: {
		nodeType: 'n8n-nodes-base.gitlabTrigger',
		version: 1,
		credentialTypes: ['gitlabApi', 'gitlabOAuth2Api'],
	},
	slack: {
		nodeType: 'n8n-nodes-base.slackTrigger',
		version: 2,
		credentialTypes: ['slackApi'],
	},
	telegram: {
		nodeType: 'n8n-nodes-base.telegramTrigger',
		version: 1.1,
		credentialTypes: ['telegramApi'],
	},
	stripe: {
		nodeType: 'n8n-nodes-base.stripeTrigger',
		version: 1,
		credentialTypes: ['stripeApi'],
	},
	typeform: {
		nodeType: 'n8n-nodes-base.typeformTrigger',
		version: 1,
		credentialTypes: ['typeformApi', 'typeformOAuth2Api'],
	},
	airtable: {
		nodeType: 'n8n-nodes-base.airtableTrigger',
		version: 1,
		credentialTypes: ['airtableTokenApi', 'airtableApi', 'airtableOAuth2Api'],
	},
	hubspot: {
		nodeType: 'n8n-nodes-base.hubspotTrigger',
		version: 1,
		credentialTypes: ['hubspotDeveloperApi'],
	},
	linear: {
		nodeType: 'n8n-nodes-base.linearTrigger',
		version: 1,
		credentialTypes: ['linearApi', 'linearOAuth2Api'],
	},
};

/** Map node type (n8n-nodes-base.jiraTrigger) → service name (jira) */
export const NODE_TYPE_TO_APP_TRIGGER: Record<string, string> = Object.fromEntries(
	Object.entries(APP_TRIGGER_REGISTRY).map(([key, entry]) => [entry.nodeType, key]),
);
