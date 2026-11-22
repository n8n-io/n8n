<script setup lang="ts">
import {
	N8nButton,
	N8nCheckbox,
	N8nInput,
	N8nInputLabel,
	N8nSelect2,
	N8nText,
	type SelectItem,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { EditableInput, WizardIssue } from '../wizard.types';
import IssueList from './IssueList.vue';

const props = defineProps<{
	/** The issues of this input, with paths such as `inputs[2].name`. */
	issues: WizardIssue[];
	index: number;
}>();

const emit = defineEmits<{ remove: [] }>();

const input = defineModel<EditableInput>({ required: true });

const i18n = useI18n();

const TYPES: Array<EditableInput['type']> = ['string', 'number', 'boolean', 'options', 'json'];
const TARGETS: Array<EditableInput['target']> = ['header', 'query', 'body'];
const URL_TARGETS: Array<EditableInput['target']> = ['url'];
const NO_DEFAULT = '__none__';

const fromUrl = computed(() => input.value.target === 'url');

const typeItems = computed(() =>
	TYPES.map(
		(type): SelectItem => ({
			value: type,
			label: i18n.baseText(`customNodes.wizard.fields.type.${type}`),
		}),
	),
);

const targetItems = computed(() =>
	(fromUrl.value ? URL_TARGETS : TARGETS).map(
		(target): SelectItem => ({
			value: target,
			label: i18n.baseText(`customNodes.wizard.fields.target.${target}`),
		}),
	),
);

const booleanItems = computed((): SelectItem[] => [
	{ value: NO_DEFAULT, label: i18n.baseText('customNodes.wizard.fields.default.none') },
	{ value: 'true', label: 'true' },
	{ value: 'false', label: 'false' },
]);

const issuesAt = (field: string) =>
	props.issues.filter((issue) => issue.path === `inputs[${props.index}].${field}`);

/** Issues of a field that the editor does not show, such as options of an option. */
const otherIssues = computed(() => {
	const shown = ['name', 'displayName', 'type', 'required', 'default', 'target', 'key'].map(
		(field) => `inputs[${props.index}].${field}`,
	);
	return props.issues.filter((issue) => !shown.includes(issue.path));
});

function patch(change: Partial<Omit<EditableInput, 'id'>>) {
	input.value = { ...input.value, ...change };
}

function onType(value: unknown) {
	const type = TYPES.find((candidate) => candidate === value);
	if (type) patch({ type, defaultText: '' });
}

function onTarget(value: unknown) {
	const target = TARGETS.find((candidate) => candidate === value);
	if (target) patch({ target });
}

function onBooleanDefault(value: unknown) {
	patch({ defaultText: value === NO_DEFAULT ? '' : String(value) });
}
</script>

<template>
	<div :class="$style.card" data-test-id="custom-action-wizard-field">
		<div :class="$style.grid">
			<N8nInputLabel
				:label="i18n.baseText('customNodes.wizard.fields.displayName')"
				color="text-dark"
				required
			>
				<N8nInput
					:model-value="input.displayName"
					data-test-id="custom-action-wizard-field-display-name"
					@update:model-value="patch({ displayName: $event })"
				/>
				<IssueList :issues="issuesAt('displayName')" />
			</N8nInputLabel>
			<N8nInputLabel
				:label="i18n.baseText('customNodes.wizard.fields.name')"
				color="text-dark"
				required
			>
				<N8nInput
					:model-value="input.name"
					:disabled="fromUrl"
					:placeholder="i18n.baseText('customNodes.wizard.fields.name.hint')"
					data-test-id="custom-action-wizard-field-name"
					@update:model-value="patch({ name: $event })"
				/>
				<IssueList :issues="issuesAt('name')" />
			</N8nInputLabel>
			<N8nInputLabel :label="i18n.baseText('customNodes.wizard.fields.type')" color="text-dark">
				<N8nSelect2
					:model-value="input.type"
					:items="typeItems"
					data-test-id="custom-action-wizard-field-type"
					@update:model-value="onType"
				/>
			</N8nInputLabel>
			<N8nInputLabel :label="i18n.baseText('customNodes.wizard.fields.default')" color="text-dark">
				<N8nSelect2
					v-if="input.type === 'boolean'"
					:model-value="input.defaultText || NO_DEFAULT"
					:items="booleanItems"
					data-test-id="custom-action-wizard-field-default-boolean"
					@update:model-value="onBooleanDefault"
				/>
				<N8nInput
					v-else
					:model-value="input.defaultText"
					:placeholder="i18n.baseText('customNodes.wizard.fields.default.none')"
					data-test-id="custom-action-wizard-field-default"
					@update:model-value="patch({ defaultText: $event })"
				/>
				<IssueList :issues="issuesAt('default')" />
			</N8nInputLabel>
			<N8nInputLabel :label="i18n.baseText('customNodes.wizard.fields.target')" color="text-dark">
				<N8nSelect2
					:model-value="input.target"
					:items="targetItems"
					:disabled="fromUrl"
					data-test-id="custom-action-wizard-field-target"
					@update:model-value="onTarget"
				/>
				<IssueList :issues="issuesAt('target')" />
			</N8nInputLabel>
			<N8nInputLabel
				:label="i18n.baseText('customNodes.wizard.fields.key')"
				color="text-dark"
				required
			>
				<N8nInput
					:model-value="input.key"
					:disabled="fromUrl"
					:placeholder="i18n.baseText('customNodes.wizard.fields.key.hint')"
					data-test-id="custom-action-wizard-field-key"
					@update:model-value="patch({ key: $event })"
				/>
				<IssueList :issues="issuesAt('key')" />
			</N8nInputLabel>
		</div>

		<N8nInputLabel
			v-if="input.type === 'options'"
			:label="i18n.baseText('customNodes.wizard.fields.options')"
			color="text-dark"
		>
			<N8nInput
				:model-value="input.optionsText"
				type="textarea"
				:rows="3"
				:placeholder="i18n.baseText('customNodes.wizard.fields.options.hint')"
				data-test-id="custom-action-wizard-field-options"
				@update:model-value="patch({ optionsText: $event })"
			/>
		</N8nInputLabel>

		<N8nInputLabel
			:label="i18n.baseText('customNodes.wizard.fields.fieldDescription')"
			color="text-dark"
		>
			<N8nInput
				:model-value="input.description"
				data-test-id="custom-action-wizard-field-description"
				@update:model-value="patch({ description: $event })"
			/>
		</N8nInputLabel>

		<div :class="$style.footer">
			<N8nCheckbox
				:model-value="input.required"
				:disabled="fromUrl"
				:label="i18n.baseText('customNodes.wizard.fields.required')"
				data-test-id="custom-action-wizard-field-required"
				@update:model-value="patch({ required: $event === true })"
			/>
			<N8nButton
				variant="ghost"
				icon="trash-2"
				size="small"
				:disabled="fromUrl"
				:label="i18n.baseText('customNodes.wizard.fields.remove')"
				data-test-id="custom-action-wizard-field-remove"
				@click="emit('remove')"
			/>
		</div>
		<N8nText v-if="fromUrl" size="small" color="text-light">
			{{ i18n.baseText('customNodes.wizard.fields.urlHint') }}
		</N8nText>
		<IssueList :issues="[...issuesAt('required'), ...otherIssues]" />
	</div>
</template>

<style module lang="scss">
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius);
}

.grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: var(--spacing--xs);
}

.footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
}
</style>
