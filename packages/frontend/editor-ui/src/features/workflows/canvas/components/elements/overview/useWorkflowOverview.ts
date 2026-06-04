// PROTOTYPE: state for the on-canvas workflow Overview panel. Content lives in
// localStorage keyed by workflow id (seeded from the real workflow.description),
// so the real workflow is never mutated. "Generate" drops in mock curated
// content after a short fake delay. Module-level singletons so the panel and the
// three-dots menu toggle share one reactive source.
import { computed, ref } from 'vue';
import { useLocalStorage } from '@vueuse/core';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import {
	WORKFLOW_OVERVIEW_CONTENT,
	buildFallbackOverview,
	type OverviewAudience,
} from './workflowOverviewContent';

const STORAGE_KEY = 'n8n.prototype.workflowOverview';
const GENERATE_DELAY_MS = 900;

interface OverviewState {
	content: string;
	audience: OverviewAudience;
}

const overrides = useLocalStorage<Record<string, OverviewState>>(STORAGE_KEY, {});
const isVisible = ref(true);
const isCollapsed = ref(false);
const isGenerating = ref(false);

export function useWorkflowOverview() {
	const workflowDocumentStore = injectWorkflowDocumentStore();

	const workflowId = computed(() => workflowDocumentStore.value.workflowId);
	const override = computed(() => overrides.value[workflowId.value]);

	// Override (localStorage) wins; otherwise seed from the real description.
	const content = computed(
		() => override.value?.content ?? workflowDocumentStore.value.description ?? '',
	);
	const hasContent = computed(() => content.value.trim().length > 0);
	const audience = computed<OverviewAudience>(() => override.value?.audience ?? 'non-technical');

	function persist(state: OverviewState) {
		overrides.value = { ...overrides.value, [workflowId.value]: state };
	}

	function setContent(markdown: string) {
		persist({ content: markdown, audience: audience.value });
	}

	function generate(forAudience: OverviewAudience) {
		isGenerating.value = true;
		window.setTimeout(() => {
			const curated = WORKFLOW_OVERVIEW_CONTENT[workflowId.value]?.[forAudience];
			const markdown = curated ?? buildFallbackOverview(workflowDocumentStore.value.serialize());
			persist({ content: markdown, audience: forAudience });
			isGenerating.value = false;
		}, GENERATE_DELAY_MS);
	}

	function toggleVisible() {
		isVisible.value = !isVisible.value;
	}

	function toggleCollapsed() {
		isCollapsed.value = !isCollapsed.value;
	}

	return {
		isVisible,
		isCollapsed,
		isGenerating,
		content,
		hasContent,
		audience,
		setContent,
		generate,
		toggleVisible,
		toggleCollapsed,
	};
}
