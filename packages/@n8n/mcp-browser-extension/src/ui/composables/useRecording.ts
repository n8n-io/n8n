import { onMounted, onUnmounted, ref } from 'vue';

import type { BackgroundPushMessage, BrowserRecording, RecordingDestination } from '../../types';

interface ActionResponse {
	success: boolean;
	error?: string;
}

function isActionResponse(value: unknown): value is ActionResponse {
	return (
		value !== null &&
		typeof value === 'object' &&
		typeof (value as { success?: unknown }).success === 'boolean'
	);
}

export function useRecording() {
	const recording = ref<BrowserRecording | null>(null);
	const destinations = ref<RecordingDestination[]>([]);
	const errorMessage = ref('');

	async function send(message: Record<string, unknown>): Promise<boolean> {
		errorMessage.value = '';
		try {
			const response: unknown = await chrome.runtime.sendMessage(message);
			if (isActionResponse(response) && response.success) return true;
			errorMessage.value = isActionResponse(response)
				? (response.error ?? 'The action could not be completed.')
				: 'The action could not be completed.';
			return false;
		} catch {
			errorMessage.value = 'The action could not be completed. Try again.';
			return false;
		}
	}

	async function start(): Promise<void> {
		await send({ type: 'startRecording' });
	}

	async function stop(): Promise<void> {
		await send({ type: 'stopRecording' });
	}

	async function loadDestinations(): Promise<void> {
		errorMessage.value = '';
		try {
			const response: unknown = await chrome.runtime.sendMessage({
				type: 'getRecordingDestinations',
			});
			destinations.value = Array.isArray(response) ? (response as RecordingDestination[]) : [];
		} catch {
			destinations.value = [];
			errorMessage.value = 'n8n instances could not be loaded. Try again.';
		}
	}

	async function submit(destinationOrigin?: string, destinationTabId?: number): Promise<void> {
		await send({ type: 'submitRecording', destinationOrigin, destinationTabId });
	}

	async function discard(): Promise<void> {
		await send({ type: 'discardRecording' });
	}

	async function recordAgain(): Promise<void> {
		if (await send({ type: 'discardRecording' })) await start();
	}

	async function removeAction(actionId: string): Promise<void> {
		await send({ type: 'removeRecordingAction', actionId });
	}

	async function maskAction(actionId: string): Promise<void> {
		await send({ type: 'maskRecordingAction', actionId });
	}

	async function removeScreenshot(screenshotId: string): Promise<void> {
		await send({ type: 'removeRecordingScreenshot', screenshotId });
	}

	async function removeNetworkRequest(requestId: string): Promise<void> {
		await send({ type: 'removeRecordingNetworkRequest', requestId });
	}

	function onMessage(message: BackgroundPushMessage): void {
		if (message.type !== 'recordingChanged') return;
		recording.value = message.recording;
		errorMessage.value = message.error ?? '';
	}

	chrome.runtime.onMessage.addListener(onMessage);

	onMounted(async () => {
		const current: unknown = await chrome.runtime.sendMessage({ type: 'getRecording' });
		recording.value = current && typeof current === 'object' ? (current as BrowserRecording) : null;
	});

	onUnmounted(() => chrome.runtime.onMessage.removeListener(onMessage));

	return {
		recording,
		destinations,
		errorMessage,
		start,
		stop,
		submit,
		loadDestinations,
		discard,
		recordAgain,
		removeAction,
		maskAction,
		removeScreenshot,
		removeNetworkRequest,
	};
}
