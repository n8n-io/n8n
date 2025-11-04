<script setup lang="ts">
import { useToast } from '@/app/composables/useToast';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { providerDisplayNames } from '@/features/ai/chatHub/constants';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { ChatHubLLMProvider, ChatModelDto } from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nIconButton, N8nInput, N8nText } from '@n8n/design-system';
import { useSpeechRecognition } from '@vueuse/core';
import type { INode } from 'n8n-workflow';
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue';

const { selectedModel, selectedTools, isMissingCredentials } = defineProps<{
	isResponding: boolean;
	isNewSession: boolean;
	selectedModel: ChatModelDto | null;
	selectedTools: INode[] | null;
	isMissingCredentials: boolean;
}>();

const emit = defineEmits<{
	submit: [string];
	stop: [];
	selectModel: [];
	selectTools: [];
	setCredentials: [ChatHubLLMProvider];
}>();

const inputRef = useTemplateRef<HTMLElement>('inputRef');
const message = ref('');

const nodeTypesStore = useNodeTypesStore();
const toast = useToast();

const speechInput = useSpeechRecognition({
	continuous: true,
	interimResults: true,
	lang: navigator.language,
});

const placeholder = computed(() =>
	selectedModel ? `Message ${selectedModel.name ?? 'a model'}...` : 'Select a model',
);

const llmProvider = computed<ChatHubLLMProvider | undefined>(() =>
	selectedModel?.model.provider === 'n8n' || selectedModel?.model.provider === 'custom-agent'
		? undefined
		: selectedModel?.model.provider,
);

function onMic() {
	if (speechInput.isListening.value) {
		speechInput.stop();
	} else {
		speechInput.start();
	}
}

function onStop() {
	emit('stop');
}

function handleSubmitForm() {
	const trimmed = message.value.trim();

	if (trimmed) {
		speechInput.stop();
		emit('submit', trimmed);
	}
}

function handleKeydownTextarea(e: KeyboardEvent) {
	const trimmed = message.value.trim();

	if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && trimmed) {
		e.preventDefault();
		speechInput.stop();
		emit('submit', trimmed);
	}
}

watch(speechInput.result, (spoken) => {
	if (spoken) {
		message.value = spoken;
	}
});

watch(speechInput.error, (event) => {
	if (event?.error === 'not-allowed') {
		toast.showError(
			new Error('Microphone access denied'),
			'Please allow microphone access to use voice input',
		);
		return;
	}

	if (event?.error === 'no-speech') {
		toast.showMessage({
			title: 'No speech detected. Please try again',
			type: 'warning',
		});
	}
});

function onSelectTools() {
	emit('selectTools');
}

onMounted(async () => {
	await nodeTypesStore.loadNodeTypesIfNotLoaded();
});

const toolCount = computed(() => selectedTools?.length ?? 0);

const displayToolNodeTypes = computed(() => {
	const tools = selectedTools ?? [];
	return tools
		.slice(0, 3)
		.map((t) => nodeTypesStore.getNodeType(t.type))
		.filter(Boolean);
});

const toolsLabel = computed(() =>
	toolCount.value > 0 ? `${toolCount.value} Tool${toolCount.value > 1 ? 's' : ''}` : 'Tools',
);

defineExpose({
	focus: () => inputRef.value?.focus(),
	setText: (text: string) => {
		message.value = text;
	},
});
</script>

