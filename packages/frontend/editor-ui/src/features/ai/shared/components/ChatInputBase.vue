<script lang="ts" setup>
import { ref, useTemplateRef, watch } from 'vue';
import { N8nIconButton, N8nChatInput, N8nTooltip } from '@n8n/design-system';
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
const inputRef = useTemplateRef<InstanceType<typeof N8nChatInput>>('inputRef');
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

function focusInput() {
	inputRef.value?.focusInput();
}

function handleFileSelect(e: Event) {
	const target = e.target as HTMLInputElement;
	const files = target.files;
	if (!files || files.length === 0) return;
	emit('files-selected', Array.from(files));
	target.value = '';
	focusInput();
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
	if (e.key === 'Tab' && !e.shiftKey) {
		e.preventDefault();
		emit('tab');
	}
}

function handleSubmit() {
	if (!props.canSubmit) {
		return;
	}

	speechInput.stop();
	emit('submit');
}

defineExpose({
	focus: focusInput,
});
</script>

<template>
	<div :class="$style.inputWrapper" @paste="handlePaste" @keydown.capture="handleKeydown">
		<input
			v-if="showAttach"
			ref="fileInputRef"
			type="file"
			:class="$style.fileInput"
			:accept="acceptedMimeTypes"
			multiple
			@change="handleFileSelect"
		/>

		<N8nChatInput
			ref="inputRef"
			:model-value="modelValue"
			:placeholder="placeholder"
			:streaming="isStreaming"
			:disabled="disabled"
			:submit-disabled="!canSubmit"
			send-button-test-id="instance-ai-send-button"
			stop-button-test-id="instance-ai-stop-button"
			:autosize="autosize"
			:layout="autosize === false ? 'single-line' : 'multiline'"
			@update:model-value="emit('update:modelValue', $event)"
			@submit="handleSubmit"
			@stop="emit('stop')"
		>
			<template #leading>
				<slot name="attachments" />
			</template>
			<template #left-actions>
				<slot name="footer-start" />
			</template>
			<template #right-actions>
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
				<N8nTooltip
					v-if="showVoice && speechInput.isSupported"
					:content="i18n.baseText('chatInputBase.button.dictate')"
					placement="top"
				>
					<N8nIconButton
						variant="ghost"
						:disabled="disabled || isStreaming"
						:icon="speechInput.isListening.value ? 'square' : 'mic'"
						:class="{ [$style.recording]: speechInput.isListening.value }"
						icon-size="large"
						data-test-id="chat-input-voice-button"
						@click.stop="handleMic"
					/>
				</N8nTooltip>
			</template>
		</N8nChatInput>
	</div>
</template>

<style lang="scss" module>
.inputWrapper {
	width: 100%;
}

.fileInput {
	display: none;
}

.recording {
	color: var(--color--danger);
}
</style>
