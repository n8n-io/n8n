<script lang="ts" setup>
import type { ExecutionsNlFilterResponseDto } from '@n8n/api-types';
import { useIntervalFn } from '@vueuse/core';
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

import { EnterpriseEditionFeature, DEBOUNCE_TIME } from '@/app/constants';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useAnnotationTagsStore } from '@/features/shared/tags/tags.store';
import { useDebounce } from '@n8n/composables/useDebounce';
import { useToast } from '@n8n/composables/useToast';
import { N8nIcon, N8nInput, N8nPopover } from '@n8n/design-system';
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

const isFocused = ref(false);
/** Set by Escape and by picking an entry, so the dropdown stays shut while the input keeps focus. */
const isHistoryDismissed = ref(false);
/** Index into `matchingQueries`; -1 means the text as typed, not a history entry. */
const highlightedIndex = ref(-1);
const inputWrapper = ref<HTMLDivElement>();
const historyList = ref<HTMLUListElement>();

const { debounce } = useDebounce();
const toast = useToast();
const executionsStore = useExecutionsStore();
const workflowsListStore = useWorkflowsListStore();
const annotationTagsStore = useAnnotationTagsStore();
const settingsStore = useSettingsStore();
const { history, record } = useExecutionsNlFilterHistory();

/**
 * Newest first (storage stays chronological ascending), narrowed to what's typed so the dropdown
 * behaves as an autocomplete rather than a fixed overlay sitting on top of the executions list.
 */
const matchingQueries = computed(() => {
	const needle = query.value.trim().toLowerCase();
	const newestFirst = [...history.value].reverse();

	if (!needle) return newestFirst;
	return newestFirst.filter((entry) => entry.query.toLowerCase().includes(needle));
});

// Derived rather than a ref, so it can't get stuck open: it closes on blur, on Escape, and
// automatically once what's typed no longer matches anything in history.
const isHistoryOpen = computed(
	() => isFocused.value && !isHistoryDismissed.value && matchingQueries.value.length > 0,
);

// The highlight indexes into a list that shrinks as the user types, so drop it whenever that list
// changes or the dropdown closes rather than leaving it pointing at a different (or absent) entry.
watch([matchingQueries, isHistoryOpen], () => {
	highlightedIndex.value = -1;
});

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
	// The picked query matches itself, so without dismissing, the dropdown would reopen the moment
	// focus lands back on the input. Typing again (or leaving and returning) clears the flag.
	isHistoryDismissed.value = true;
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
	// Typing is a fresh intent to browse, so an earlier Escape/selection stops suppressing the list.
	isHistoryDismissed.value = false;

	if (value.trim().length < MIN_AUTO_QUERY_LENGTH) {
		// Too short to be worth an auto-fire; also cancel any pending one from a longer,
		// since-shortened query.
		debouncedRunTranslation.cancel();
		return;
	}

	void debouncedRunTranslation();
}

function onEnter() {
	const highlighted = matchingQueries.value[highlightedIndex.value];
	if (highlighted) {
		onHistorySelect(highlighted);
		return;
	}

	debouncedRunTranslation.cancel();
	void runTranslation();
}

function onFocus() {
	isFocused.value = true;
}

function onBlur() {
	isFocused.value = false;
	// Reset here rather than on focus: on focus it would immediately undo the suppression that
	// `onHistorySelect` just set, reopening the dropdown as focus returns to the input.
	isHistoryDismissed.value = false;
}

function onEscape() {
	isHistoryDismissed.value = true;
}

/**
 * Moves a highlight rather than DOM focus: focusing an item would blur the input, which closes
 * the dropdown (see `isHistoryOpen`) out from under the element being focused. Wraps through -1
 * so arrowing past either end returns to the text as typed.
 */
async function moveHighlight(delta: 1 | -1) {
	if (!isHistoryOpen.value) return;

	const lastIndex = matchingQueries.value.length - 1;
	const next = highlightedIndex.value + delta;
	highlightedIndex.value = next > lastIndex ? -1 : next < -1 ? lastIndex : next;

	await nextTick();
	historyList.value
		?.querySelectorAll('button')
		[highlightedIndex.value]?.scrollIntoView({ block: 'nearest' });
}
</script>

<template>
	<div ref="inputWrapper" :class="$style.container">
		<N8nInput
			:model-value="query"
			:placeholder="placeholderText"
			clearable
			data-test-id="executions-nl-filter-input"
			@update:model-value="onQueryChange"
			@focus="onFocus"
			@blur="onBlur"
			@keydown.enter="onEnter"
			@keydown.esc="onEscape"
			@keydown.down.prevent="moveHighlight(1)"
			@keydown.up.prevent="moveHighlight(-1)"
		>
			<template v-if="isTranslating" #suffix>
				<N8nIcon icon="spinner" spin data-test-id="executions-nl-filter-loading" />
			</template>
		</N8nInput>
		<N8nPopover
			:open="isHistoryOpen"
			:reference="inputWrapper"
			width="var(--reka-popper-anchor-width)"
			side="bottom"
			align="start"
			max-height="320px"
			:suppress-auto-focus="true"
			:content-class="$style.historyPopover"
		>
			<template #content>
				<ul
					ref="historyList"
					:class="$style.historyList"
					:aria-label="locale.baseText('executionsNlFilter.history.ariaLabel')"
					data-test-id="executions-nl-filter-history-list"
				>
					<li v-for="(entry, index) in matchingQueries" :key="entry.savedAt">
						<button
							type="button"
							:class="[
								$style.historyItem,
								{ [$style.historyItemHighlighted]: index === highlightedIndex },
							]"
							:title="entry.query"
							:aria-selected="index === highlightedIndex"
							@mousedown.prevent
							@click="onHistorySelect(entry)"
						>
							{{ entry.query }}
						</button>
					</li>
				</ul>
			</template>
		</N8nPopover>
	</div>
</template>

<style lang="scss" module>
/* Also the popover's anchor, so the dropdown inherits the input's width and left edge. */
.container {
	width: 100%;
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

/* Keyboard highlight — focus stays in the input, so this stands in for a focus ring. */
.historyItemHighlighted,
.historyItemHighlighted:hover {
	background: var(--color--foreground--tint-1);
}
</style>
