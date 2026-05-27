<script lang="ts" setup>
import { N8nIcon, type IconName } from '@n8n/design-system';
import { onMounted, ref, useTemplateRef, watch } from 'vue';
import ConfirmationFooter from './ConfirmationFooter.vue';

export interface ApprovalOption {
	/** Stable identifier emitted on click. */
	key: string;
	/** Leading icon — typically `check` for allow rows, `ban` for deny. */
	icon: IconName;
	/** Primary (bold-eligible) label text. */
	label: string;
	/** Optional muted text rendered after the label. */
	suffix?: string;
	/** Mark this row as the destructive choice — picks up the red highlight. */
	destructive?: boolean;
	/** Show the trailing arrow indicator on the highlighted row. Defaults to `true`. */
	withArrow?: boolean;
	/** `data-test-id` for the row button. */
	testId?: string;
}

const props = defineProps<{ options: ApprovalOption[] }>();
const emit = defineEmits<{ select: [key: string] }>();

// Keyboard model: first option is pre-selected; Up/Down move the highlight;
// Enter submits the highlighted option; hover also drives the highlight so
// the mouse and keyboard agree on what's active.
const containerRef = useTemplateRef<HTMLElement>('container');
const highlightedIndex = ref(0);

watch(
	() => props.options.length,
	(length) => {
		if (highlightedIndex.value >= length) highlightedIndex.value = Math.max(0, length - 1);
	},
);

onMounted(() => {
	containerRef.value?.focus();
});

function onKeydown(event: KeyboardEvent) {
	if (props.options.length === 0) return;
	if (event.key === 'ArrowDown') {
		event.preventDefault();
		highlightedIndex.value = Math.min(props.options.length - 1, highlightedIndex.value + 1);
		return;
	}
	if (event.key === 'ArrowUp') {
		event.preventDefault();
		highlightedIndex.value = Math.max(0, highlightedIndex.value - 1);
		return;
	}
	if (event.key === 'Enter') {
		event.preventDefault();
		const option = props.options[highlightedIndex.value];
		if (option) emit('select', option.key);
	}
}
</script>

<template>
	<ConfirmationFooter layout="column">
		<div
			ref="container"
			:class="$style.list"
			role="listbox"
			tabindex="0"
			:aria-activedescendant="
				options[highlightedIndex] ? `approval-option-${options[highlightedIndex].key}` : undefined
			"
			@keydown="onKeydown"
		>
			<button
				v-for="(option, idx) in options"
				:id="`approval-option-${option.key}`"
				:key="option.key"
				type="button"
				role="option"
				:aria-selected="highlightedIndex === idx"
				:class="[
					$style.row,
					highlightedIndex === idx && $style.highlighted,
					option.destructive && $style.rowDestructive,
				]"
				:data-test-id="option.testId"
				tabindex="-1"
				@click="emit('select', option.key)"
				@mouseenter="highlightedIndex = idx"
			>
				<N8nIcon :class="$style.leadingIcon" :icon="option.icon" size="small" />
				<span :class="$style.label">
					<span :class="option.suffix ? $style.labelStrong : undefined">{{ option.label }}</span>
					<span v-if="option.suffix" :class="$style.labelMuted">{{ option.suffix }}</span>
				</span>
				<N8nIcon
					v-if="option.withArrow !== false"
					:class="$style.trailingIcon"
					icon="arrow-right"
					size="small"
				/>
			</button>
		</div>
	</ConfirmationFooter>
</template>

<style lang="scss" module>
.list {
	display: flex;
	flex-direction: column;
	outline: none;
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: none;
	border-radius: var(--radius--lg);
	background: none;
	cursor: pointer;
	text-align: left;
	font-size: var(--font-size--sm);
	color: var(--color--text);
	transition: background-color 0.15s ease;
}

// Highlight: applied when the row is the current selection (keyboard or
// mouse). Unifies the visual for hover and arrow-key states so the user
// always sees one — and only one — active row.
.highlighted {
	background-color: light-dark(var(--color--neutral-100), var(--color--neutral-800));

	.trailingIcon {
		opacity: 1;
	}
}

// Destructive variant only changes the highlight colour, so the cost of
// confirming becomes obvious the moment the user lands on the row.
.rowDestructive.highlighted {
	background-color: var(--callout--color--background--danger);
	color: var(--callout--color--text--danger);

	.leadingIcon {
		color: var(--callout--color--text--danger);
	}
}

.leadingIcon {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.label {
	flex: 1;
	display: flex;
	align-items: baseline;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
}

.labelStrong {
	font-weight: var(--font-weight--bold);
}

.labelMuted {
	color: var(--color--text--tint-1);
	font-weight: var(--font-weight--regular);
}

.trailingIcon {
	margin-left: auto;
	opacity: 0;
	color: var(--color--text--tint-1);
	flex-shrink: 0;
	transition: opacity 0.15s ease;
}
</style>
