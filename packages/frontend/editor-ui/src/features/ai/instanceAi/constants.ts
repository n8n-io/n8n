export const INSTANCE_AI_VIEW = 'InstanceAi';
export const INSTANCE_AI_THREAD_VIEW = 'InstanceAiThread';
export const INSTANCE_AI_SETTINGS_VIEW = 'InstanceAiSettings';
export const NEW_CONVERSATION_TITLE = 'New conversation';

/** Sentinel passed through the wizard state for n8n Connect credentials.
 *  Never persisted — converted to { id: null, __aiGatewayManaged: true } at the apply boundary. */
export const AI_GATEWAY_SENTINEL = '__AI_GATEWAY_MANAGED__';
