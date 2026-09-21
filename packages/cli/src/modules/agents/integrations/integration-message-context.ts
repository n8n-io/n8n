import type { JSONObject, ToolContext } from '@n8n/agents';
import { isRecord } from '@n8n/utils/is-record';
import { jsonParse } from 'n8n-workflow';

import type {
	IntegrationMessageContext,
	IntegrationPlatformMessageContext,
	IntegrationMessageSubject,
	IntegrationSubjectPerson,
	IntegrationMessageTarget,
} from './integration-tool-types';

const TURN_CONTEXT_KEY = 'n8nIntegrationMessageContext';

export function encodeIntegrationMessageContext(
	context: IntegrationMessageContext | null,
): JSONObject {
	return { [TURN_CONTEXT_KEY]: context ? jsonParse<JSONObject>(JSON.stringify(context)) : null };
}

/** Undefined identifies an older checkpoint. Null must not use newer thread context. */
export function readIntegrationMessageContext(
	persistence: ToolContext['persistence'],
): IntegrationMessageContext | null | undefined {
	const metadata = persistence?.hostMetadata;
	if (!metadata || !Object.hasOwn(metadata, TURN_CONTEXT_KEY)) return undefined;
	const value = metadata[TURN_CONTEXT_KEY];
	return isIntegrationMessageContext(value) ? value : null;
}

export function replaceIntegrationMessageContext(
	persistence: NonNullable<ToolContext['persistence']>,
	context: IntegrationMessageContext,
): void {
	persistence.hostMetadata = {
		...persistence.hostMetadata,
		...encodeIntegrationMessageContext(context),
	};
}

export function inheritIntegrationMessageContext(
	context: IntegrationMessageContext,
	previous: IntegrationMessageContext | null,
): IntegrationMessageContext {
	if (previous?.integrationConnectionId !== context.integrationConnectionId) return context;
	return {
		...context,
		...(previous.subject && !context.subject ? { subject: previous.subject } : {}),
		...(previous.agentUserId && !context.agentUserId ? { agentUserId: previous.agentUserId } : {}),
	};
}

export function isIntegrationMessageContext(value: unknown): value is IntegrationMessageContext {
	if (!isRecord(value)) return false;
	const context = value;
	return (
		typeof context.integrationConnectionId === 'string' &&
		typeof context.platform === 'string' &&
		isIntegrationMessageTarget(context.target) &&
		(context.messageId === undefined || typeof context.messageId === 'string') &&
		(context.interactingUserId === undefined || typeof context.interactingUserId === 'string') &&
		(context.agentUserId === undefined || typeof context.agentUserId === 'string') &&
		(context.platformMessage === undefined ||
			isIntegrationPlatformMessageContext(context.platformMessage)) &&
		(context.subject === undefined || isIntegrationMessageSubject(context.subject)) &&
		(context.replyExpectation === undefined ||
			context.replyExpectation === 'required' ||
			context.replyExpectation === 'optional') &&
		(context.replyTarget === undefined || isIntegrationMessageTarget(context.replyTarget)) &&
		(context.replyMessageId === undefined || typeof context.replyMessageId === 'string') &&
		typeof context.updatedAt === 'string'
	);
}

function isIntegrationPlatformMessageContext(
	value: unknown,
): value is IntegrationPlatformMessageContext {
	if (!isRecord(value) || value.type !== 'telegram') return false;
	return (
		typeof value.chat_id === 'string' &&
		typeof value.message_id === 'string' &&
		(value.message_thread_id === undefined || typeof value.message_thread_id === 'string') &&
		Array.isArray(value.attachments) &&
		value.attachments.every(isTelegramMessageAttachmentContext)
	);
}

function isTelegramMessageAttachmentContext(value: unknown): boolean {
	return (
		isRecord(value) &&
		(value.type === 'image' ||
			value.type === 'file' ||
			value.type === 'video' ||
			value.type === 'audio') &&
		typeof value.file_id === 'string' &&
		(value.file_unique_id === undefined || typeof value.file_unique_id === 'string')
	);
}

function isIntegrationMessageSubject(value: unknown): value is IntegrationMessageSubject {
	if (!isRecord(value)) return false;
	const subject = value;
	return (
		typeof subject.type === 'string' &&
		typeof subject.id === 'string' &&
		(subject.title === undefined || typeof subject.title === 'string') &&
		(subject.description === undefined || typeof subject.description === 'string') &&
		(subject.url === undefined || typeof subject.url === 'string') &&
		(subject.status === undefined || typeof subject.status === 'string') &&
		(subject.labels === undefined ||
			(Array.isArray(subject.labels) &&
				subject.labels.every((label) => typeof label === 'string'))) &&
		(subject.assignee === undefined || isIntegrationSubjectPerson(subject.assignee)) &&
		(subject.author === undefined || isIntegrationSubjectPerson(subject.author))
	);
}

function isIntegrationSubjectPerson(value: unknown): value is IntegrationSubjectPerson {
	if (!isRecord(value)) return false;
	const person = value;
	return typeof person.id === 'string' && typeof person.name === 'string';
}

function isIntegrationMessageTarget(value: unknown): value is IntegrationMessageTarget {
	if (!isRecord(value)) return false;
	const target = value;
	if (target.type === 'thread') {
		return (
			typeof target.threadId === 'string' &&
			(target.channelId === undefined || typeof target.channelId === 'string') &&
			(target.userId === undefined || typeof target.userId === 'string')
		);
	}
	if (target.type === 'channel') {
		return (
			typeof target.channelId === 'string' &&
			(target.threadId === undefined || typeof target.threadId === 'string')
		);
	}
	if (target.type === 'dm') {
		return (
			typeof target.userId === 'string' &&
			(target.threadId === undefined || typeof target.threadId === 'string')
		);
	}
	return false;
}
