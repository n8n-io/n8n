<script setup lang="ts">
import {
	N8nAiModelSelectorDropdown,
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nInput,
	N8nInputLabel,
	N8nSelect2,
	N8nText,
	type SelectValue,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { toRef } from 'vue';

import AgentPresetPicker from './components/AgentPresetPicker/AgentPresetPicker.vue';
import { useAgentDialogForm } from './useAgentDialogForm';
import type { AgentFormValues } from '../../../../task-board.types';

const props = defineProps<{
	projectId: string | undefined;
	/** The agent to edit. Without it the dialog adds a new agent. */
	agentId?: string;
	initialValues?: AgentFormValues;
	saving: boolean;
}>();
const open = defineModel<boolean>('open', { required: true });
const emit = defineEmits<{ submit: [values: AgentFormValues] }>();
const i18n = useI18n();

const form = useAgentDialogForm({
	open,
	projectId: toRef(props, 'projectId'),
	agentId: toRef(props, 'agentId'),
	initialValues: toRef(props, 'initialValues'),
});
const { name, description, instructions, skillIds } = form;

function onSkillsChange(value: SelectValue[] | undefined) {
	skillIds.value = (value ?? []).map(String);
}

function onSubmit() {
	if (!form.canSubmit.value || props.saving) return;
	emit('submit', form.toValues());
}
</script>

<template>
	<N8nDialog
		v-model:open="open"
		size="large"
		:header="
			i18n.baseText(
				form.isEdit.value ? 'taskBoard.team.form.editTitle' : 'taskBoard.team.form.addTitle',
			)
		"
		data-test-id="task-board-agent-dialog"
	>
		<N8nDialogBody :class="$style.body">
			<template v-if="!form.isEdit.value">
				<N8nText size="small" color="text-base">
					{{ i18n.baseText('taskBoard.team.form.intro') }}
				</N8nText>
				<AgentPresetPicker
					:selected="form.presetKey.value"
					:disabled="saving"
					@select="form.applyPreset"
				/>
			</template>
			<div :class="$style.row">
				<N8nInputLabel
					:label="i18n.baseText('taskBoard.team.form.name')"
					input-name="task-board-agent-name"
					required
					size="small"
					color="text-dark"
				>
					<N8nInput
						id="task-board-agent-name"
						v-model="name"
						:maxlength="128"
						:disabled="saving"
						data-test-id="task-board-agent-name"
					/>
				</N8nInputLabel>
				<N8nInputLabel
					:label="i18n.baseText('taskBoard.team.form.role')"
					input-name="task-board-agent-role"
					size="small"
					color="text-dark"
				>
					<N8nInput
						id="task-board-agent-role"
						v-model="description"
						:maxlength="512"
						:disabled="saving"
						:placeholder="i18n.baseText('taskBoard.team.form.rolePlaceholder')"
						data-test-id="task-board-agent-role"
					/>
				</N8nInputLabel>
			</div>
			<N8nInputLabel
				:label="i18n.baseText('taskBoard.team.form.model')"
				:tooltip-text="i18n.baseText('taskBoard.team.form.modelHint')"
				size="small"
				color="text-dark"
			>
				<N8nAiModelSelectorDropdown
					:items="form.modelItems.value"
					:is-loading="form.loadingOptions.value"
					:selected-label="form.selectedModelLabel.value"
					:selected-credential-name="form.selectedCredentialName.value"
					:no-match-label="i18n.baseText('taskBoard.team.form.noModelMatch')"
					:disabled="saving"
					data-test-id="task-board-agent-model"
					credential-data-test-id="task-board-agent-model-credential"
					@select="form.selectModel"
				/>
			</N8nInputLabel>
			<N8nInputLabel
				:label="i18n.baseText('taskBoard.team.form.instructions')"
				input-name="task-board-agent-instructions"
				required
				size="small"
				color="text-dark"
			>
				<N8nInput
					id="task-board-agent-instructions"
					v-model="instructions"
					type="textarea"
					:rows="10"
					:disabled="saving"
					data-test-id="task-board-agent-instructions"
				/>
			</N8nInputLabel>
			<N8nInputLabel
				:label="i18n.baseText('taskBoard.team.form.skills')"
				input-name="task-board-agent-skills"
				size="small"
				color="text-dark"
			>
				<N8nSelect2
					id="task-board-agent-skills"
					:model-value="skillIds"
					:items="form.skillItems.value"
					multiple
					size="medium"
					:disabled="saving"
					:placeholder="i18n.baseText('taskBoard.team.form.skillsPlaceholder')"
					data-test-id="task-board-agent-skills"
					@update:model-value="onSkillsChange"
				/>
			</N8nInputLabel>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				variant="outline"
				:label="i18n.baseText('generic.cancel')"
				:disabled="saving"
				@click="open = false"
			/>
			<N8nButton
				variant="solid"
				:label="
					i18n.baseText(
						form.isEdit.value ? 'taskBoard.team.form.saveSubmit' : 'taskBoard.team.form.addSubmit',
					)
				"
				:loading="saving"
				:disabled="!form.canSubmit.value"
				data-test-id="task-board-agent-submit"
				data-attr="task-board-agent-submit"
				@click="onSubmit"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.row {
	display: grid;
	/* A readable minimum field width. The spacing scale has no token this wide. */
	grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
	gap: var(--spacing--sm);
}
</style>
