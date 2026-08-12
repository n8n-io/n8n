<script lang="ts" setup>
import { useIntervalFn } from '@vueuse/core';
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { EnterpriseEditionFeature, DEBOUNCE_TIME } from '@/app/constants';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useAnnotationTagsStore } from '@/features/shared/tags/tags.store';
import { useDebounce } from '@n8n/composables/useDebounce';
import { useToast } from '@n8n/composables/useToast';
import { N8nIcon, N8nInput } from '@n8n/design-system';
import type { BaseTextKey } from '@n8n/i18n';
import { i18n as locale } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';

import { useExecutionsStore } from '../executions.store';
import type { ExecutionFilterType } from '../executions.types';
import { resolveNlFilterPatch } from '../executions.utils';

const props = defineProps<{
	filters: ExecutionFilterType;
}>();

const emit = defineEmits<{
	filterChanged: [value: ExecutionFilterType];
}>();

/** Below this length, auto-fire-on-idle is suppressed — a 3s pause is easily hit mid-sentence, and translating a fragment just to overwrite it a few keystrokes later wastes a call and flickers the UI. Enter always fires regardless of length. */
const MIN_AUTO_QUERY_LENGTH = 10;

const PLACEHOLDER_EXAMPLE_COUNT = 4;
const PLACEHOLDER_ROTATE_MS = 10_000;
const TYPEWRITER_SPEED_MS = 40;

const query = ref('');
const isTranslating = ref(false);
const lastTranslatedQuery = ref('');
let requestId = 0;

const { debounce } = useDebounce();
const toast = useToast();
const executionsStore = useExecutionsStore();
const workflowsListStore = useWorkflowsListStore();
const annotationTagsStore = useAnnotationTagsStore();
const settingsStore = useSettingsStore();

const isAnnotationFiltersEnabled = computed(
	() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.AdvancedExecutionFilters],
);

// Tags are needed to resolve `annotationTagNames` from the AI response to real tag IDs.
void annotationTagsStore.fetchAll();

// Rotating, typed-out placeholder — purely cosmetic, so it pauses once the user has typed
// something (the placeholder is invisible then anyway) rather than ticking away unseen.
const placeholderExamples = Array.from({ length: PLACEHOLDER_EXAMPLE_COUNT }, (_, i) =>
	locale.baseText(`executionsNlFilter.placeholder${i}` as BaseTextKey),
);
const exampleIndex = ref(0);
const placeholderText = ref('');
let typewriterTimer: ReturnType<typeof setInterval> | null = null;

function stopTypewriter() {
	if (typewriterTimer) {
		clearInterval(typewriterTimer);
		typewriterTimer = null;
	}
}

function typeOutPlaceholder(text: string) {
	stopTypewriter();
	placeholderText.value = '';
	let charCount = 0;
	typewriterTimer = setInterval(() => {
		charCount += 1;
		placeholderText.value = text.slice(0, charCount);
		if (charCount >= text.length) stopTypewriter();
	}, TYPEWRITER_SPEED_MS);
}

const { pause: pausePlaceholderRotation, resume: resumePlaceholderRotation } = useIntervalFn(() => {
	exampleIndex.value = (exampleIndex.value + 1) % placeholderExamples.length;
}, PLACEHOLDER_ROTATE_MS);

watch(exampleIndex, (i) => typeOutPlaceholder(placeholderExamples[i]), { immediate: true });

watch(query, (value) => {
	if (value) {
		pausePlaceholderRotation();
		stopTypewriter();
	} else {
		resumePlaceholderRotation();
	}
});

onBeforeUnmount(stopTypewriter);

async function runTranslation() {
	const trimmedQuery = query.value.trim();
	if (!trimmedQuery || trimmedQuery === lastTranslatedQuery.value) return;

	const currentRequestId = ++requestId;
	isTranslating.value = true;

	try {
		const response = await executionsStore.translateNlFilter(trimmedQuery);
		// A newer request started (or finished) while this one was in flight — discard.
		if (currentRequestId !== requestId) return;

		lastTranslatedQuery.value = trimmedQuery;

		const patch = resolveNlFilterPatch(response, {
			workflows: workflowsListStore.allWorkflows,
			annotationTags: annotationTagsStore.allTags,
			annotationFiltersEnabled: isAnnotationFiltersEnabled.value,
		});

		emit('filterChanged', { ...props.filters, ...patch });
	} catch (error) {
		if (currentRequestId !== requestId) return;
		toast.showError(error, locale.baseText('executionsNlFilter.error.title'));
	} finally {
		if (currentRequestId === requestId) {
			isTranslating.value = false;
		}
	}
}

const debouncedRunTranslation = debounce(runTranslation, {
	debounceTime: DEBOUNCE_TIME.AI.NL_FILTER,
	trailing: true,
});

function onQueryChange(value: string) {
	query.value = value;

	if (value.trim().length < MIN_AUTO_QUERY_LENGTH) {
		// Too short to be worth an auto-fire; also cancel any pending one from a longer,
		// since-shortened query.
		debouncedRunTranslation.cancel();
		return;
	}

	void debouncedRunTranslation();
}

function onEnter() {
	debouncedRunTranslation.cancel();
	void runTranslation();
}
</script>

<template>
	<N8nInput
		:model-value="query"
		:placeholder="placeholderText"
		clearable
		data-test-id="executions-nl-filter-input"
		:class="$style.input"
		@update:model-value="onQueryChange"
		@keydown.enter="onEnter"
	>
		<template v-if="isTranslating" #suffix>
			<N8nIcon icon="spinner" spin data-test-id="executions-nl-filter-loading" />
		</template>
	</N8nInput>
</template>

<style lang="scss" module>
.input {
	width: 100%;
}
</style>
