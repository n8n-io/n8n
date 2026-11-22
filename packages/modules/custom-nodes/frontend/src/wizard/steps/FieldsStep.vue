<script setup lang="ts">
import { N8nButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { createInput } from '../draftMapping';
import type { EditableInput, WizardIssue } from '../wizard.types';
import FieldEditor from './FieldEditor.vue';

const props = defineProps<{ issues: WizardIssue[] }>();

const inputs = defineModel<EditableInput[]>('inputs', { required: true });

const i18n = useI18n();

const issuesOf = (index: number) =>
	props.issues.filter((issue) => issue.path.startsWith(`inputs[${index}]`));

function update(index: number, next: EditableInput) {
	inputs.value = inputs.value.map((input, position) => (position === index ? next : input));
}

function remove(id: string) {
	inputs.value = inputs.value.filter((input) => input.id !== id);
}

function add() {
	inputs.value = [...inputs.value, createInput()];
}
</script>

<template>
	<div :class="$style.step" data-test-id="custom-action-wizard-fields-step">
		<N8nText color="text-light">{{
			i18n.baseText('customNodes.wizard.fields.description')
		}}</N8nText>
		<N8nText
			v-if="inputs.length === 0"
			color="text-light"
			data-test-id="custom-action-wizard-fields-empty"
		>
			{{ i18n.baseText('customNodes.wizard.fields.empty') }}
		</N8nText>
		<FieldEditor
			v-for="(input, index) in inputs"
			:key="input.id"
			:model-value="input"
			:index="index"
			:issues="issuesOf(index)"
			@update:model-value="update(index, $event)"
			@remove="remove(input.id)"
		/>
		<div>
			<N8nButton
				variant="outline"
				icon="plus"
				:label="i18n.baseText('customNodes.wizard.fields.add')"
				data-test-id="custom-action-wizard-field-add"
				@click="add"
			/>
		</div>
	</div>
</template>

<style module lang="scss">
.step {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
</style>
