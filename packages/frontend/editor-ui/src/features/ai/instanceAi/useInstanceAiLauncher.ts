import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'vue-router';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { InstanceAiThreadOrigin, InstanceAiThreadSourcePersisted } from '@n8n/api-types';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useInstanceAiStore } from './instanceAi.store';
import { INSTANCE_AI_THREAD_VIEW } from './constants';

export interface InstanceAiLaunchOptions {
	message: string;
	source: InstanceAiThreadSourcePersisted;
	origin: InstanceAiThreadOrigin;
	sourceContext?: Record<string, unknown>;
	autoSend?: boolean;
}

export function useInstanceAiLauncher() {
	const store = useInstanceAiStore();
	const rootStore = useRootStore();
	const router = useRouter();
	const telemetry = useTelemetry();

	async function launch(options: InstanceAiLaunchOptions): Promise<string> {
		const threadId = uuidv4();
		// External input is untrusted — it can never auto-send. This is the chokepoint.
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

		if (autoSend) {
			const runtime = store.getOrCreateRuntime(threadId);
			void runtime.sendMessage(options.message, undefined, rootStore.pushRef);
		} else {
			store.setPendingPrefill(threadId, options.message);
		}

		await router.push({ name: INSTANCE_AI_THREAD_VIEW, params: { threadId } });
		return threadId;
	}

	return { launch };
}
