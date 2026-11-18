import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

type Draft = {
	/** The workflow JSON when editing started, to notice canvas changes made meanwhile */
	baseDoc: string;
	doc: string;
};

/** Keeps an edit draft while the sidebar switches tabs or closes, which unmounts the panel. */
export const useWorkflowJsonDraftStore = defineStore('workflowJsonDraft', () => {
	const drafts = ref<Record<string, Draft>>({});

	/** Leaving the page loses drafts, so the page-leave prompt asks first */
	const hasUnappliedEdits = computed(() =>
		Object.values(drafts.value).some((draft) => draft.doc !== draft.baseDoc),
	);

	function getDraft(workflowId: string): Draft | undefined {
		return drafts.value[workflowId];
	}

	function startDraft(workflowId: string, doc: string) {
		drafts.value[workflowId] = { baseDoc: doc, doc };
	}

	function updateDraft(workflowId: string, doc: string) {
		const draft = drafts.value[workflowId];
		if (draft) draft.doc = doc;
	}

	function clearDraft(workflowId: string) {
		delete drafts.value[workflowId];
	}

	return { hasUnappliedEdits, getDraft, startDraft, updateDraft, clearDraft };
});
