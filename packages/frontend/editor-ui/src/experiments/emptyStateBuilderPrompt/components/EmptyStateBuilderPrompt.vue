<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { N8nButton, N8nPromptInput } from '@n8n/design-system';
import { WORKFLOW_SUGGESTIONS } from '@/app/constants/workflowSuggestions';
import { VIEWS } from '@/app/constants/navigation';
import { nodeViewEventBus } from '@/app/event-bus';
import shuffle from 'lodash/shuffle';
import { useTypewriterPlaceholder } from '../composables/useTypewriterPlaceholder';

const router = useRouter();

const emit = defineEmits<{
	submit: [prompt: string];
	startFromScratch: [];
}>();

const textInputValue = ref<string>('');
const promptInputRef = ref<InstanceType<typeof N8nPromptInput>>();

const shuffledSuggestions = computed(() => {
	return shuffle(WORKFLOW_SUGGESTIONS).slice(0, 6);
});

const isInputEmpty = computed(() => textInputValue.value.length === 0);

const { placeholder } = useTypewriterPlaceholder(shuffledSuggestions, isInputEmpty);

function onSubmit() {
	if (!textInputValue.value.trim()) return;
	emit('submit', textInputValue.value);
}

function onFromScratch() {
	emit('startFromScratch');
}

function onTemplate() {
	void router.push({ name: VIEWS.TEMPLATES });
}

function onImportFromFile() {
	nodeViewEventBus.emit('importWorkflowFromFile');
}
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.promptInput">
			<N8nPromptInput
				ref="promptInputRef"
				v-model="textInputValue"
				:placeholder="placeholder"
				:min-lines="4"
				button-label="Build workflow"
				data-test-id="empty-state-builder-prompt-input"
				autofocus
				@submit="onSubmit"
			/>
		</div>
		<div :class="$style.footer">
			<div :class="$style.divider" />
			<div :class="$style.alternativeActions">
				<span :class="$style.startWithText">start with</span>
				<N8nButton type="secondary" size="small" @click="onFromScratch"> From Scratch </N8nButton>
				<N8nButton type="secondary" size="small" @click="onTemplate"> Template </N8nButton>
				<N8nButton type="secondary" size="small" @click="onImportFromFile">
					Import from file
				</N8nButton>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--lg);
	width: 100%;
}

.promptInput {
	width: 100%;
	max-width: 700px;

	:deep(.el-tooltip__trigger) {
		width: 100%;
		display: block;
	}
}

.footer {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--lg);
}

.divider {
	width: 390px;
	border-top: var(--border);
}

.alternativeActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	flex-wrap: wrap;
	justify-content: center;
}

.startWithText {
	font-size: var(--font-size--xs);
	color: var(--color--text--tint-1);
}
</style>
