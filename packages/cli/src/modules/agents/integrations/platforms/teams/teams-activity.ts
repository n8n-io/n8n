import { isRecord } from '@n8n/utils/is-record';

/** The conversation type on an incoming Teams activity. Routing and message origins both read it here. */
export function conversationTypeOf(activity: unknown): unknown {
	return isRecord(activity) && isRecord(activity.conversation)
		? activity.conversation.conversationType
		: undefined;
}
