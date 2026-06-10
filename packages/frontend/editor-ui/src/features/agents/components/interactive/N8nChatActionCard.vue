<script setup lang="ts">
import { N8nButton, N8nText } from '@n8n/design-system';

import type {
	N8nChatCardComponent,
	N8nChatInteractionInput,
	N8nChatResumeValue,
} from '@/features/ai/shared/agentsChat/n8nChatInteraction';

const props = defineProps<{
	input: N8nChatInteractionInput;
	resolvedValue?: N8nChatResumeValue;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	submit: [resumeData: N8nChatResumeValue];
}>();

/** The resume value a button submits: explicit value, else its label. */
function buttonValue(btn: { label?: string; value?: string }): string {
	return btn.value ?? btn.label ?? '';
}

function submitButton(btn: { label?: string; value?: string }) {
	if (props.disabled) return;
	emit('submit', { type: 'button', value: buttonValue(btn) });
}

function submitOption(component: N8nChatCardComponent, value: string) {
	if (props.disabled) return;
	emit('submit', { type: 'select', ...(component.id && { id: component.id }), value });
}

function isButtonSelected(btn: { label?: string; value?: string }): boolean {
	return props.resolvedValue?.type === 'button' && props.resolvedValue.value === buttonValue(btn);
}

function isOptionSelected(component: N8nChatCardComponent, value: string): boolean {
	return (
		props.resolvedValue?.type === 'select' &&
		props.resolvedValue.value === value &&
		(props.resolvedValue.id === undefined || props.resolvedValue.id === component.id)
	);
}
</script>

<template>
	<div :class="$style.card" data-testid="n8n-chat-action-card">
		<N8nText v-if="input.card.title" :class="$style.title" bold>{{ input.card.title }}</N8nText>
		<N8nText v-if="input.card.message" :class="$style.message" color="text-base">
			{{ input.card.message }}
		</N8nText>

		<template v-for="(component, idx) in input.card.components" :key="idx">
			<div
				v-if="component.type === 'section' && (component.text || component.button)"
				:class="$style.section"
			>
				<N8nText v-if="component.text">{{ component.text }}</N8nText>
				<N8nButton
					v-if="component.button"
					:class="$style.button"
					size="small"
					:type="isButtonSelected(component.button) ? 'primary' : 'secondary'"
					:disabled="disabled && !isButtonSelected(component.button)"
					data-testid="n8n-chat-card-section-button"
					@click="submitButton(component.button)"
				>
					{{ component.button.label ?? component.button.value }}
				</N8nButton>
			</div>

			<hr v-else-if="component.type === 'divider'" :class="$style.divider" />

			<N8nButton
				v-else-if="component.type === 'button'"
				:class="$style.button"
				size="small"
				:type="isButtonSelected(component) ? 'primary' : 'secondary'"
				:disabled="disabled && !isButtonSelected(component)"
				data-testid="n8n-chat-card-button"
				@click="submitButton(component)"
			>
				{{ component.label ?? component.text ?? component.value }}
			</N8nButton>

			<div
				v-else-if="component.type === 'select' || component.type === 'radio_select'"
				:class="$style.selectGroup"
			>
				<N8nText v-if="component.label" :class="$style.selectLabel" bold>
					{{ component.label }}
				</N8nText>
				<button
					v-for="option in component.options ?? []"
					:key="option.value"
					type="button"
					:class="[
						$style.option,
						isOptionSelected(component, option.value) && $style.optionSelected,
					]"
					:disabled="disabled"
					data-testid="n8n-chat-card-option"
					@click="submitOption(component, option.value)"
				>
					<span>{{ option.label }}</span>
					<N8nText v-if="option.description" size="xsmall" color="text-light">
						{{ option.description }}
					</N8nText>
				</button>
			</div>

			<div v-else-if="component.type === 'fields'" :class="$style.fieldsGroup">
				<div v-for="field in component.fields ?? []" :key="field.label" :class="$style.fieldRow">
					<N8nText size="small" bold>{{ field.label }}</N8nText>
					<N8nText size="small">{{ field.value }}</N8nText>
				</div>
			</div>

			<img
				v-else-if="component.type === 'image' && component.url"
				:src="component.url"
				:alt="component.alt ?? ''"
				:class="$style.image"
			/>
		</template>
	</div>
</template>

<style module lang="scss">
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--2xs);
	border: var(--border-width, 1px) var(--border-style, solid) var(--border-color);
	border-radius: var(--radius--sm);
}

.title {
	margin-bottom: var(--spacing--4xs);
}

.message {
	margin-bottom: var(--spacing--4xs);
}

.section {
	margin-bottom: var(--spacing--4xs);
}

.divider {
	border: none;
	border-top: var(--border-width, 1px) var(--border-style, solid) var(--border-color);
	margin: var(--spacing--3xs) 0;
}

.button {
	align-self: flex-start;
	margin-right: var(--spacing--4xs);
}

.selectGroup {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.selectLabel {
	margin-bottom: var(--spacing--5xs);
}

.option {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--5xs);
	padding: var(--spacing--4xs) var(--spacing--3xs);
	border: var(--border-width, 1px) var(--border-style, solid) var(--border-color);
	border-radius: var(--radius--sm);
	background: transparent;
	cursor: pointer;
	text-align: left;

	&:disabled {
		cursor: default;
	}
}

.optionSelected {
	border-color: var(--color--primary);
	background-color: var(--color--primary--tint-2);
}

.fieldsGroup {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.fieldRow {
	display: flex;
	gap: var(--spacing--2xs);
}

.image {
	max-width: 100%;
	border-radius: var(--radius--sm);
}
</style>
