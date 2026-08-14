<script setup lang="ts">
import { computed } from 'vue';
import { ElRadio } from 'element-plus';
import { N8nButton, N8nOption, N8nSelect, N8nText } from '@n8n/design-system';

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

type ButtonComponent = Extract<N8nChatCardComponent, { type: 'button' }>;
type SelectComponent = Extract<N8nChatCardComponent, { type: 'select' | 'radio_select' }>;
/** A top-level button component or a section's accessory button. */
type CardButton = Pick<ButtonComponent, 'label' | 'text' | 'value' | 'style'>;

/**
 * Consecutive `button` components flow together on one (wrapping) row instead
 * of stacking one per line; every other component renders as its own block.
 */
type CardBlock =
	| { kind: 'buttons'; buttons: ButtonComponent[] }
	| { kind: 'component'; component: N8nChatCardComponent };

const blocks = computed<CardBlock[]>(() => {
	const result: CardBlock[] = [];
	for (const component of props.input.card.components) {
		if (component.type === 'button') {
			const last = result[result.length - 1];
			if (last?.kind === 'buttons') {
				last.buttons.push(component);
			} else {
				result.push({ kind: 'buttons', buttons: [component] });
			}
		} else {
			result.push({ kind: 'component', component });
		}
	}
	return result;
});

const fallbackSummary = computed(() => {
	if (props.input.card.title || props.input.card.message) return undefined;
	const text = props.input.text?.trim();
	return text ? text : undefined;
});

/**
 * Map the card's button style to a design-system button variant, mirroring
 * how the platform mappers treat them: `primary` = emphasized, `danger` =
 * destructive, `default`/unset = neutral.
 */
function buttonVariant(btn: CardButton): 'solid' | 'destructive' | 'outline' {
	if (btn.style === 'primary') return 'solid';
	if (btn.style === 'danger') return 'destructive';
	return 'outline';
}

function submitButton(btn: CardButton) {
	if (props.disabled) return;
	emit('submit', { type: 'button', value: btn.value });
}

function submitOption(component: SelectComponent, value: string) {
	if (props.disabled) return;
	emit('submit', { type: 'select', ...(component.id && { id: component.id }), value });
}

function isButtonSelected(btn: CardButton): boolean {
	return props.resolvedValue?.type === 'button' && props.resolvedValue.value === btn.value;
}

function isOptionSelected(component: SelectComponent, value: string): boolean {
	return (
		props.resolvedValue?.type === 'select' &&
		props.resolvedValue.value === value &&
		(props.resolvedValue.id === undefined || props.resolvedValue.id === component.id)
	);
}

/** Chosen value for a select/radio_select group: the resolved answer, if any. */
function selectedOptionValue(component: SelectComponent): string | undefined {
	const match = component.options.find((option) => isOptionSelected(component, option.value));
	return match?.value;
}
</script>

<template>
	<div :class="$style.card" data-testid="n8n-chat-action-card">
		<N8nText v-if="input.card.title" :class="$style.title" bold>{{ input.card.title }}</N8nText>
		<N8nText v-if="input.card.message" :class="$style.message" color="text-base">
			{{ input.card.message }}
		</N8nText>
		<N8nText v-else-if="fallbackSummary" :class="$style.title" bold>
			{{ fallbackSummary }}
		</N8nText>

		<template v-for="(block, blockIdx) in blocks" :key="blockIdx">
			<div
				v-if="block.kind === 'buttons'"
				:class="$style.buttonRow"
				data-testid="n8n-chat-card-button-row"
			>
				<N8nButton
					v-for="(button, buttonIdx) in block.buttons"
					:key="buttonIdx"
					size="small"
					:variant="buttonVariant(button)"
					:disabled="disabled && !isButtonSelected(button)"
					data-testid="n8n-chat-card-button"
					@click="submitButton(button)"
				>
					{{ button.label ?? button.text ?? button.value }}
				</N8nButton>
			</div>

			<template v-else>
				<div
					v-if="
						block.component.type === 'section' && (block.component.text || block.component.button)
					"
					:class="$style.section"
				>
					<N8nText v-if="block.component.text">{{ block.component.text }}</N8nText>
					<N8nButton
						v-if="block.component.button"
						:class="$style.sectionButton"
						size="small"
						:variant="buttonVariant(block.component.button)"
						:disabled="disabled && !isButtonSelected(block.component.button)"
						data-testid="n8n-chat-card-section-button"
						@click="submitButton(block.component.button)"
					>
						{{
							block.component.button.label ??
							block.component.button.text ??
							block.component.button.value
						}}
					</N8nButton>
				</div>

				<hr v-else-if="block.component.type === 'divider'" :class="$style.divider" />

				<div v-else-if="block.component.type === 'radio_select'" :class="$style.selectGroup">
					<N8nText v-if="block.component.label" :class="$style.selectLabel" bold>
						{{ block.component.label }}
					</N8nText>
					<ElRadio
						v-for="option in block.component.options ?? []"
						:key="option.value"
						:class="$style.radio"
						:model-value="selectedOptionValue(block.component) ?? ''"
						:label="option.value"
						:disabled="disabled"
						data-testid="n8n-chat-card-radio"
						@update:model-value="submitOption(block.component, option.value)"
					>
						<span>{{ option.label }}</span>
						<N8nText v-if="option.description" size="xsmall" color="text-light">
							{{ option.description }}
						</N8nText>
					</ElRadio>
				</div>

				<div v-else-if="block.component.type === 'select'" :class="$style.selectGroup">
					<N8nText v-if="block.component.label" :class="$style.selectLabel" bold>
						{{ block.component.label }}
					</N8nText>
					<N8nSelect
						:model-value="selectedOptionValue(block.component)"
						size="small"
						:disabled="disabled"
						:placeholder="block.component.placeholder"
						data-testid="n8n-chat-card-select"
						@update:model-value="submitOption(block.component, $event)"
					>
						<N8nOption
							v-for="option in block.component.options ?? []"
							:key="option.value"
							:value="option.value"
							:label="option.label"
						/>
					</N8nSelect>
				</div>

				<div v-else-if="block.component.type === 'fields'" :class="$style.fieldsGroup">
					<div
						v-for="field in block.component.fields ?? block.component.items ?? []"
						:key="field.label"
						:class="$style.fieldRow"
					>
						<N8nText size="small" bold>{{ field.label }}</N8nText>
						<N8nText size="small">{{ field.value }}</N8nText>
					</div>
				</div>

				<img
					v-else-if="block.component.type === 'image' && block.component.url"
					:src="block.component.url"
					:alt="block.component.alt ?? block.component.altText ?? ''"
					:class="$style.image"
				/>
			</template>
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
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin-bottom: var(--spacing--4xs);
}

.sectionButton {
	align-self: flex-start;
}

.divider {
	border: none;
	border-top: var(--border-width, 1px) var(--border-style, solid) var(--border-color);
	margin: var(--spacing--3xs) 0;
}

.buttonRow {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--3xs);
}

.selectGroup {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.selectLabel {
	margin-bottom: var(--spacing--5xs);
}

.radio {
	margin-right: 0;
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
	/* The card is a stretching flex column — without align-self the image is
	   stretched to the card width, upscaling (pixelating) small images. */
	align-self: flex-start;
	max-width: 100%;
	height: auto;
	border-radius: var(--radius--sm);
}
</style>
