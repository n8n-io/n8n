import type { SerializableAgentState } from '@n8n/agents';
import type { AgentMessageAuthor } from '@n8n/api-types';
import type { Author } from 'chat';
import type { BridgeExecutionContext } from '../integrations/agent-chat-integration';

import type {
	IntegrationMessageContext,
	SessionBinding,
} from '../integrations/integration-tool-types';
import type { StoredAttachmentRef } from './agent-chat-attachment';

interface QueuedMessageInput {
	message: string;
	resourceId: string;
	attachments?: StoredAttachmentRef[];
}

export interface QueuedPreviewMessage extends QueuedMessageInput {
	kind: 'preview';
	userId: string;
}

export interface QueuedIntegrationMessage extends QueuedMessageInput {
	kind: 'integration';
	credentialId: string;
	platformThreadId: string;
	modelMessage: string;
	author: AgentMessageAuthor;
	sender: Author;
	messageContext: IntegrationMessageContext;
	contextConversation: SessionBinding;
	forceBuffered?: boolean;
	slackThreadContext?: BridgeExecutionContext['slackThreadContext'];
}

export type AgentQueuedMessage = QueuedPreviewMessage | QueuedIntegrationMessage;

/** A committed execution reservation. Runtime preparation must reuse it. */
export interface AgentExecutionAdmission {
	executionId: string;
	startedAt: Date;
}

export const EXECUTION_METADATA_KEY = 'n8nExecutionId';

export function checkpointExecutionId(state: SerializableAgentState): string | undefined {
	if (state.persistence?.delegated) return undefined;
	const id = state.persistence?.hostMetadata?.[EXECUTION_METADATA_KEY];
	return typeof id === 'string' ? id : undefined;
}
