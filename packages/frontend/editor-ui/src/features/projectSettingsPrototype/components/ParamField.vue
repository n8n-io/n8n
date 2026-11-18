<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';
import { computed, nextTick, ref } from 'vue';
import type { ParamDef } from '../params';
import { paramAvailability, protoParams, shellText } from '../params';

/**
 * One prototype parameter, as a radio group. Arrow keys move the selection.
 *
 * Parameters with many options list them as cards, each with its caption.
 * The rest are a segmented row, with the selected option's caption below.
 * A parameter the current variant ignores stays visible, disabled, with one
 * line saying why.
 */
const props = defineProps<{ def: ParamDef }>();

const CARDS_FROM = 4;

const labelId = computed(() => `proto-param-${props.def.id}`);
const hintId = computed(() => `proto-param-${props.def.id}-hint`);
const availability = computed(() => paramAvailability(props.def.id, protoParams));
const disabled = computed(() => !availability.value.enabled);
const current = computed(() => protoParams[props.def.id] as string);
const asCards = computed(() => props.def.options.length >= CARDS_FROM);

const options = computed(() =>
	props.def.options.map((option) => ({
		value: option.value,
		label: shellText(option.label, protoParams.shell),
		caption: shellText(option.caption, protoParams.shell),
	})),
);

const selected = computed(() => options.value.find((option) => option.value === current.value));

/** Segments show one line under the row: the reason when disabled, else the selected caption. */
const hint = computed(() => {
	if (disabled.value) return availability.value.reason;
	return asCards.value ? props.def.hint : selected.value?.caption;
});

const buttons = ref<HTMLButtonElement[]>([]);

function select(value: string) {
	if (disabled.value) return;
	(protoParams as unknown as Record<string, string>)[props.def.id] = value;
}

async function move(index: number, step: 1 | -1) {
	if (disabled.value) return;
	const count = options.value.length;
	const next = (index + step + count) % count;
	select(options.value[next].value);
	await nextTick();
	buttons.value[next]?.focus();
}
</script>

<template>
	<div :class="[$style.param, { [$style.disabled]: disabled }]">
		<N8nText :id="labelId" size="small" color="text-dark" :class="$style.label">
			{{ def.label }}
		</N8nText>

		<N8nText
			v-if="asCards"
			:id="hintId"
			size="xsmall"
			color="text-light"
			:class="$style.hint"
			:data-test-id="`proto-hint-${def.id}`"
		>
			{{ hint }}
		</N8nText>

		<div
			:class="asCards ? $style.cards : $style.segments"
			role="radiogroup"
			:aria-labelledby="labelId"
			:aria-describedby="hintId"
			:aria-disabled="disabled ? 'true' : undefined"
		>
			<button
				v-for="(option, index) in options"
				:key="option.value"
				ref="buttons"
				type="button"
				role="radio"
				:class="[
					asCards ? $style.card : $style.segment,
					{ [$style.selected]: current === option.value },
				]"
				:aria-checked="current === option.value"
				:aria-disabled="disabled ? 'true' : undefined"
				:tabindex="current === option.value ? 0 : -1"
				:data-test-id="`proto-option-${def.id}-${option.value}`"
				@click="select(option.value)"
				@keydown.down.prevent="move(index, 1)"
				@keydown.right.prevent="move(index, 1)"
				@keydown.up.prevent="move(index, -1)"
				@keydown.left.prevent="move(index, -1)"
			>
				<template v-if="asCards">
					<span :class="$style.cardText">
						<N8nText size="small" color="text-dark">{{ option.label }}</N8nText>
						<N8nText size="xsmall" color="text-light">{{ option.caption }}</N8nText>
					</span>
					<span :class="$style.check" aria-hidden="true">
						<N8nIcon v-if="current === option.value" icon="check" size="medium" />
					</span>
				</template>
				<template v-else>{{ option.label }}</template>
			</button>
		</div>

		<N8nText
			v-if="!asCards"
			:id="hintId"
			size="xsmall"
			color="text-light"
			:class="$style.hint"
			:data-test-id="`proto-hint-${def.id}`"
		>
			{{ hint }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.param {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

/* Medium, not bold: one step below the panel title, one above option labels. */
.label {
	font-weight: var(--font-weight--medium);
}

.hint {
	line-height: var(--line-height--md);
	text-wrap: pretty;
}

.cards {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin-top: var(--spacing--4xs);
}

.segments {
	display: flex;
	gap: var(--spacing--5xs);
	padding: var(--spacing--5xs);
	border-radius: var(--radius--xs);
	background-color: var(--background--active);
}

.card,
.segment {
	border: var(--border-width) var(--border-style) transparent;
	background: none;
	color: inherit;
	cursor: pointer;
	font-family: inherit;
	transition:
		border-color 150ms var(--easing--ease-out),
		background-color 150ms var(--easing--ease-out),
		color 150ms var(--easing--ease-out);

	&:focus-visible {
		outline: 2px solid var(--color--primary);
		outline-offset: 1px;
	}
}

.card {
	display: flex;
	width: 100%;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-color: var(--border-color);
	border-radius: var(--radius--xs);
	text-align: start;

	@media (hover: hover) and (pointer: fine) {
		&:hover {
			background-color: var(--background--hover);
		}
	}

	&.selected,
	&.selected:hover {
		border-color: var(--color--primary);
		background-color: color-mix(in srgb, var(--color--primary) 10%, transparent);
	}
}

.cardText {
	display: flex;
	min-width: 0;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--5xs);
	line-height: var(--line-height--md);
}

/* A fixed-width slot, so selecting never shifts the row. */
.check {
	display: flex;
	width: var(--spacing--sm);
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	color: var(--color--primary);
}

/* The segment's radius is the track's radius minus the track's padding. */
.segment {
	min-width: 0;
	flex: 1;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-radius: calc(var(--radius--xs) - var(--spacing--5xs));
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--md);
	text-align: center;

	@media (hover: hover) and (pointer: fine) {
		&:hover {
			color: var(--text-color);
		}
	}

	&.selected {
		background-color: var(--background--surface);
		box-shadow: var(--shadow--xs);
		color: var(--text-color);
	}
}

/* Disabled: the options dim, the reason beside them stays at full strength. */
.disabled {
	.card,
	.segment {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.card:hover,
	.card.selected,
	.card.selected:hover {
		border-color: var(--border-color);
		background: none;
	}

	.segment:hover {
		color: var(--text-color--subtle);
	}

	.segment.selected:hover {
		color: var(--text-color);
	}

	.check {
		color: var(--text-color--subtle);
	}
}

@media (prefers-reduced-motion: reduce) {
	.card,
	.segment {
		transition: none;
	}
}
</style>
