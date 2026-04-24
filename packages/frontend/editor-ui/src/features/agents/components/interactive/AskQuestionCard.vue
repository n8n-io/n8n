<script setup lang="ts">
import { ref, computed } from 'vue';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import type { AskQuestionResume } from '@n8n/api-types';

interface Option {
	label: string;
	value: string;
	description?: string;
}

const props = defineProps<{
	question: string;
	options: Option[];
	allowMultiple?: boolean;
	disabled?: boolean;
	resolvedValue?: AskQuestionResume;
}>();

const emit = defineEmits<{
	submit: [resumeData: { values: string[] }];
}>();

const selected = ref<string[]>([]);

/** Labels of the persisted selected values, for the resolved state. */
const resolvedLabels = computed(() => {
	if (!props.resolvedValue) return [];
	return props.resolvedValue.values.map(
		(v) => props.options.find((o) => o.value === v)?.label ?? v,
	);
});

function toggle(value: string) {
	if (props.disabled) return;
	if (props.allowMultiple) {
		const idx = selected.value.indexOf(value);
		if (idx >= 0) {
			selected.value.splice(idx, 1);
		} else {
			selected.value.push(value);
		}
	} else {
		selected.value = [value];
	}
}

function onSubmit() {
	if (selected.value.length === 0 || props.disabled) return;
	emit('submit', { values: [...selected.value] });
}
</script>

<template>
	<div :class="[$style.card, disabled && $style.disabled]" data-testid="ask-question-card">
		<N8nText tag="p" bold :class="$style.question">{{ question }}</N8nText>

		<!-- Resolved state: show selected labels instead of interactive buttons -->
		<div v-if="disabled && resolvedValue" :class="$style.resolved">
			<N8nIcon icon="circle-check" size="small" color="success" />
			<N8nText size="small">{{ resolvedLabels.join(', ') }}</N8nText>
		</div>

		<!-- Live state: interactive option buttons -->
		<template v-else>
			<div :class="$style.options">
				<button
					v-for="opt in options"
					:key="opt.value"
					:class="[
						$style.option,
						selected.includes(opt.value) && $style.optionSelected,
						disabled && $style.optionDisabled,
					]"
					:disabled="disabled"
					:aria-pressed="selected.includes(opt.value)"
					@click="toggle(opt.value)"
				>
					<div :class="$style.optionLabel">{{ opt.label }}</div>
					<div v-if="opt.description" :class="$style.optionDescription">
						{{ opt.description }}
					</div>
				</button>
			</div>

			<N8nButton :disabled="selected.length === 0 || disabled" size="small" @click="onSubmit">
				Submit
			</N8nButton>
		</template>
	</div>
</template>

<style lang="scss" module>
.card {
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--lg);
	padding: var(--spacing--sm);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	background: var(--color--background);
	max-width: 420px;
}

.disabled {
	opacity: 0.7;
}

.question {
	margin: 0;
	font-size: var(--font-size--sm);
}

.resolved {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	color: var(--color--success);
}

.options {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.option {
	text-align: left;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius);
	background: var(--color--background);
	cursor: pointer;
	transition:
		border-color 120ms ease,
		background 120ms ease;

	&:hover:not(:disabled) {
		border-color: var(--color--primary--tint-1);
		background: var(--color--primary--tint-4);
	}
}

.optionSelected {
	border-color: var(--color--primary);
	background: var(--color--primary--tint-4);
}

.optionDisabled {
	cursor: default;
}

.optionLabel {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
}

.optionDescription {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	margin-top: var(--spacing--5xs);
}
</style>
