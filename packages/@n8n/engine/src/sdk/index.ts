export * from './types';
export * from './errors';
import type {
	TriggerConfig,
	WebhookTriggerConfig,
	WebhookResponseMode,
	WebhookSchemaConfig,
	WorkflowDefinition,
} from './types';

export function defineWorkflow<const T extends readonly TriggerConfig[]>(
	def: WorkflowDefinition<T>,
): WorkflowDefinition<T> {
	return def;
}

export function webhook<S extends WebhookSchemaConfig>(
	path: string,
	config: {
		method?: string;
		responseMode?: WebhookResponseMode;
		schema?: S;
	} = {} as { method?: string; responseMode?: WebhookResponseMode; schema?: S },
): WebhookTriggerConfig<S> {
	return {
		type: 'webhook',
		config: {
			path,
			method: config.method ?? 'POST',
			responseMode: config.responseMode ?? 'lastNode',
		},
	};
}
