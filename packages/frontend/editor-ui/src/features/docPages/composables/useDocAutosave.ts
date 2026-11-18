import { ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';

import { DOC_AUTOSAVE_DEBOUNCE_MS } from '../constants';
import { useDocPagesStore } from '../docPages.store';

/** Keeps the latest editor content and saves it after a quiet period. */
export function useDocAutosave() {
	const i18n = useI18n();
	const toast = useToast();
	const docPagesStore = useDocPagesStore();

	const saveStatus = ref<'idle' | 'saving' | 'saved'>('idle');
	let pending: { id: string; content: Record<string, unknown> } | null = null;
	let timer: ReturnType<typeof setTimeout> | undefined;

	async function flush() {
		clearTimeout(timer);
		if (!pending) return;
		const { id, content } = pending;
		pending = null;
		saveStatus.value = 'saving';
		try {
			await docPagesStore.updatePage(id, { content });
			saveStatus.value = pending ? 'saving' : 'saved';
		} catch (error) {
			saveStatus.value = 'idle';
			toast.showError(error, i18n.baseText('docPages.save.error'));
		}
	}

	function queue(id: string, content: Record<string, unknown>) {
		pending = { id, content };
		clearTimeout(timer);
		timer = setTimeout(() => {
			void flush();
		}, DOC_AUTOSAVE_DEBOUNCE_MS);
	}

	/** Drops the unsaved content, so a late save cannot overwrite a new page. */
	function drop() {
		clearTimeout(timer);
		pending = null;
	}

	return { saveStatus, queue, flush, drop };
}
