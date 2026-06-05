import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'vue-router';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { InstanceAiThreadOrigin, InstanceAiThreadSource } from '@n8n/api-types';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useInstanceAiStore } from './instanceAi.store';
import { INSTANCE_AI_THREAD_VIEW } from './constants';

export interface InstanceAiLaunchOptions {
	message: string;
	source: InstanceAiThreadSource;
	origin: InstanceAiThreadOrigin;
	sourceContext?: Record<string, unknown>;
	autoSend?: boolean;
}

/**
 * Single chokepoint that provisions a new Instance AI thread: persists it with
 * its launch metadata, records telemetry, and queues the first message for the
 * thread view to act on once it mounts. Does NOT navigate — callers do, which
 * lets both the launcher composable (router.push) and the external route guard
 * (redirect return) share this logic. Untrusted/external launches can never
 * auto-send; that rule lives here so it can't be bypassed.
 *
 * Safe to call outside component setup (e.g. a router guard): it only relies on
 * Pinia (active during navigation) and the telemetry singleton.
 */
export async function prepareInstanceAiLaunch(options: InstanceAiLaunchOptions): Promise<string> {
	const store = useInstanceAiStore();
	const rootStore = useRootStore();
	const telemetry = useTelemetry();

	const threadId = uuidv4();
	const autoSend = options.origin === 'external' ? false : (options.autoSend ?? false);

	await store.syncThread(threadId, {
		source: options.source,
		origin: options.origin,
		sourceContext: options.sourceContext,
	});

	telemetry.track('User launched Instance AI thread', {
		thread_id: threadId,
		instance_id: rootStore.instanceId,
		source: options.source,
		origin: options.origin,
		auto_send: autoSend,
	});

	store.setPendingLaunch(threadId, options.message, autoSend);

	return threadId;
}

export function useInstanceAiLauncher() {
	const router = useRouter();

	async function launch(options: InstanceAiLaunchOptions): Promise<string> {
		const threadId = await prepareInstanceAiLaunch(options);
		await router.push({ name: INSTANCE_AI_THREAD_VIEW, params: { threadId } });
		return threadId;
	}

	return { launch };
}
