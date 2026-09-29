import { N8N_CHAT_INTEGRATION_TYPE, type ChatIntegrationDescriptor } from '@n8n/api-types';

/**
 * n8n Chat is an internal integration: the catalog endpoint never lists it, so
 * the channel list and the builder chip both build this descriptor locally
 * instead of reading it from the catalog.
 */
export function n8nChatChannelDescriptor(label: string): ChatIntegrationDescriptor {
	return {
		type: N8N_CHAT_INTEGRATION_TYPE,
		label,
		icon: 'message-square',
		credentialTypes: [],
	};
}
