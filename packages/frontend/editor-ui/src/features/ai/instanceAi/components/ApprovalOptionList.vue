<script lang="ts" setup>
import { N8nIcon } from '@n8n/design-system';
import ConfirmationFooter from './ConfirmationFooter.vue';

export interface ApprovalOption {
	/** Stable identifier emitted on click. */
	key: string;
	/** Leading icon — typically `check` for allow rows, `ban` for deny. */
	icon: string;
	/** Primary (bold-eligible) label text. */
	label: string;
	/** Optional muted text rendered after the label. */
	suffix?: string;
	/** Tint the row as the destructive option. */
	destructive?: boolean;
	/** Show the trailing arrow indicator on hover/focus. Defaults to `true`. */
	withArrow?: boolean;
	/** `data-test-id` for the row button. */
	testId?: string;
}

defineProps<{ options: ApprovalOption[] }>();

const emit = defineEmits<{ select: [key: string] }>();
</script>

<template>
	<ConfirmationFooter layout="column">
		<button
			v-for="option in options"
			:key="option.key"
			type="button"
			:class="[$style.row, option.destructive && $style.rowDestructive]"
			:data-test-id="option.testId"
			@click="emit('select', option.key)"
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
	</ConfirmationFooter>
</template>

<style lang="scss" module>
@use '../../shared/styles/question-option-rows' as questionOptions;

.row {
	@include questionOptions.option-button-row;
	font-size: var(--font-size--sm);

	&:hover .trailingIcon,
	&:focus-visible .trailingIcon {
		opacity: 1;
	}
}

// Destructive variant — the row is visibly tinted so the cost of confirming
// is signalled without relying on a separate destructive button.
.rowDestructive {
	background-color: var(--callout--color--background--danger);
	color: var(--callout--color--text--danger);

	.leadingIcon {
		color: var(--callout--color--text--danger);
	}

	&:hover,
	&:focus-visible {
		background-color: var(--callout--color--background--danger);
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
