export * from './types';
export * from './errors';
import type { WorkflowDefinition, WebhookTriggerConfig, WebhookResponseMode } from './types';

export function defineWorkflow(def: WorkflowDefinition): WorkflowDefinition {
	return def;
}

export function webhook(
	path: string,
	config: {
		method?: string;
		responseMode?: WebhookResponseMode;
	} = {},
): WebhookTriggerConfig {
	return {
		type: 'webhook',
		config: {
			path,
			method: config.method ?? 'POST',
			responseMode: config.responseMode ?? 'lastNode',
		},
	};
}
