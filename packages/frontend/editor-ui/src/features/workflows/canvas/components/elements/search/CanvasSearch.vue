<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useDeviceSupport } from '@n8n/composables/useDeviceSupport';
import { N8nIcon, N8nIconButton, N8nInput, N8nText, N8nTooltip } from '@n8n/design-system';

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
	open: [];
	zoom: [];
	close: [];
}>();

const i18n = useI18n();
const { isCtrlKeyPressed } = useDeviceSupport();

const inputRef = ref<{ focus: () => void; blur: () => void; select: () => void } | null>(null);

const hasQuery = computed(() => props.modelValue.length > 0);
const hasMatches = computed(() => props.matchCount > 0);
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

function requestClose() {
	// Blur first so focus leaves the input before it is removed from the DOM.
	// Otherwise the canvas keybindings keep treating a (detached) input as the
	// active element and ignore keys, so the next Cmd+F falls through to the browser.
	inputRef.value?.blur();
	emit('close');
}

function onKeydown(event: KeyboardEvent) {
	const key = event.key.toLowerCase();
	const isCtrl = isCtrlKeyPressed(event);
	// A second Cmd/Ctrl+F closes the widget; Cmd/Ctrl+G mirrors "find again".
	const isFindShortcut = key === 'f' && isCtrl;
	const isFindAgainShortcut = key === 'g' && isCtrl;

	if (event.key !== 'Escape' && event.key !== 'Enter' && !isFindShortcut && !isFindAgainShortcut) {
		return;
	}

	// Handle these ourselves and keep them from reaching the canvas keybindings
	// (and the browser's native find).
	event.preventDefault();
	event.stopPropagation();

	if (event.key === 'Escape' || isFindShortcut) {
		requestClose();
		return;
	}

	// Enter / Cmd+G navigate between matches.
	if (event.shiftKey) {
		emit('previous');
	} else {
		emit('next');
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
			:model-value="modelValue"
			:placeholder="i18n.baseText('nodeView.search.placeholder')"
			:aria-label="i18n.baseText('nodeView.search.placeholder')"
			size="small"
			data-test-id="canvas-search-input"
			@update:model-value="emit('update:modelValue', $event)"
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
				v-if="hasMatches"
				icon="zoom-in"
				variant="ghost"
				size="small"
				:title="i18n.baseText('nodeView.search.zoomToMatch')"
				:aria-label="i18n.baseText('nodeView.search.zoomToMatch')"
				data-test-id="canvas-search-zoom"
				@click="emit('zoom')"
			/>
			<N8nIconButton
				v-if="hasMatches"
				icon="expand"
				variant="ghost"
				size="small"
				:title="i18n.baseText('nodeView.search.openNode')"
				:aria-label="i18n.baseText('nodeView.search.openNode')"
				data-test-id="canvas-search-open"
				@click="emit('open')"
			/>
			<N8nIconButton
				icon="x"
				variant="ghost"
				size="small"
				:title="i18n.baseText('nodeView.search.close')"
				:aria-label="i18n.baseText('nodeView.search.close')"
				data-test-id="canvas-search-close"
				@click="requestClose"
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
