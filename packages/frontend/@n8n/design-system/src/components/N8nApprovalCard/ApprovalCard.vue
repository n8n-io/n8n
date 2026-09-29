<script lang="ts" setup>
import { onMounted, ref, useId, useTemplateRef, watch } from 'vue';

import N8nIcon, { type IconName } from '../N8nIcon';
import N8nText from '../N8nText';

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

interface ApprovalCardProps {
	/** Heading that describes the action. */
	title: string;
	/** Heading size used by the host surface. */
	titleSize?: 'medium' | 'large';
	/** Action details shown in a scrollable text region. */
	description?: string;
	/** Accessible name for the details region. Defaults to the title. */
	descriptionLabel?: string;
	/** Available decisions, in display and keyboard order. */
	options: readonly ApprovalOption[];
	/** Prevent mouse and keyboard decisions while the card is inactive. */
	disabled?: boolean;
	/** Focus the decisions on mount. Disable this in a chat timeline. */
	autofocus?: boolean;
}

defineOptions({ name: 'N8nApprovalCard' });
const props = withDefaults(defineProps<ApprovalCardProps>(), {
	titleSize: 'large',
	autofocus: true,
});
const emit = defineEmits<{ select: [key: string] }>();

// Chat timelines can show more than one approval at a time.
const id = useId();
const containerRef = useTemplateRef<HTMLElement>('container');
const highlightedIndex = ref(0);

watch(
	() => props.options.length,
	(length) => {
		if (highlightedIndex.value >= length) highlightedIndex.value = Math.max(0, length - 1);
	},
);

onMounted(() => {
	if (props.autofocus && !props.disabled) containerRef.value?.focus();
});

function selectOption(key: string) {
	if (props.disabled) return;
	emit('select', key);
}

function onKeydown(event: KeyboardEvent) {
	if (props.disabled || props.options.length === 0) return;
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
		if (option) selectOption(option.key);
	}
}
</script>

<template>
	<div :class="[$style.card, disabled && $style.disabled]">
		<div :class="$style.body">
			<N8nText :id="`${id}-title`" :size="titleSize" bold>{{ title }}</N8nText>
			<slot name="description">
				<div
					v-if="description"
					:class="$style.description"
					role="region"
					:aria-label="descriptionLabel ?? title"
					tabindex="0"
				>
					{{ description }}
				</div>
			</slot>
			<slot />
		</div>
		<div :class="$style.footer">
			<slot name="footer">
				<div
					ref="container"
					:class="$style.list"
					role="listbox"
					:tabindex="disabled ? -1 : 0"
					:aria-disabled="disabled"
					:aria-labelledby="`${id}-title`"
					:aria-activedescendant="
						options[highlightedIndex] ? `${id}-${options[highlightedIndex].key}` : undefined
					"
					@keydown="onKeydown"
				>
					<button
						v-for="(option, idx) in options"
						:id="`${id}-${option.key}`"
						:key="option.key"
						type="button"
						role="option"
						:disabled="disabled"
						:aria-selected="highlightedIndex === idx"
						:class="[
							$style.row,
							highlightedIndex === idx && $style.highlighted,
							option.destructive && $style.rowDestructive,
						]"
						:data-test-id="option.testId"
						tabindex="-1"
						@click="selectOption(option.key)"
						@mouseenter="highlightedIndex = idx"
					>
						<N8nIcon :class="$style.leadingIcon" :icon="option.icon" size="large" />
						<span :class="$style.label">
							<span :class="$style.labelStrong">{{ option.label }}</span>
							<span v-if="option.suffix" :class="$style.labelMuted">{{ option.suffix }}</span>
						</span>
						<span v-if="option.withArrow !== false" :class="$style.trailingIndicator">
							<N8nIcon
								:class="$style.trailingIcon"
								icon="arrow-right"
								size="large"
								:stroke-width="2.5"
							/>
						</span>
					</button>
				</div>
			</slot>
		</div>
	</div>
</template>

<style lang="scss" module>
.card {
	width: 100%;
	min-width: 0;
	border-radius: var(--radius--lg);
	background-color: var(--background--surface);
	box-shadow: var(--shadow--sm), var(--shadow--outline);
	font-size: var(--font-size--2xs);
}

.disabled {
	opacity: 0.75;
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm) var(--spacing--sm) 0;
}

.description {
	max-height: var(--height--5xl);
	overflow-y: auto;
	padding: var(--spacing--2xs) 0;
	border-radius: var(--radius);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--sm);
	color: var(--color--text);
	white-space: pre-wrap;
	word-break: normal;
	overflow-wrap: anywhere;
}

.list {
	display: flex;
	flex-direction: column;
	outline: none;
}

.footer {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--sm) var(--spacing--sm);
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	min-height: var(--height--lg);
	padding: var(--spacing--3xs) var(--spacing--2xs) var(--spacing--3xs) var(--spacing--xs);
	border: none;
	border-radius: var(--radius--lg);
	background: none;
	cursor: pointer;
	text-align: left;
	font-size: var(--font-size--sm);
	color: var(--text-color);

	&:disabled {
		cursor: default;
		pointer-events: none;
	}
}

// Highlight: applied when the row is the current selection (keyboard or
// mouse). Unifies the visual for hover and arrow-key states so the user
// always sees one — and only one — active row.
.highlighted {
	background-color: light-dark(var(--color--neutral-100), var(--color--neutral-800));

	.trailingIndicator {
		visibility: visible;
	}
}

// Destructive variant only changes the highlight colour, so the cost of
// confirming becomes obvious the moment the user lands on the row.
.rowDestructive.highlighted {
	background-color: light-dark(var(--color--red-100), var(--callout--color--background--danger));
	color: light-dark(var(--color--red-800), var(--color--red-250));

	.leadingIcon {
		color: light-dark(var(--color--red-800), var(--color--red-250));
	}

	.trailingIndicator {
		color: var(--color--neutral-white);
		opacity: 1;
	}
}

.leadingIcon {
	flex-shrink: 0;
	color: var(--icon-color--strong);
}

.label {
	flex: 1;
	display: flex;
	flex-wrap: wrap;
	min-width: 0;
	align-items: baseline;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
}

.labelStrong {
	font-weight: var(--font-weight--medium);
	overflow-wrap: anywhere;
}

.labelMuted {
	color: var(--text-color--subtle);
	font-weight: var(--font-weight--regular);
}

.trailingIndicator {
	margin-left: auto;
	visibility: hidden;
	width: var(--spacing--lg);
	height: var(--spacing--lg);
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border-radius: var(--radius--full);
	background-color: var(--color--primary);
	color: var(--color--neutral-white);
	flex-shrink: 0;
}

.trailingIcon {
	width: var(--spacing--sm);
	height: var(--spacing--sm);
}
</style>
