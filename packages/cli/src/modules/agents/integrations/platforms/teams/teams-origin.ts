import { text, type DecodedThread, type OriginDraft } from '../../integration-origin-support';

export function buildTeamsOriginDraft(decoded: DecodedThread): OriginDraft {
	return {
		type: 'teams',
		conversationId: text(decoded.conversationId),
		conversationType: text(decoded.conversationType),
	};
}
