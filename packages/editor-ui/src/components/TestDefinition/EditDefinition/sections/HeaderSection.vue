<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import EvaluationHeader from '@/components/TestDefinition/EditDefinition/EvaluationHeader.vue';
import DescriptionInput from '@/components/TestDefinition/EditDefinition/DescriptionInput.vue';
import type { EditableField, EditableFormState } from '@/components/TestDefinition/types';
import type { INodeParameterResourceLocator } from 'n8n-workflow';

const props = defineProps<{
	hasRuns: boolean;
	isSaving: boolean;
	hasIssues: (key: string) => boolean;
	startEditing: <T extends keyof EditableFormState>(field: T) => void;
	saveChanges: <T extends keyof EditableFormState>(field: T) => void;
	handleKeydown: <T extends keyof EditableFormState>(event: KeyboardEvent, field: T) => void;
	onSaveTest: () => Promise<void>;
	runTest: () => Promise<void>;
	showConfig: boolean;
	toggleConfig: () => void;
	showRunTestButton?: boolean;
}>();

const name = defineModel<EditableField<string>>('name', { required: true });
const description = defineModel<EditableField<string>>('description', { required: true });

const locale = useI18n();
</script>

<template>
	<div :class="$style.headerSection">
		<div :class="$style.headerMeta">
			<div :class="$style.name">
				<EvaluationHeader
					v-model="name"
					:class="{ 'has-issues': hasIssues('name') }"
					:start-editing="startEditing"
					:save-changes="saveChanges"
					:handle-keydown="handleKeydown"
				/>
				<div :class="$style.lastSaved">
					<template v-if="isSaving">
						{{ locale.baseText('testDefinition.edit.saving') }}
					</template>
					<template v-else> {{ locale.baseText('testDefinition.edit.saved') }} </template>
				</div>
			</div>
			<DescriptionInput
				v-model="description"
				:start-editing="startEditing"
				:save-changes="saveChanges"
				:handle-keydown="handleKeydown"
				:class="$style.descriptionInput"
			/>
		</div>
		<div :class="$style.controls">
			<N8nButton
				v-if="props.hasRuns"
				size="small"
				:icon="showConfig ? 'eye-slash' : 'eye'"
				data-test-id="toggle-config-button"
				:label="
					showConfig
						? locale.baseText('testDefinition.edit.hideConfig')
						: locale.baseText('testDefinition.edit.showConfig')
				"
				type="tertiary"
				@click="toggleConfig"
			/>
			<N8nButton
				v-if="showRunTestButton"
				:class="$style.runTestButton"
				size="small"
				data-test-id="run-test-button"
				:label="locale.baseText('testDefinition.runTest')"
				type="primary"
				@click="runTest"
			/>
			<N8nButton
				v-else
				:class="$style.runTestButton"
				size="small"
				data-test-id="run-test-button"
				:label="locale.baseText('testDefinition.edit.saveTest')"
				type="primary"
				@click="onSaveTest"
			/>
		</div>
	</div>
</template>

<style module lang="scss">
.headerSection {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	background-color: var(--color-background-light);
	width: 100%;
}

.headerMeta {
	max-width: 50%;
}

.name {
	display: flex;
	align-items: center;

	.lastSaved {
		font-size: var(--font-size-s);
		color: var(--color-text-light);
	}
}

.descriptionInput {
	margin-top: var(--spacing-2xs);
}

.controls {
	display: flex;
	gap: var(--spacing-s);
}
</style>
