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

/**
 * A message from an n8n user. Preview runs the draft agent. n8n Chat runs the
 * published agent. System runs a code-defined system agent (the n8n Assistant).
 */
export interface QueuedUserChatMessage extends QueuedMessageInput {
	kind: 'preview' | 'n8n_chat' | 'system';
	userId: string;
	messageId?: string;
	/** Turn options for a code-defined instance agent. The provider defines their shape. */
	options?: Record<string, unknown>;
	/** A machine turn: the message is model input only and stays out of the transcript. */
	hidden?: boolean;
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

export type AgentQueuedMessage = QueuedUserChatMessage | QueuedIntegrationMessage;

/** Queue storage keeps dispatch data. Conversation input belongs to the referenced message. */
export type AgentQueueDispatch =
	| { kind: QueuedUserChatMessage['kind']; options?: Record<string, unknown>; hidden?: boolean }
	| (Omit<
			QueuedIntegrationMessage,
			keyof QueuedMessageInput | 'modelMessage' | 'author' | 'platformThreadId' | 'messageContext'
	  > & {
			messageContext: Omit<
				IntegrationMessageContext,
				'platform' | 'integrationConnectionId' | 'messageId'
			>;
	  });

/** A committed execution reservation. Runtime preparation must reuse it. */
export interface AgentExecutionAdmission {
	executionId: string;
	startedAt: Date;
	inputMessageIds: string[];
}

export const EXECUTION_METADATA_KEY = 'n8nExecutionId';

export function checkpointExecutionId(state: SerializableAgentState): string | undefined {
	if (state.persistence?.delegated) return undefined;
	const id = state.persistence?.hostMetadata?.[EXECUTION_METADATA_KEY];
	return typeof id === 'string' ? id : undefined;
}

/** Chat kinds whose queued messages a user can steer, reorder, edit and remove. */
export function isInteractiveChatKind(
	kind: AgentQueuedMessage['kind'],
): kind is 'preview' | 'system' {
	return kind === 'preview' || kind === 'system';
}
