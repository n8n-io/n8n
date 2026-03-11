<script lang="ts" setup>
import { ref, useTemplateRef } from 'vue';
import { N8nIconButton, N8nInput } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

defineProps<{
	modelValue: string;
	placeholder?: string;
	isStreaming: boolean;
	canSubmit: boolean;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: string];
	submit: [];
	stop: [];
	tab: [];
}>();

const i18n = useI18n();
const inputRef = useTemplateRef<HTMLElement>('inputRef');
const isFocused = ref(false);

function handleKeydown(e: KeyboardEvent) {
	if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
		e.preventDefault();
		emit('submit');
	} else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
		e.preventDefault();
		emit('submit');
	} else if (e.key === 'Tab' && !e.shiftKey) {
		e.preventDefault();
		emit('tab');
	}
}

function handleClickWrapper() {
	inputRef.value?.focus();
}

defineExpose({
	focus: () => inputRef.value?.focus(),
});
</script>

<template>
	<div :class="[$style.inputWrapper, { [$style.focused]: isFocused }]" @click="handleClickWrapper">
		<N8nInput
			ref="inputRef"
			:model-value="modelValue"
			type="textarea"
			:placeholder="placeholder"
			autocomplete="off"
			:autosize="{ minRows: 1, maxRows: 6 }"
			:disabled="disabled"
			@update:model-value="emit('update:modelValue', $event)"
			@keydown="handleKeydown"
			@focus="isFocused = true"
			@blur="isFocused = false"
		/>

		<div :class="$style.footer">
			<div :class="$style.footerStart">
				<slot name="footer-start" />
			</div>
			<div :class="$style.actions">
				<N8nIconButton
					v-if="isStreaming"
					native-type="button"
					:title="i18n.baseText('instanceAi.input.stop')"
					icon="square"
					icon-size="large"
					data-test-id="instance-ai-stop-button"
					@click.stop="emit('stop')"
				/>
				<N8nIconButton
					v-else
					native-type="button"
					:disabled="!canSubmit"
					:title="i18n.baseText('instanceAi.input.send')"
					icon="arrow-up"
					icon-size="large"
					data-test-id="instance-ai-send-button"
					@click.stop="emit('submit')"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.inputWrapper {
	width: 100%;
	border-radius: 16px;
	padding: 16px;
	box-shadow: 0 10px 24px 0 #00000010;
	background-color: var(--color--background--light-3);
	border: none;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	transition: border-color 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
	--input--border-color: transparent;
	--input--border-color--hover: transparent;
	--input--border-color--focus: transparent;
	--input--color--background: transparent;

	&.focused,
	&:hover:has(textarea:not(:disabled)) {
		border-color: var(--color--secondary);
	}

	& textarea {
		font-size: var(--font-size--md);
		line-height: 1.5em;
		resize: none;
		padding: 0 !important;
	}

	:global(.n8n-input) > div {
		padding: 0;
	}
}

.footer {
	display: flex;
	align-items: flex-end;
	justify-content: flex-end;
	gap: var(--spacing--sm);
}

.footerStart {
	flex-grow: 1;
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);

	& button path {
		stroke-width: 2.5;
	}
}
</style>
