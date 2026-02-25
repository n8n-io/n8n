<script lang="ts" setup>
import { ref, computed } from 'vue';
import { N8nIconButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const props = defineProps<{
	isStreaming: boolean;
}>();

const emit = defineEmits<{
	submit: [message: string];
	stop: [];
}>();

const i18n = useI18n();
const inputText = ref('');

const canSend = computed(() => inputText.value.trim().length > 0 && !props.isStreaming);

function handleSubmit() {
	const text = inputText.value.trim();
	if (!text || props.isStreaming) return;
	emit('submit', text);
	inputText.value = '';
}

function handleKeydown(event: KeyboardEvent) {
	if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
		event.preventDefault();
		handleSubmit();
	}
}

function handleStop() {
	emit('stop');
}
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.inputWrapper">
			<textarea
				ref="textarea"
				v-model="inputText"
				:class="$style.textarea"
				:placeholder="i18n.baseText('instanceAi.input.placeholder')"
				rows="1"
				@keydown="handleKeydown"
			/>
			<div :class="$style.actions">
				<N8nIconButton
					v-if="props.isStreaming"
					icon="square"
					type="secondary"
					size="small"
					:title="i18n.baseText('instanceAi.input.stop') as string"
					@click="handleStop"
				/>
				<N8nIconButton
					v-else
					icon="arrow-up"
					type="primary"
					size="small"
					:disabled="!canSend"
					:title="i18n.baseText('instanceAi.input.send') as string"
					@click="handleSubmit"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	padding: var(--spacing--xs) var(--spacing--sm);
	border-top: var(--border);
	background: var(--color--background);
}

.inputWrapper {
	display: flex;
	align-items: flex-end;
	gap: var(--spacing--2xs);
	background: var(--color--foreground--tint-2);
	border: var(--border);
	border-radius: var(--radius--lg);
	padding: var(--spacing--2xs) var(--spacing--xs);
}

.textarea {
	flex: 1;
	border: none;
	background: transparent;
	resize: none;
	font-family: var(--font-family);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	color: var(--color--text);
	outline: none;
	min-height: 24px;
	max-height: 200px;
	overflow-y: auto;

	&::placeholder {
		color: var(--color--text--tint-2);
	}
}

.actions {
	display: flex;
	align-items: center;
	flex-shrink: 0;
}
</style>
