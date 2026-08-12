<script lang="ts" setup>
import type { ExecutionsNlFilterResponseDto } from '@n8n/api-types';
import { useElementSize, useIntervalFn } from '@vueuse/core';
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { EnterpriseEditionFeature, DEBOUNCE_TIME } from '@/app/constants';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useAnnotationTagsStore } from '@/features/shared/tags/tags.store';
import { useDebounce } from '@n8n/composables/useDebounce';
import { useToast } from '@n8n/composables/useToast';
import { N8nButton, N8nIcon, N8nInput, N8nPopover } from '@n8n/design-system';
import type { BaseTextKey } from '@n8n/i18n';
import { i18n as locale } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';

import type { ExecutionsNlFilterHistoryEntry } from '../composables/useExecutionsNlFilterHistory';
import { useExecutionsNlFilterHistory } from '../composables/useExecutionsNlFilterHistory';
import { useExecutionsStore } from '../executions.store';
import type { ExecutionFilterType } from '../executions.types';
import { getDefaultExecutionFilters, resolveNlFilterPatch } from '../executions.utils';

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

const isHistoryOpen = ref(false);
const inputWrapper = ref<HTMLDivElement>();
// The dropdown matches the input's width but is anchored to it rather than nested inside, so it
// overlays instead of stretching the input; the history button stays the popover's trigger.
const { width: inputWidth } = useElementSize(inputWrapper);

const { debounce } = useDebounce();
const toast = useToast();
const executionsStore = useExecutionsStore();
const workflowsListStore = useWorkflowsListStore();
const annotationTagsStore = useAnnotationTagsStore();
const settingsStore = useSettingsStore();
const { history, record } = useExecutionsNlFilterHistory();

/** Newest first — the dropdown reads top-down, while storage stays chronological ascending. */
const recentQueries = computed(() => [...history.value].reverse());

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

/**
 * Resolves an AI extraction against the user's *current* workflows and tags, then applies it.
 * Run on replay too, not just on translation, so a stored entry naturally drops a workflow or tag
 * that has since been deleted rather than filtering on a dangling ID.
 */
function applyResponse(response: ExecutionsNlFilterResponseDto) {
	const patch = resolveNlFilterPatch(response, {
		workflows: workflowsListStore.allWorkflows,
		annotationTags: annotationTagsStore.allTags,
		annotationFiltersEnabled: isAnnotationFiltersEnabled.value,
	});

	// Each query is a complete, standalone description of what to show — reset to defaults
	// first so a field the new query doesn't mention (e.g. a previous query's metadata)
	// doesn't linger. This intentionally also clears any filters set manually via the popover.
	emit('filterChanged', { ...getDefaultExecutionFilters(), ...patch });
}

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
		applyResponse(response);
		record(trimmedQuery, response);
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

function onHistorySelect(entry: ExecutionsNlFilterHistoryEntry) {
	isHistoryOpen.value = false;
	query.value = entry.query;
	// Marking it translated stops a subsequent Enter from re-sending identical text to the model —
	// the stored extraction is already what that query resolves to.
	lastTranslatedQuery.value = entry.query;
	// Cancel any debounce still pending from what the user had typed before picking an entry.
	debouncedRunTranslation.cancel();
	applyResponse(entry.response);
}

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
	<div :class="$style.container">
		<N8nPopover
			v-model:open="isHistoryOpen"
			:reference="inputWrapper"
			:width="`${inputWidth}px`"
			side="bottom"
			align="start"
			max-height="320px"
			:content-class="$style.historyPopover"
		>
			<template #trigger>
				<N8nButton
					variant="ghost"
					size="medium"
					icon="history"
					icon-only
					:disabled="recentQueries.length === 0"
					:aria-label="locale.baseText('executionsNlFilter.history.ariaLabel')"
					data-test-id="executions-nl-filter-history-button"
				/>
			</template>
			<template #content>
				<ul :class="$style.historyList" data-test-id="executions-nl-filter-history-list">
					<li v-for="entry in recentQueries" :key="entry.savedAt">
						<button
							type="button"
							:class="$style.historyItem"
							:title="entry.query"
							@click="onHistorySelect(entry)"
						>
							{{ entry.query }}
						</button>
					</li>
				</ul>
			</template>
		</N8nPopover>
		<div ref="inputWrapper" :class="$style.inputWrapper">
			<N8nInput
				:model-value="query"
				:placeholder="placeholderText"
				clearable
				data-test-id="executions-nl-filter-input"
				@update:model-value="onQueryChange"
				@keydown.enter="onEnter"
			>
				<template v-if="isTranslating" #suffix>
					<N8nIcon icon="spinner" spin data-test-id="executions-nl-filter-loading" />
				</template>
			</N8nInput>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
}

.inputWrapper {
	flex: 1 1 auto;
	min-width: 0;
}

/*
 * Doubled selector so this beats N8nPopover's own single-class `--background--surface` rule
 * without depending on stylesheet order — the two classes land on the same element.
 * The value mirrors N8nInput's `--input--color--background` so the dropdown reads as an
 * extension of the input it's anchored to.
 */
.historyPopover.historyPopover {
	background-color: light-dark(var(--color--neutral-white), var(--color--neutral-950));
}

.historyList {
	list-style: none;
	margin: 0;
	padding: 0;
}

.historyList li + li .historyItem {
	border-top: var(--border-width, 1px) solid var(--border-color--subtle);
}

.historyItem {
	display: block;
	width: 100%;
	/* Horizontal padding matches N8nInput's `--input--padding`, so the text lines up with the query above it. */
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: 0;
	background: transparent;
	color: var(--color--text--shade-1);
	/* Matches N8nInput's default `--input--font-size`. */
	font-size: var(--font-size--sm);
	text-align: left;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	cursor: pointer;

	&:hover {
		background: var(--color--foreground--tint-1);
	}
}
</style>
