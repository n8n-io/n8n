import { text, type DecodedThread, type OriginDraft } from '../../integration-origin-support';

export function buildWhatsAppOriginDraft(decoded: DecodedThread): OriginDraft {
	return {
		type: 'whatsapp',
		phoneNumberId: text(decoded.phoneNumberId),
		userWaId: text(decoded.userWaId),
	};
}
