import type { PromotionGap } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { reactive, ref, toValue, type MaybeRefOrGetter } from 'vue';

import { createPromotionOwnerRequest } from '../promotions.api';

/** What `send` needs from a gap of the dependency report. */
export type OwnerRequestGap = Pick<PromotionGap, 'consumer' | 'target'>;

/** One key for each environment and target: a request covers every consumer of the target. */
const sentKey = (environmentId: string | undefined, { target }: OwnerRequestGap) =>
	`${environmentId ?? ''}:${target.kind}:${target.id}`;

// Shared by every caller for the session, so a refreshed report still shows "Request sent".
const sent = reactive(new Set<string>());

/**
 * "Ask the owner" for a gap in a project that the user cannot promote or apply. The server
 * also reports a sent request as `ownerRequestSent` on the gap; `isSent` covers both.
 *
 * `environmentId` is the environment of the preview. It gives the operation: Promote or Apply.
 */
export function usePromotionOwnerRequest(environmentId: MaybeRefOrGetter<string | undefined>) {
	const rootStore = useRootStore();
	const toast = useToast();
	const i18n = useI18n();
	/** The keys of the requests on their way, so a row can show its own spinner. */
	const sending = ref(new Set<string>());

	function isSent(gap: OwnerRequestGap & { ownerRequestSent?: boolean }) {
		return gap.ownerRequestSent === true || sent.has(sentKey(toValue(environmentId), gap));
	}

	function isSending(gap: OwnerRequestGap) {
		return sending.value.has(sentKey(toValue(environmentId), gap));
	}

	/** Sends the request for the gap. Returns whether the server took it. */
	async function send(gap: OwnerRequestGap): Promise<boolean> {
		const id = toValue(environmentId);
		if (!id) return false;
		const key = sentKey(id, gap);
		if (sent.has(key)) return true;
		if (sending.value.has(key)) return false;
		sending.value = new Set(sending.value).add(key);
		try {
			await createPromotionOwnerRequest(rootStore.publicApiContext, id, {
				target: { kind: gap.target.kind, id: gap.target.id },
				consumerWorkflowId: gap.consumer.id,
			});
			sent.add(key);
			// The message names only what the workflow of the user already shows.
			toast.showMessage({
				type: 'success',
				title: i18n.baseText('promotions.ownerRequest.sent.title'),
				message: i18n.baseText('promotions.ownerRequest.sent.message', {
					interpolate: { name: gap.target.name ?? gap.target.id },
				}),
			});
			return true;
		} catch (error: unknown) {
			toast.showError(error, i18n.baseText('promotions.ownerRequest.error.title'));
			return false;
		} finally {
			const next = new Set(sending.value);
			next.delete(key);
			sending.value = next;
		}
	}

	return { send, isSent, isSending };
}
