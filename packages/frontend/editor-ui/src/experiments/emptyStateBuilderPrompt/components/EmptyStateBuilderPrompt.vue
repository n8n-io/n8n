<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { N8nButton, N8nPromptInput } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { WORKFLOW_SUGGESTIONS } from '@/app/constants/workflowSuggestions';
import { VIEWS } from '@/app/constants/navigation';
import { useToast } from '@/app/composables/useToast';
import shuffle from 'lodash/shuffle';
import { useTypewriterPlaceholder } from '../composables/useTypewriterPlaceholder';
import { useEmptyStateBuilderPromptStore } from '../stores/emptyStateBuilderPrompt.store';

const props = defineProps<{
	projectId?: string;
	parentFolderId?: string;
}>();

const router = useRouter();
const toast = useToast();
const i18n = useI18n();
const emptyStateBuilderPromptStore = useEmptyStateBuilderPromptStore();

const emit = defineEmits<{
	submit: [prompt: string];
	startFromScratch: [];
}>();

const textInputValue = ref<string>('');
const promptInputRef = ref<InstanceType<typeof N8nPromptInput>>();
const importFileRef = ref<HTMLInputElement | null>(null);

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
	importFileRef.value?.click();
}

function handleFileImport() {
	const input = importFileRef.value;
	if (!input?.files?.length) return;

	const reader = new FileReader();
	reader.onload = async () => {
		let workflowData: unknown;

		try {
			workflowData = JSON.parse(reader.result as string);
		} catch {
			toast.showMessage({
				title: i18n.baseText('mainSidebar.showMessage.handleFileImport.title'),
				message: i18n.baseText('mainSidebar.showMessage.handleFileImport.message'),
				type: 'error',
			});
			input.value = '';
			return;
		}

		try {
			await emptyStateBuilderPromptStore.createWorkflowFromImport(
				workflowData,
				props.projectId,
				props.parentFolderId,
			);
		} catch {
			toast.showError(
				new Error(i18n.baseText('nodeView.couldntLoadWorkflow.invalidWorkflowObject')),
				i18n.baseText('nodeView.couldntImportWorkflow'),
			);
		} finally {
			input.value = '';
		}
	};
	reader.readAsText(input.files[0]);
}
</script>

<template>
	<div :class="$style.container">
		<input
			ref="importFileRef"
			type="file"
			accept=".json"
			style="display: none"
			@change="handleFileImport"
		/>
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
