import { isRecord } from '@n8n/utils/is-record';

import {
	text,
	type DecodedThread,
	type OriginDraft,
	type OriginInput,
} from '../../integration-origin-support';

/**
 * The adapter leaves the conversation type out of the thread ID for an ordinary
 * channel or group chat, so the incoming activity is read first.
 */
export function buildTeamsOriginDraft(
	{ message }: OriginInput,
	decoded: DecodedThread,
): OriginDraft {
	return {
		type: 'teams',
		conversationId: text(decoded.conversationId),
		conversationType: conversationTypeOf(message.raw) ?? text(decoded.conversationType),
	};
}

function conversationTypeOf(activity: unknown): string | undefined {
	if (!isRecord(activity) || !isRecord(activity.conversation)) return undefined;
	return text(activity.conversation.conversationType);
}
