<script lang="ts" setup>
import { ref, useTemplateRef, watch } from 'vue';
import { N8nIconButton, N8nInput, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSpeechRecognition } from '@vueuse/core';

const props = withDefaults(
	defineProps<{
		modelValue: string;
		placeholder?: string;
		isStreaming: boolean;
		canSubmit: boolean;
		disabled?: boolean;
		showVoice?: boolean;
		showAttach?: boolean;
		acceptedMimeTypes?: string;
		autosize?: boolean | { minRows: number; maxRows: number };
	}>(),
	{
		placeholder: undefined,
		acceptedMimeTypes: undefined,
		autosize: () => ({ minRows: 2, maxRows: 6 }),
	},
);

const emit = defineEmits<{
	'update:modelValue': [value: string];
	submit: [];
	stop: [];
	tab: [];
	'files-selected': [files: File[]];
}>();

const i18n = useI18n();
const inputRef = useTemplateRef<HTMLElement>('inputRef');
const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef');

// Voice input
const committedSpokenMessage = ref('');
const speechInput = useSpeechRecognition({
	continuous: true,
	interimResults: true,
	lang: navigator.language,
});

watch(speechInput.result, (spoken) => {
	if (props.showVoice) {
		const prefix = committedSpokenMessage.value;
		const separator = prefix.length > 0 ? ' ' : '';
		emit('update:modelValue', prefix + separator + spoken.trimStart());
	}
});

watch(
	speechInput.isFinal,
	(final) => {
		if (final && props.showVoice) {
			committedSpokenMessage.value = props.modelValue;
		}
	},
	{ flush: 'post' },
);

function handleMic() {
	committedSpokenMessage.value = props.modelValue;
	if (speechInput.isListening.value) {
		speechInput.stop();
	} else {
		speechInput.start();
	}
}

function handleAttach() {
	fileInputRef.value?.click();
}

function handleFileSelect(e: Event) {
	const target = e.target as HTMLInputElement;
	const files = target.files;
	if (!files || files.length === 0) return;
	emit('files-selected', Array.from(files));
	target.value = '';
	inputRef.value?.focus();
}

function handlePaste(e: ClipboardEvent) {
	if (!props.showAttach || !e.clipboardData?.files.length) return;

	const files = Array.from(e.clipboardData.files);
	if (files.length > 0) {
		e.preventDefault();
		emit('files-selected', files);
	}
}

function handleKeydown(e: KeyboardEvent) {
	if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
		e.preventDefault();
		speechInput.stop();
		emit('submit');
	} else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
		e.preventDefault();
		speechInput.stop();
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
	<div :class="$style.inputWrapper" @click="handleClickWrapper" @paste="handlePaste">
		<input
			v-if="showAttach"
			ref="fileInputRef"
			type="file"
			:class="$style.fileInput"
			:accept="acceptedMimeTypes"
			multiple
			@change="handleFileSelect"
		/>

		<slot name="attachments" />
		<N8nInput
			ref="inputRef"
			:model-value="modelValue"
			type="textarea"
			:placeholder="placeholder"
			autocomplete="off"
			:autosize="autosize"
			:disabled="disabled"
			@update:model-value="emit('update:modelValue', $event)"
			@keydown="handleKeydown"
		/>

		<div :class="$style.footer">
			<div :class="$style.footerStart">
				<slot name="footer-start" />
			</div>
			<div :class="$style.actions">
				<N8nTooltip
					v-if="showAttach"
					:content="i18n.baseText('chatInputBase.button.attach')"
					placement="top"
				>
					<N8nIconButton
						variant="ghost"
						:disabled="disabled || isStreaming"
						icon="paperclip"
						icon-size="large"
						data-test-id="chat-input-attach-button"
						@click.stop="handleAttach"
					/>
				</N8nTooltip>
				<N8nIconButton
					v-if="showVoice && speechInput.isSupported"
					variant="ghost"
					:disabled="disabled || isStreaming"
					:icon="speechInput.isListening.value ? 'square' : 'mic'"
					:class="{ [$style.recording]: speechInput.isListening.value }"
					icon-size="large"
					data-test-id="chat-input-voice-button"
					@click.stop="handleMic"
				/>
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
	border-radius: var(--radius--xl);
	padding: var(--spacing--sm);
	box-shadow: 0 10px 24px 0 color-mix(in srgb, var(--color--foreground--shade-2) 6%, transparent);
	background-color: var(--color--background--light-2);
	border: 1px solid light-dark(var(--color--black-alpha-200), var(--color--white-alpha-100));
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	outline: 1px solid transparent;
	outline-offset: 2px;

	&:focus-within {
		outline-color: var(--focus--border-color);
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

	:global(.n8n-input__wrapper) {
		--input--radius: var(--radius--xl);
		box-shadow: none !important;
		outline: none !important;
		background-color: transparent !important;
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

.fileInput {
	display: none;
}

.recording {
	animation: chatInputRecordingPulse 1.5s ease-in-out infinite;
}

@keyframes chatInputRecordingPulse {
	0%,
	100% {
		opacity: 1;
	}

	50% {
		opacity: 0.6;
	}
}
</style>
