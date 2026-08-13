<script lang="ts" setup>
import { computed, ref, useTemplateRef, watch } from 'vue';
import {
	base64EncodedSize,
	exceedsAttachmentSizeLimit,
	formatAttachmentSizeLimit,
	formatTotalAttachmentSizeLimit,
	MAX_TOTAL_ATTACHMENT_BASE64_BYTES,
} from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
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
		/**
		 * Base64-encoded size of the files already staged in the composer. Needed
		 * because the combined budget spans the whole message, not just the batch being
		 * added, and this component does not own the attachment list.
		 *
		 * Encoded rather than raw: base64 pads each file up to a multiple of 4, so
		 * encoding a raw total undercounts the real payload and would let through a
		 * batch the backend then rejects.
		 */
		attachedEncodedBytes?: number;
		autosize?: boolean | { minRows: number; maxRows: number };
		buttonLabel?: string;
		// Send button turns active only while focused with text (default: follows canSubmit).
		activeRequiresFocus?: boolean;
		maxLength?: number;
	}>(),
	{
		placeholder: undefined,
		acceptedMimeTypes: undefined,
		attachedEncodedBytes: 0,
		autosize: () => ({ minRows: 2, maxRows: 6 }),
		buttonLabel: undefined,
		activeRequiresFocus: false,
		maxLength: undefined,
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
const toast = useToast();
const inputRef = useTemplateRef<InstanceType<typeof N8nChatInput>>('inputRef');
const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef');
const isFocused = ref(false);

// Visual only — must NOT gate `submit-disabled`, or clicking the button (which
// blurs the textarea) would disable it mid-click and swallow the submit.
const submitMuted = computed(() => props.activeRequiresFocus && !isFocused.value);

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

/**
 * Keep the files the backend will accept and warn about the rest.
 *
 * Checked here only so the user finds out before uploading megabytes — the backend
 * enforces the same limits authoritatively. Both checks convert to the encoded size
 * first: the limits are denominated in base64 bytes, so comparing `File.size` against
 * them directly would admit files ~4/3 too large.
 */
function withinSizeLimit(files: File[]): File[] {
	const oversized = files.filter((file) => exceedsAttachmentSizeLimit(file.size));
	if (oversized.length > 0) {
		toast.showError(
			new Error(
				i18n.baseText('chat.attachment.tooLarge.message', {
					interpolate: {
						fileNames: oversized.map((file) => file.name).join(', '),
						limit: formatAttachmentSizeLimit(),
					},
				}),
			),
			i18n.baseText('chat.attachment.tooLarge.title'),
		);
	}

	// Take files in order while they still fit the message-wide budget, so a partial
	// selection still goes through rather than failing the batch wholesale.
	let usedBytes = props.attachedEncodedBytes;
	const accepted: File[] = [];
	let droppedForBudget = false;

	for (const file of files) {
		if (exceedsAttachmentSizeLimit(file.size)) continue;
		const encoded = base64EncodedSize(file.size);
		if (usedBytes + encoded > MAX_TOTAL_ATTACHMENT_BASE64_BYTES) {
			droppedForBudget = true;
			continue;
		}
		usedBytes += encoded;
		accepted.push(file);
	}

	if (droppedForBudget) {
		toast.showError(
			new Error(
				i18n.baseText('chat.attachment.totalTooLarge.message', {
					interpolate: { limit: formatTotalAttachmentSizeLimit() },
				}),
			),
			i18n.baseText('chat.attachment.totalTooLarge.title'),
		);
	}

	return accepted;
}

function handleFileSelect(e: Event) {
	const target = e.target as HTMLInputElement;
	const files = target.files;
	if (!files || files.length === 0) return;
	const accepted = withinSizeLimit(Array.from(files));
	if (accepted.length > 0) emit('files-selected', accepted);
	target.value = '';
	focusInput();
}

function handlePaste(e: ClipboardEvent) {
	if (!props.showAttach || !e.clipboardData?.files.length) return;

	const files = Array.from(e.clipboardData.files);
	if (files.length > 0) {
		e.preventDefault();
		const accepted = withinSizeLimit(files);
		if (accepted.length > 0) emit('files-selected', accepted);
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
	<div
		:class="[
			$style.inputWrapper,
			{ [$style.focusGatedSubmit]: activeRequiresFocus, [$style.submitMuted]: submitMuted },
		]"
		@paste="handlePaste"
		@keydown.capture="handleKeydown"
	>
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
			:button-label="props.buttonLabel"
			send-button-test-id="instance-ai-send-button"
			stop-button-test-id="instance-ai-stop-button"
			:autosize="autosize"
			:layout="autosize === false ? 'single-line' : 'multiline'"
			:max-length="maxLength"
			@update:model-value="emit('update:modelValue', $event)"
			@submit="handleSubmit"
			@stop="emit('stop')"
			@focus="isFocused = true"
			@blur="isFocused = false"
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

/* Split empty state: de-emphasise the send button until the composer is focused.
   Visual only — the button stays enabled so the click still submits. */
.focusGatedSubmit [data-test-id='instance-ai-send-button'] {
	transition: opacity 0.15s ease;
}

.submitMuted [data-test-id='instance-ai-send-button'] {
	opacity: 0.5;
}
</style>
