import {
	text,
	type DecodedThread,
	type OriginDraft,
	type OriginInput,
} from '../../integration-origin-support';
import { conversationTypeOf } from './teams-activity';

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
		conversationType: text(conversationTypeOf(message.raw)) ?? text(decoded.conversationType),
	};
}
