import { computed, onScopeDispose, toValue, watch, type MaybeRefOrGetter, ref } from 'vue';
import type { WhatsAppAccountStatus } from '@n8n/api-types';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { TIME } from '@/app/constants';

import { getWhatsAppAccountStatus } from './api';

/** Meta's reviews take minutes to days, so a slow poll is enough. */
export const ACCOUNT_STATUS_POLL_MS = 30 * TIME.SECOND;

/**
 * Shared by credential, so the channel modal's poll also updates the chip and
 * the Publish button.
 */
const statuses = ref<Record<string, WhatsAppAccountStatus>>({});

// The chip and the Publish button both read the status on load, so they share one request.
const inFlight = new Map<string, Promise<WhatsAppAccountStatus>>();

const cacheKey = (projectId: string, agentId: string, credentialId: string) =>
	`${projectId}:${agentId}:${credentialId}`;

/** Nothing left to wait for: the number can send and no review is pending. */
export function isAccountStatusSettled(status: WhatsAppAccountStatus): boolean {
	return (
		status.sending === 'available' &&
		status.displayName !== 'pending' &&
		status.businessVerification !== 'pending' &&
		status.accountReview !== 'pending'
	);
}

/**
 * Reads the account status for one credential. With `poll`, it asks again
 * until nothing is left to wait for, and stops when the caller unmounts.
 */
export function useWhatsAppAccountStatus(options: {
	projectId: MaybeRefOrGetter<string>;
	agentId: MaybeRefOrGetter<string>;
	credentialId: MaybeRefOrGetter<string>;
	enabled: MaybeRefOrGetter<boolean>;
	poll?: boolean;
}) {
	const rootStore = useRootStore();
	let timer: ReturnType<typeof setTimeout> | undefined;
	// A new credential bumps this, so an answer for the previous one is dropped.
	let run = 0;
	let disposed = false;

	const key = computed(() =>
		cacheKey(toValue(options.projectId), toValue(options.agentId), toValue(options.credentialId)),
	);
	const status = computed(() =>
		toValue(options.enabled) && toValue(options.credentialId)
			? (statuses.value[key.value] ?? null)
			: null,
	);

	async function load(currentRun: number) {
		const credentialId = toValue(options.credentialId);
		const requestKey = key.value;
		try {
			let request = inFlight.get(requestKey);
			if (!request) {
				request = getWhatsAppAccountStatus(
					rootStore.restApiContext,
					toValue(options.projectId),
					toValue(options.agentId),
					credentialId,
				).finally(() => inFlight.delete(requestKey));
				inFlight.set(requestKey, request);
			}
			const result = await request;
			if (disposed || currentRun !== run) return;
			statuses.value = { ...statuses.value, [requestKey]: result };
		} catch (error) {
			if (disposed || currentRun !== run) return;
			// The credential is gone or not usable, so asking again gives the same answer.
			if (error instanceof ResponseError && error.httpStatusCode === 404) return;
		}
		const latest = statuses.value[requestKey];
		if (options.poll && !(latest && isAccountStatusSettled(latest))) {
			timer = setTimeout(() => {
				void load(currentRun);
			}, ACCOUNT_STATUS_POLL_MS);
		}
	}

	function restart() {
		clearTimeout(timer);
		const currentRun = ++run;
		if (disposed || !toValue(options.enabled) || !toValue(options.credentialId)) return;
		void load(currentRun);
	}

	watch([key, () => toValue(options.enabled)], restart, { immediate: true });

	onScopeDispose(() => {
		disposed = true;
		clearTimeout(timer);
	});

	return { status, refresh: restart };
}

const REVIEW_WARNING_KEYS = {
	displayName: {
		pending: 'agents.channels.whatsapp.status.warning.displayName.pending',
		rejected: 'agents.channels.whatsapp.status.warning.displayName.rejected',
	},
	businessVerification: {
		pending: 'agents.channels.whatsapp.status.warning.businessVerification.pending',
		rejected: 'agents.channels.whatsapp.status.warning.businessVerification.rejected',
	},
	accountReview: {
		pending: 'agents.channels.whatsapp.status.warning.accountReview.pending',
		rejected: 'agents.channels.whatsapp.status.warning.accountReview.rejected',
	},
} as const satisfies Record<string, Record<'pending' | 'rejected', BaseTextKey>>;

/**
 * What still needs Meta, in short sentences for a tooltip. A test number is
 * normal while building, so it is not a warning.
 */
export function useWhatsAppAccountWarnings(status: MaybeRefOrGetter<WhatsAppAccountStatus | null>) {
	const i18n = useI18n();
	return computed(() => {
		const current = toValue(status);
		if (!current) return [];
		const warnings: string[] = [];
		if (current.sending === 'blocked') {
			warnings.push(i18n.baseText('agents.channels.whatsapp.status.warning.blocked'));
		}
		const reviews = [
			[current.displayName, REVIEW_WARNING_KEYS.displayName],
			[current.businessVerification, REVIEW_WARNING_KEYS.businessVerification],
			[current.accountReview, REVIEW_WARNING_KEYS.accountReview],
		] as const;
		for (const [state, keys] of reviews) {
			if (state === 'pending' || state === 'rejected') warnings.push(i18n.baseText(keys[state]));
		}
		return warnings;
	});
}
