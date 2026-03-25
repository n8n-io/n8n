<script setup lang="ts">
import type { AgentIconOrEmoji } from '@n8n/api-types';
import { N8nButton, N8nIconPicker, N8nInput } from '@n8n/design-system';
import type { IconOrEmoji } from '@n8n/design-system/components/N8nIconPicker/types';
import { useI18n } from '@n8n/i18n';
import { nextTick, ref } from 'vue';

const MAX_PROMPTS = 6;
const DEFAULT_PROMPT_ICON: AgentIconOrEmoji = { type: 'icon', value: 'comment' };

const i18n = useI18n();

const prompts = defineModel<Array<{ text: string; icon?: AgentIconOrEmoji }>>({ required: true });
const inputRefs = ref<Array<InstanceType<typeof N8nInput> | null>>([]);

function addPrompt() {
	if (prompts.value.length >= MAX_PROMPTS) return;
	prompts.value = [...prompts.value, { text: '', icon: DEFAULT_PROMPT_ICON }];
	void nextTick(() => {
		inputRefs.value[prompts.value.length - 1]?.focus();
	});
}

function removePrompt(index: number) {
	prompts.value = prompts.value.filter((_, i) => i !== index);
}

function updateText(index: number, text: string) {
	prompts.value = prompts.value.map((p, i) => (i === index ? { ...p, text } : p));
}

function updateIcon(index: number, icon: IconOrEmoji) {
	prompts.value = prompts.value.map((p, i) =>
		i === index ? { ...p, icon: icon as AgentIconOrEmoji } : p,
	);
}

function onInputKeydown(event: KeyboardEvent, index: number) {
	if (event.key === 'Enter') {
		event.preventDefault();
		if (prompts.value[index].text.trim().length > 0) {
			addPrompt();
		}
	} else if (event.key === 'Backspace' && prompts.value[index].text === '') {
		event.preventDefault();
		removePrompt(index);
		if (index > 0) {
			void nextTick(() => {
				inputRefs.value[index - 1]?.focus();
			});
		}
	}
}
</script>

<template>
	<div :class="$style.container" class="suggested-prompts-editor">
		<div v-for="(prompt, index) in prompts" :key="index" :class="$style.row">
			<N8nIconPicker
				:model-value="(prompt.icon as IconOrEmoji) ?? (DEFAULT_PROMPT_ICON as IconOrEmoji)"
				:button-tooltip="i18n.baseText('chatHub.agent.editor.iconPicker.button.tooltip')"
				@update:model-value="updateIcon(index, $event)"
			/>
			<N8nInput
				:ref="
					(el: unknown) => {
						inputRefs[index] = el as InstanceType<typeof N8nInput>;
					}
				"
				:model-value="prompt.text"
				:placeholder="i18n.baseText('chatHub.agent.editor.suggestedPrompts.placeholder')"
				:maxlength="256"
				:class="$style.input"
				@update:model-value="updateText(index, $event)"
				@keydown="onInputKeydown($event, index)"
			/>
			<N8nButton
				variant="ghost"
				icon="x"
				size="small"
				data-testid="remove-prompt-button"
				@click="removePrompt(index)"
			/>
		</div>
		<N8nButton
			variant="subtle"
			icon="plus"
			size="small"
			:disabled="prompts.length >= MAX_PROMPTS"
			data-testid="add-prompt-button"
			@click="addPrompt"
		>
			{{ i18n.baseText('chatHub.agent.editor.suggestedPrompts.addButton') }}
		</N8nButton>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.input {
	flex: 1;
}
</style>

<style lang="scss">
/* Open icon picker popup upward so it doesn't get clipped by the modal's scrollable content */
.suggested-prompts-editor [data-test-id='icon-picker-popup'] {
	bottom: 100%;
	margin-top: 0;
	margin-bottom: var(--spacing--4xs);
}
</style>
