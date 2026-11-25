import { text, type DecodedThread, type OriginDraft } from '../../integration-origin-support';

export function buildTelegramOriginDraft(decoded: DecodedThread): OriginDraft {
	return {
		type: 'telegram',
		chatId: text(decoded.chatId),
		messageThreadId: text(decoded.messageThreadId),
	};
}
