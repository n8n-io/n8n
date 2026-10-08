import type { JSONObject, SerializableAgentState } from '@n8n/agents';
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
 * published agent. System runs a code-defined system agent.
 */
export interface QueuedUserChatMessage extends QueuedMessageInput {
	kind: 'preview' | 'n8n_chat' | 'system';
	userId: string;
	messageId?: string;
	/** Turn options for a system agent. The queue keeps them opaque; the provider defines their shape. */
	options?: Record<string, unknown>;
	/**
	 * A machine turn. The message is model input only: it is stored with
	 * `origin.hidden`, stays out of the transcript and the pending list.
	 */
	hidden?: boolean;
}

/** One rule for steering eligibility: the allow-list of kinds. Integrations never steer. */
export const acceptsSteering = (kind: AgentQueuedMessage['kind']): boolean =>
	kind === 'preview' || kind === 'n8n_chat' || kind === 'system';

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
	// `hidden` is stored on the message origin, not in the dispatch.
	| { kind: QueuedUserChatMessage['kind']; options?: Record<string, unknown> }
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

/** Execution id that a host stored in a persistence scope's metadata. */
export function hostMetadataExecutionId(metadata: JSONObject | undefined): string | undefined {
	const id = metadata?.[EXECUTION_METADATA_KEY];
	return typeof id === 'string' ? id : undefined;
}

export function checkpointExecutionId(state: SerializableAgentState): string | undefined {
	if (state.persistence?.delegated) return undefined;
	const id = state.persistence?.hostMetadata?.[EXECUTION_METADATA_KEY];
	return typeof id === 'string' ? id : undefined;
}

/** Chat kinds whose queued messages a user can steer and reorder. */
export type InteractiveChatKind = 'preview' | 'system';

export function isInteractiveChatKind(
	kind: AgentQueuedMessage['kind'],
): kind is InteractiveChatKind {
	return kind === 'preview' || kind === 'system';
}
