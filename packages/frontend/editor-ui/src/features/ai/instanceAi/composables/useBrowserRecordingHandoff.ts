import { browserRecordingSchema } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useRoute, useRouter } from 'vue-router';

import { BROWSER_USE_EXTENSION_ID, INSTANCE_AI_THREAD_VIEW } from '../constants';
import { createThreadFromBrowserRecording } from '../instanceAi.api';

const HANDOFF_QUERY = 'browserRecordingHandoff';

interface ExtensionRuntime {
	sendMessage: (
		extensionId: string,
		message: unknown,
		callback: (response: unknown) => void,
	) => void;
	lastError?: { message?: string };
}

function getExtensionRuntime(): ExtensionRuntime | null {
	const runtime = (globalThis as { chrome?: { runtime?: ExtensionRuntime } }).chrome?.runtime;
	return typeof runtime?.sendMessage === 'function' ? runtime : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object';
}

async function sendToExtension(runtime: ExtensionRuntime, message: unknown): Promise<unknown> {
	return await new Promise((resolve, reject) => {
		runtime.sendMessage(BROWSER_USE_EXTENSION_ID, message, (response) => {
			const error = runtime.lastError;
			if (error) reject(new Error(error.message ?? 'Extension messaging failed'));
			else resolve(response);
		});
	});
}

export function useBrowserRecordingHandoff() {
	const route = useRoute();
	const router = useRouter();
	const rootStore = useRootStore();
	const toast = useToast();
	const i18n = useI18n();

	async function importRecording(): Promise<void> {
		const handoffId = route.query[HANDOFF_QUERY];
		if (typeof handoffId !== 'string') return;

		const query = { ...route.query };
		delete query[HANDOFF_QUERY];
		await router.replace({ query });

		const runtime = getExtensionRuntime();
		try {
			if (!runtime) throw new Error('The Browser Use extension is not available');
			const response = await sendToExtension(runtime, { type: 'getRecording', handoffId });
			if (!isRecord(response) || response.success !== true)
				throw new Error('Recording unavailable');
			const parsed = browserRecordingSchema.safeParse(response.recording);
			if (!parsed.success) throw new Error('Recording is invalid');

			const result = await createThreadFromBrowserRecording(rootStore.restApiContext, parsed.data);
			await sendToExtension(runtime, {
				type: 'acknowledgeRecording',
				handoffId,
				accepted: true,
			}).catch(() => {});
			await router.replace({
				name: INSTANCE_AI_THREAD_VIEW,
				params: { threadId: result.threadId },
			});
		} catch (error) {
			if (runtime) {
				await sendToExtension(runtime, {
					type: 'acknowledgeRecording',
					handoffId,
					accepted: false,
				}).catch(() => {});
			}
			toast.showError(error, i18n.baseText('instanceAi.browserRecordingImport.error.title'), {
				message: i18n.baseText('instanceAi.browserRecordingImport.error.message'),
			});
		}
	}

	return { importRecording };
}