<template>
	<form :class="$style.prompt" @submit.prevent="handleSubmitForm">
		<div :class="$style.inputWrap">
			<N8nText v-if="!selectedModel" :class="$style.callout">
				<template v-if="isNewSession">
					Please <a href="" @click.prevent="emit('selectModel')">select a model</a> to start a
					conversation
				</template>
				<template v-else>
					Please <a href="" @click.prevent="emit('selectModel')">reselect a model</a> to continue
					the conversation
				</template>
			</N8nText>
			<N8nText v-else-if="isMissingCredentials && llmProvider" :class="$style.callout">
				<template v-if="isNewSession">
					Please
					<a href="" @click.prevent="emit('setCredentials', llmProvider)"> set credentials </a>
					for {{ providerDisplayNames[llmProvider] }} to start a conversation
				</template>
				<template v-else>
					Please
					<a href="" @click.prevent="emit('setCredentials', llmProvider)"> set credentials </a>
					for {{ providerDisplayNames[llmProvider] }} to continue the conversation
				</template>
			</N8nText>
			<N8nInput
				ref="inputRef"
				v-model="message"
				:class="$style.input"
				type="textarea"
				:placeholder="placeholder"
				autocomplete="off"
				:autosize="{ minRows: 1, maxRows: 6 }"
				autofocus
				:disabled="isMissingCredentials || !selectedModel"
				@keydown="handleKeydownTextarea"
			/>

			<div :class="$style.tools">
				<N8nButton
					:class="$style.toolsButton"
					:disabled="isMissingCredentials || !selectedModel || isResponding"
					aria-label="Select tools"
					@click="onSelectTools"
				>
					<span v-if="toolCount" :class="$style.iconStack" aria-hidden="true">
						<NodeIcon
							v-for="(nodeType, i) in displayToolNodeTypes"
							:key="`${nodeType?.name}-${i}`"
							:style="{ zIndex: displayToolNodeTypes.length - i }"
							:node-type="nodeType"
							:class="[$style.icon, { [$style.iconOverlap]: i !== 0 }]"
							:circle="true"
							:size="12"
						/>
					</span>
					<span v-else :class="$style.iconFallback" aria-hidden="true">
						<N8nIcon icon="plus" :size="12" />
					</span>

					<N8nText size="small" bold>{{ toolsLabel }}</N8nText>
				</N8nButton>
			</div>

			<div :class="$style.actions">
				<!-- TODO: Implement attachments
				<N8nIconButton
					native-type="button"
					type="secondary"
					title="Attach"
					:disabled="isMissingCredentials || !selectedModel || isResponding"
					icon="paperclip"
					icon-size="large"
					text
					@click="onAttach"
				/> -->
				<N8nIconButton
					v-if="speechInput.isSupported"
					native-type="button"
					:title="speechInput.isListening.value ? 'Stop recording' : 'Voice input'"
					type="secondary"
					:disabled="isMissingCredentials || !selectedModel || isResponding"
					:icon="speechInput.isListening.value ? 'square' : 'mic'"
					:class="{ [$style.recording]: speechInput.isListening.value }"
					icon-size="large"
					@click="onMic"
				/>
				<N8nIconButton
					v-if="!isResponding"
					native-type="submit"
					:disabled="isMissingCredentials || !selectedModel || !message.trim()"
					title="Send"
					icon="arrow-up"
					icon-size="large"
				/>
				<N8nIconButton
					v-else
					native-type="button"
					title="Stop generating"
					icon="square"
					icon-size="large"
					@click="onStop"
				/>
			</div>
		</div>
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
	flex-direction: column;
	width: 100%;
}

.callout {
	color: var(--color--secondary);
	background-color: hsla(247, 49%, 53%, 0.1);
	padding: 12px 16px 24px;
	border-top-left-radius: 16px;
	border-top-right-radius: 16px;
	width: 100%;
	border: var(--border);
	border-color: var(--color--secondary);
	text-align: center;
	margin-bottom: -16px;

	& a {
		text-decoration: underline;
		color: inherit;
	}
}

.input {
	& textarea {
		font: inherit;
		line-height: 1.5em;
		border-radius: 16px !important;
		resize: none;
		padding: 16px 16px 64px;
		box-shadow: 0 10px 24px 0 #00000010;
		background-color: var(--color--background--light-3);
	}
}

.tools {
	position: absolute;
	left: 0;
	bottom: 0;
	padding: var(--spacing--sm);
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.toolsButton {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--xs);
	color: var(--color--text);
	cursor: pointer;

	border-radius: var(--radius);
	border: var(--border);
	background: var(--color--background--light-3);

	&:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
}

.iconStack {
	display: flex;
	align-items: center;
	position: relative;
}

.icon {
	padding: var(--spacing--4xs);
	background-color: var(--button--color--background--secondary);
	border-radius: 50%;
	outline: 2px var(--color--background--light-3) solid;
}

.iconOverlap {
	margin-left: -6px;
}

.iconFallback {
	display: flex;
	align-items: center;
	justify-content: center;
}

/* Right-side actions */
.actions {
	position: absolute;
	right: 0;
	bottom: 0;
	padding: var(--spacing--sm);
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);

	& button path {
		stroke-width: 2.5;
	}
}

.recording {
	animation: chatHubPromptRecordingPulse 1.5s ease-in-out infinite;
}

@keyframes chatHubPromptRecordingPulse {
	0%,
	100% {
		opacity: 1;
	}
	50% {
		opacity: 0.6;
	}
}
</style>
