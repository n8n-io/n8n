<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { N8nButton, N8nPromptInput, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { WORKFLOW_SUGGESTIONS } from '../constants';
import { VIEWS } from '@/app/constants/navigation';
import { useToast } from '@/app/composables/useToast';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { TemplateClickSource, trackTemplatesClick } from '@/experiments/utils';
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
const telemetry = useTelemetry();
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
	telemetry.track('User clicked from scratch in empty state');
	emit('startFromScratch');
}

function onTemplate() {
	trackTemplatesClick(TemplateClickSource.emptyStateBuilderPrompt);
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
		const result = reader.result;
		if (typeof result !== 'string') {
			input.value = '';
			return;
		}

		let workflowData: unknown;

		try {
			workflowData = JSON.parse(result);
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
		<p :class="$style.subtitle">{{ i18n.baseText('emptyStateBuilderPrompt.subtitle') }}</p>
		<div :class="$style.promptInput">
			<N8nPromptInput
				ref="promptInputRef"
				v-model="textInputValue"
				:placeholder="placeholder"
				:min-lines="4"
				:button-label="i18n.baseText('emptyStateBuilderPrompt.buildWorkflow')"
				data-test-id="empty-state-builder-prompt-input"
				autofocus
				@submit="onSubmit"
			/>
		</div>
		<div :class="$style.footer">
			<div :class="$style.alternativeActions">
				<span :class="$style.startWithText">{{
					i18n.baseText('emptyStateBuilderPrompt.orStartWith')
				}}</span>
				<N8nTooltip :content="i18n.baseText('emptyStateBuilderPrompt.fromScratchTooltip')">
					<N8nButton variant="subtle" size="small" icon="play" @click="onFromScratch">
						{{ i18n.baseText('emptyStateBuilderPrompt.fromScratch') }}
					</N8nButton>
				</N8nTooltip>
				<N8nTooltip :content="i18n.baseText('emptyStateBuilderPrompt.templateTooltip')">
					<N8nButton variant="subtle" size="small" icon="layout-template" @click="onTemplate">
						{{ i18n.baseText('emptyStateBuilderPrompt.template') }}
					</N8nButton>
				</N8nTooltip>
				<N8nTooltip :content="i18n.baseText('emptyStateBuilderPrompt.importFromFileTooltip')">
					<N8nButton variant="subtle" size="small" icon="upload" @click="onImportFromFile">
						{{ i18n.baseText('emptyStateBuilderPrompt.importFromFile') }}
					</N8nButton>
				</N8nTooltip>
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

.subtitle {
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-1);
	margin: 0;
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
	margin-top: var(--spacing--lg);
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
