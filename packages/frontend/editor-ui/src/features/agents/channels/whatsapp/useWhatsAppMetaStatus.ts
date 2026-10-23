import type { WhatsAppMetaStatus } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { onBeforeUnmount, ref, watch, type Ref } from 'vue';

import { TIME } from '@/app/constants';

import { getWhatsAppMetaStatus } from './api';

/** Meta reviews take days, so a slow poll keeps the status fresh without load. */
const META_STATUS_POLL_MS = TIME.MINUTE;

/**
 * Keeps Meta's review status for a connected WhatsApp channel current. Reads
 * only while `credentialId` is set. A failed read keeps the last answer,
 * because a Meta outage is not a change in the channel.
 *
 * By default it reads again every minute, and skips a read while the tab is
 * hidden. With `poll: false` it reads once for each credential, and again when
 * `refresh` is called. The channel chip uses that, so a page that sits open
 * does not keep asking.
 */
export function useWhatsAppMetaStatus(
	projectId: Ref<string>,
	agentId: Ref<string>,
	credentialId: Ref<string | undefined>,
	options: { poll?: boolean } = {},
) {
	const poll = options.poll ?? true;
	const rootStore = useRootStore();
	const status = ref<WhatsAppMetaStatus | null>(null);

	let timer: ReturnType<typeof setTimeout> | undefined;
	// A slow answer for an earlier credential must not replace a newer one.
	let run = 0;
	// Within a credential, only the newest read may set the status.
	let latestLoad = 0;

	function stop() {
		run++;
		clearTimeout(timer);
		timer = undefined;
	}

	async function load(current: number, credential: string) {
		const thisLoad = ++latestLoad;
		try {
			const result = await getWhatsAppMetaStatus(
				rootStore.restApiContext,
				projectId.value,
				agentId.value,
				credential,
			);
			if (current !== run || thisLoad !== latestLoad) return;
			status.value = result;
		} catch {
			// Keep the last answer.
		}
	}

	function scheduleNext(current: number, credential: string) {
		if (!poll || current !== run) return;
		timer = setTimeout(() => {
			void tick(current, credential);
		}, META_STATUS_POLL_MS);
	}

	async function tick(current: number, credential: string) {
		// Nobody sees the answer in a hidden tab. The first tick after it shows again reads.
		if (!document.hidden) await load(current, credential);
		scheduleNext(current, credential);
	}

	/** Reads now, outside the timer. */
	function refresh() {
		const credential = credentialId.value;
		if (credential) void load(run, credential);
	}

	watch(
		[projectId, agentId, credentialId],
		([, , credential]) => {
			stop();
			status.value = null;
			if (!credential) return;
			const current = run;
			void load(current, credential).then(() => scheduleNext(current, credential));
		},
		{ immediate: true },
	);

	onBeforeUnmount(stop);

	return { status, refresh };
}
