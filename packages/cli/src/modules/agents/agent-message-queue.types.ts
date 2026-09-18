import type { ActionEvent, SerializedMessage, SerializedThread } from 'chat';

import type { StoredAttachmentRef } from './agent-chat-attachment.service';

export interface QueueExecutionContext {
	abortSignal: AbortSignal;
	onExecutionStarted: (executionId: string) => Promise<void>;
}

interface QueuePayloadBase {
	projectId: string;
	resourceId: string;
}

interface PreviewQueueBase extends QueuePayloadBase {
	source: 'preview';
	userId: string;
}

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
