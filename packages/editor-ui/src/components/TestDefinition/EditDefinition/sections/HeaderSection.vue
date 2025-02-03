<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import TestNameInput from '@/components/TestDefinition/EditDefinition/TestNameInput.vue';
import DescriptionInput from '@/components/TestDefinition/EditDefinition/DescriptionInput.vue';
import type { EditableField, EditableFormState } from '@/components/TestDefinition/types';
import { computed } from 'vue';

const props = defineProps<{
	hasRuns: boolean;
	isSaving: boolean;
	showConfig: boolean;
	runTestEnabled: boolean;
	startEditing: <T extends keyof EditableFormState>(field: T) => void;
	saveChanges: <T extends keyof EditableFormState>(field: T) => void;
	handleKeydown: <T extends keyof EditableFormState>(event: KeyboardEvent, field: T) => void;
	onSaveTest: () => Promise<void>;
	runTest: () => Promise<void>;
	toggleConfig: () => void;
	getFieldIssues: (key: string) => Array<{ field: string; message: string }>;
}>();

const name = defineModel<EditableField<string>>('name', { required: true });
const description = defineModel<EditableField<string>>('description', { required: true });

const locale = useI18n();

const showSavingIndicator = computed(() => {
	return !name.value.isEditing;
});
</script>

<template>
	<div :class="$style.headerSection">
		<div :class="$style.headerMeta">
			<div :class="$style.name">
				<n8n-icon-button
					:class="$style.backButton"
					icon="arrow-left"
					type="tertiary"
					:title="locale.baseText('testDefinition.edit.backButtonTitle')"
					@click="$router.back()"
				/>
				<TestNameInput
					v-model="name"
					:class="{ 'has-issues': getFieldIssues('name').length > 0 }"
					:start-editing="startEditing"
					:save-changes="saveChanges"
					:handle-keydown="handleKeydown"
				/>
				<div v-if="showSavingIndicator" :class="$style.lastSaved">
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
			<N8nTooltip :disabled="runTestEnabled" :placement="'left'">
				<N8nButton
					:disabled="!runTestEnabled"
					:class="$style.runTestButton"
					size="small"
					data-test-id="run-test-button"
					:label="locale.baseText('testDefinition.runTest')"
					type="primary"
					@click="runTest"
				/>
				<template #content>
					<slot name="runTestTooltip" />
				</template>
			</N8nTooltip>
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
	justify-content: flex-start;

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
.backButton {
	--button-font-color: var(--color-text-light);
	border: none;
	padding-left: 0;
}
</style>
