import type { ActionEvent, SerializedMessage, SerializedThread } from 'chat';
import type { AgentInputBoundary } from '@n8n/agents';
import type { AgentSseEvent } from '@n8n/api-types';

import type { StoredAttachmentRef } from './agent-chat-attachment.service';

export const agentConversationLockKey = (threadId: string) => `agent-conversation:${threadId}`;

export interface QueueExecutionContext {
	abortSignal: AbortSignal;
	onExecutionStarted: (executionId: string, runId: string) => Promise<void>;
}

export interface PreviewQueueExecutionContext extends QueueExecutionContext {
	send: (event: AgentSseEvent) => void;
	onInputBoundary: (boundary: AgentInputBoundary) => Promise<boolean>;
}

export interface PreviewQueueScope {
	projectId: string;
	agentId: string;
	threadId: string;
	userId: string;
	resourceId: string;
}

interface QueuePayloadBase {
	projectId: string;
	resourceId: string;
}

interface PreviewQueueBase extends QueuePayloadBase {
	source: 'preview';
	userId: string;
	clientRequestId?: string;
}

export type PreviewSteeringMetadata = {
	mode: 'active' | 'new-parent-turn';
	targetExecutionId: string;
	failureReason?: string;
	requeuedAsId?: string;
};

interface IntegrationQueueBase extends QueuePayloadBase {
	source: 'integration';
	integrationType: string;
	credentialId: string;
	thread: SerializedThread;
}

interface QueuedResume {
	kind: 'hitl';
	runId: string;
	toolCallId: string;
	resumeData: unknown;
}

export interface PreviewMessageQueuePayload extends PreviewQueueBase {
	kind: 'message';
	message: string;
	attachments?: StoredAttachmentRef[];
	steering?: PreviewSteeringMetadata;
}

export type PreviewResumeQueuePayload = PreviewQueueBase & QueuedResume;

export interface IntegrationMessageQueuePayload extends IntegrationQueueBase {
	kind: 'message';
	message: SerializedMessage;
	contextThreadId: string;
	isNewMention: boolean;
}

export interface IntegrationResumeQueuePayload extends IntegrationQueueBase, QueuedResume {
	action: {
		messageId: string;
		user: ActionEvent['user'];
		raw: unknown;
		callbackData: { kind?: 'approval'; label?: string };
	};
}

export type IntegrationQueuePayload =
	| IntegrationMessageQueuePayload
	| IntegrationResumeQueuePayload;
export type PreviewQueuePayload = PreviewMessageQueuePayload | PreviewResumeQueuePayload;
export type AgentQueuePayload = PreviewQueuePayload | IntegrationQueuePayload;

export interface AgentQueueInput {
	agentId: string;
	threadId: string;
	payload: AgentQueuePayload;
}

export interface AgentPreviewQueueInput extends AgentQueueInput {
	payload: PreviewQueuePayload;
}
