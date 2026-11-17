import type { InboxPromotionOwnerRequestItem } from '@n8n/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

export async function dismissPromotionOwnerRequest(
	context: IRestApiContext,
	requestId: string,
): Promise<InboxPromotionOwnerRequestItem> {
	return await makeRestApiRequest<InboxPromotionOwnerRequestItem>(
		context,
		'POST',
		`/promotions/owner-requests/${encodeURIComponent(requestId)}/dismiss`,
	);
}
