import type { AgentCodingPreview, AgentCodingStatus } from '@n8n/api-types';
import { computed, onScopeDispose, ref } from 'vue';

import { codingPreviewState, type CodingPreviewRequest } from '../utils/coding-preview-state';

export interface CodingPreviewOptions {
	fetchPreview: () => Promise<AgentCodingPreview>;
	/** True when the preview panel is open. A closed panel does not ask for a URL. */
	isOpen: () => boolean;
	/** True when the user can run the agent. Only such a user can ask for a URL. */
	canExecute: () => boolean;
	app: () => AgentCodingStatus['app'] | undefined;
	onError: (cause: unknown) => void;
}

/**
 * Loads the preview URL of a coding session and gives the one preview state
 * that the panel shows. A sandbox that cannot show previews is a state, not
 * an error, so it does not call `onError`.
 */
export function useCodingPreview(options: CodingPreviewOptions) {
	const url = ref('');
	const request = ref<CodingPreviewRequest>('idle');
	// Each load or clear starts a new generation, so a late answer cannot replace newer state.
	let generation = 0;
	let disposed = false;
	onScopeDispose(() => {
		disposed = true;
	});

	const state = computed(() =>
		codingPreviewState({
			app: options.app(),
			url: url.value,
			request: request.value,
			canExecute: options.canExecute(),
		}),
	);

	function canLoad() {
		const app = options.app();
		const appActive = app === 'starting' || app === 'running';
		return appActive && options.isOpen() && options.canExecute();
	}

	function clear() {
		generation++;
		request.value = 'idle';
		url.value = '';
	}

	function isCurrent(id: number) {
		return !disposed && id === generation;
	}

	function settle(preview: AgentCodingPreview) {
		url.value = preview.available ? preview.url : '';
		request.value = preview.available ? 'idle' : 'unavailable';
	}

	async function load() {
		// An unavailable preview stays so until `clear`, for example when the app stops.
		const settled = request.value === 'loading' || request.value === 'unavailable';
		if (settled || url.value || !canLoad()) return;
		const id = ++generation;
		request.value = 'loading';
		try {
			const preview = await options.fetchPreview();
			if (isCurrent(id)) settle(preview);
		} catch (cause) {
			if (!isCurrent(id)) return;
			request.value = 'failed';
			options.onError(cause);
		}
	}

	function markUnavailable() {
		generation++;
		request.value = 'unavailable';
	}

	return { url, state, load, clear, markUnavailable };
}
