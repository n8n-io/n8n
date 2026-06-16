<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useDeviceSupport } from '@n8n/composables/useDeviceSupport';
import { N8nIcon, N8nIconButton, N8nInput, N8nText, N8nTooltip } from '@n8n/design-system';
import { useDebounce } from '@/app/composables/useDebounce';
import { DEBOUNCE_TIME, getDebounceTime } from '@/app/constants';

const props = defineProps<{
	modelValue: string;
	caseSensitive: boolean;
	useRegex: boolean;
	matchCount: number;
	/** Index of the currently focused match, or -1 when navigation hasn't started. */
	activeMatchIndex: number;
	regexError: string | null;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: string];
	'update:caseSensitive': [value: boolean];
	'update:useRegex': [value: boolean];
	next: [];
	previous: [];
	close: [];
}>();

const i18n = useI18n();
const { debounce } = useDebounce();
const { isCtrlKeyPressed } = useDeviceSupport();

const inputRef = ref<{ focus: () => void; select: () => void } | null>(null);
const localQuery = ref(props.modelValue);

const debouncedEmitQuery = debounce(async (value: string) => emit('update:modelValue', value), {
	debounceTime: getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH),
	trailing: true,
});

const hasQuery = computed(() => props.modelValue.length > 0);
// Navigation arrows are only useful when there is more than one match to cycle through.
const hasMultipleMatches = computed(() => props.matchCount > 1);

const countLabel = computed(() => {
	if (props.regexError) {
		return i18n.baseText('nodeView.search.invalidRegex');
	}

	if (!hasQuery.value) {
		return '';
	}

	// Always "{current} of {total}" (e.g. "1 of 5") to keep it compact.
	const current = props.matchCount > 0 ? props.activeMatchIndex + 1 : 0;
	return i18n.baseText('nodeView.search.matchCount', {
		interpolate: { current, total: props.matchCount },
	});
});

function onQueryUpdate(value: string) {
	localQuery.value = value;
	void debouncedEmitQuery(value);
}

function onKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape') {
		event.preventDefault();
		emit('close');
		return;
	}

	if (event.key === 'Enter') {
		event.preventDefault();
		if (event.shiftKey) {
			emit('previous');
		} else {
			emit('next');
		}
		return;
	}

	const key = event.key.toLowerCase();

	// A second Cmd/Ctrl+F closes the widget (and never opens the browser's find).
	if (key === 'f' && isCtrlKeyPressed(event)) {
		event.preventDefault();
		emit('close');
		return;
	}

	// Cmd/Ctrl+G cycles matches, mirroring the browser's "find again".
	if (key === 'g' && isCtrlKeyPressed(event)) {
		event.preventDefault();
		if (event.shiftKey) {
			emit('previous');
		} else {
			emit('next');
		}
	}
}

function focusInput() {
	inputRef.value?.focus();
	inputRef.value?.select();
}

onMounted(focusInput);

defineExpose({ focusInput });
</script>

<template>
	<div :class="$style.container" data-test-id="canvas-search">
		<N8nInput
			ref="inputRef"
			:class="$style.input"
			:model-value="localQuery"
			:placeholder="i18n.baseText('nodeView.search.placeholder')"
			:aria-label="i18n.baseText('nodeView.search.placeholder')"
			size="small"
			data-test-id="canvas-search-input"
			@update:model-value="onQueryUpdate"
			@keydown="onKeydown"
		>
			<template #prefix>
				<N8nIcon :class="$style.searchIcon" icon="search" size="small" />
			</template>
			<template #suffix>
				<div :class="$style.options">
					<N8nTooltip :content="i18n.baseText('nodeView.search.matchCase')" placement="top">
						<button
							type="button"
							:class="[$style.optionButton, { [$style.active]: caseSensitive }]"
							:aria-pressed="caseSensitive"
							:aria-label="i18n.baseText('nodeView.search.matchCase')"
							data-test-id="canvas-search-case-sensitive"
							@mousedown.prevent
							@click="emit('update:caseSensitive', !caseSensitive)"
						>
							Aa
						</button>
					</N8nTooltip>
					<N8nTooltip :content="i18n.baseText('nodeView.search.useRegex')" placement="top">
						<button
							type="button"
							:class="[
								$style.optionButton,
								{ [$style.active]: useRegex, [$style.error]: useRegex && !!regexError },
							]"
							:aria-pressed="useRegex"
							:aria-label="i18n.baseText('nodeView.search.useRegex')"
							data-test-id="canvas-search-regex"
							@mousedown.prevent
							@click="emit('update:useRegex', !useRegex)"
						>
							.*
						</button>
					</N8nTooltip>
				</div>
			</template>
		</N8nInput>

		<N8nText
			v-if="countLabel"
			:class="[$style.count, { [$style.countError]: !!regexError }]"
			color="text-light"
			size="small"
			data-test-id="canvas-search-count"
		>
			{{ countLabel }}
		</N8nText>

		<div :class="$style.actions">
			<N8nIconButton
				v-if="hasMultipleMatches"
				icon="chevron-up"
				variant="ghost"
				size="small"
				:title="i18n.baseText('nodeView.search.previousMatch')"
				:aria-label="i18n.baseText('nodeView.search.previousMatch')"
				data-test-id="canvas-search-previous"
				@click="emit('previous')"
			/>
			<N8nIconButton
				v-if="hasMultipleMatches"
				icon="chevron-down"
				variant="ghost"
				size="small"
				:title="i18n.baseText('nodeView.search.nextMatch')"
				:aria-label="i18n.baseText('nodeView.search.nextMatch')"
				data-test-id="canvas-search-next"
				@click="emit('next')"
			/>
			<N8nIconButton
				icon="x"
				variant="ghost"
				size="small"
				:title="i18n.baseText('nodeView.search.close')"
				:aria-label="i18n.baseText('nodeView.search.close')"
				data-test-id="canvas-search-close"
				@click="emit('close')"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	background-color: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius);
	box-shadow: var(--shadow--md);
}

.input {
	width: 240px;

	--input--color--background: transparent;

	.searchIcon {
		color: var(--color--text--tint-1);
	}
}

.options {
	display: flex;
	align-items: center;
	gap: var(--spacing--5xs);
}

.optionButton {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 22px;
	height: 22px;
	padding: 0 var(--spacing--4xs);
	border: none;
	border-radius: var(--radius--sm);
	background-color: transparent;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	line-height: 1;
	cursor: pointer;

	&:hover {
		background-color: var(--color--foreground--tint-1);
		color: var(--color--text);
	}

	&.active {
		background-color: var(--color--primary--tint-3);
		color: var(--color--primary);
	}

	&.error {
		background-color: var(--color--danger--tint-3);
		color: var(--color--danger);
	}
}

.count {
	white-space: nowrap;
	font-variant-numeric: tabular-nums;
}

.countError {
	color: var(--color--danger);
}

.actions {
	display: flex;
	align-items: center;
}
</style>
