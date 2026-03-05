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
