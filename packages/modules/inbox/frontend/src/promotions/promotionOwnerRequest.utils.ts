import type { InboxPromotionOwnerRequestItem } from '@n8n/api-types';
import type { IconName } from '@n8n/design-system';

export const ownerRequestIcon = {
	credential: 'key-round',
	workflow: 'workflow',
} satisfies Record<InboxPromotionOwnerRequestItem['resource']['kind'], IconName>;

/** How a request stands. A request that closed by itself says which operation closed it. */
export type OwnerRequestOutcome = 'open' | 'promoted' | 'applied' | 'dismissed' | 'closed';

export function ownerRequestOutcome({
	state,
	closeReason,
	operation,
}: Pick<
	InboxPromotionOwnerRequestItem,
	'state' | 'closeReason' | 'operation'
>): OwnerRequestOutcome {
	if (state === 'open') return 'open';
	if (closeReason === 'satisfied') return operation === 'promote' ? 'promoted' : 'applied';
	return closeReason === 'dismissed' ? 'dismissed' : 'closed';
}
