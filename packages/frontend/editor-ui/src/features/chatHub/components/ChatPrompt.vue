<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';
import { ref, useTemplateRef } from 'vue';

const { disabled, sessionId } = defineProps<{
	placeholder: string;
	disabled: boolean;
	sessionId: string;
}>();

const emit = defineEmits<{
	submit: [string];
}>();

const inputRef = useTemplateRef('inputRef');
const message = ref('');

function onAttach() {}

function onMic() {}

defineExpose({
	focus: () => inputRef.value?.focus(),
	setText: (text: string) => {
		message.value = text;
	},
});
</script>

<template>
	<form :class="$style.prompt" @submit.prevent="emit('submit', message)">
		<div :class="$style.inputWrap">
			<input
				ref="inputRef"
				v-model="message"
				:class="$style.input"
				type="text"
				:placeholder="placeholder"
				autocomplete="off"
				autofocus
				:disabled="disabled"
			/>

			<div :class="$style.actions">
				<button
					:class="$style.iconBtn"
					type="button"
					title="Attach"
					:disabled="disabled"
					@click="onAttach"
				>
					<N8nIcon icon="paperclip" width="20" height="20" />
				</button>
				<button
					:class="$style.iconBtn"
					type="button"
					title="Voice"
					:disabled="disabled"
					@click="onMic"
				>
					<N8nIcon icon="mic" width="20" height="20" />
				</button>
				<button :class="$style.sendBtn" type="submit" :disabled="disabled || !message.trim()">
					<span v-if="!disabled">Send</span>
					<span v-else>…</span>
				</button>
			</div>
		</div>
		<N8nText :class="$style.disclaimer" color="text-light" size="small">
			AI may make mistakes. Check important info.
			<br />
			{{ sessionId }}
		</N8nText>
	</form>
</template>

<style lang="scss" module>
.prompt {
	display: grid;
	place-items: center;
}

.inputWrap {
	position: relative;
	display: flex;
	align-items: center;
	width: 100%;

	& input:disabled {
		cursor: not-allowed;
	}
}

.input {
	flex: 1;
	font: inherit;
	padding: 14px 112px 14px 14px;
	border: 1px solid var(--color--foreground);
	background: var(--color--background--light-2);
	color: var(--color--text--shade-1);
	border-radius: 16px;
	outline: none;
}

.input:focus {
	border-color: var(--color--primary);
	box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
}

/* Right-side actions */
.actions {
	position: absolute;
	right: 8px;
	top: 50%;
	transform: translateY(-50%);
	display: flex;
	align-items: center;
	gap: 6px;
}

.iconBtn {
	display: grid;
	place-items: center;
	width: 32px;
	height: 32px;
	border-radius: 10px;
	border: none;
	background: transparent;
	color: var(--color--text--tint-1);
	cursor: pointer;
}

.iconBtn:hover {
	background: rgba(0, 0, 0, 0.04);
	color: var(--color--text--shade-1);
}

.sendBtn {
	height: 32px;
	padding: 0 10px;
	border-radius: 10px;
	border: none;
	background: var(--color--primary);
	color: #fff;
	font-weight: 600;
	cursor: pointer;
}

.sendBtn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.disclaimer {
	margin-top: var(--spacing--xs);
	color: var(--color--text--tint-2);
	text-align: center;
}
</style>
