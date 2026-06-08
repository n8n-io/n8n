<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH } from '@n8n/api-types';
import { N8nButton, N8nFormInput, N8nIcon, N8nMarkdownEditor, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { Rule, RuleGroup } from '@/Interface';
import type { AgentSkill } from '../types';

const props = withDefaults(
	defineProps<{
		skill: AgentSkill;
		disabled?: boolean;
		errors?: Partial<Record<keyof AgentSkill, string>>;
		scrollable?: boolean;
		showValidationWarnings?: boolean;
	}>(),
	{ disabled: false, scrollable: true, showValidationWarnings: false },
);

const emit = defineEmits<{
	'update:skill': [updates: Partial<AgentSkill>];
	'update:valid': [valid: boolean];
}>();

const i18n = useI18n();
const fileInput = ref<HTMLInputElement>();
const name = ref(props.skill.name);
const description = ref(props.skill.description);
const fileError = ref('');
const formValidation = reactive({
	name: false,
	description: false,
});

const nameValidationRules: Array<Rule | RuleGroup> = [
	{ name: 'MAX_LENGTH', config: { maximum: 128 } },
];
const descriptionValidationRules: Array<Rule | RuleGroup> = [
	{ name: 'MAX_LENGTH', config: { maximum: 512 } },
];

const instructionsError = computed(() => {
	const value = props.skill.instructions ?? '';
	if (!value.trim()) return '';
	if (value.length > AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH) {
		return i18n.baseText('agents.builder.skills.validation.instructionsMaxLength', {
			interpolate: { max: String(AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH) },
		});
	}
	return '';
});
const instructionsValid = computed(
	() => Boolean((props.skill.instructions ?? '').trim()) && !instructionsError.value,
);
const formIsValid = computed(
	() => formValidation.name && formValidation.description && instructionsValid.value,
);
const instructionsCharacterCount = computed(() =>
	i18n.baseText('agents.builder.skills.instructions.characterCount', {
		interpolate: {
			count: (props.skill.instructions ?? '').length.toLocaleString(),
			max: AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH.toLocaleString(),
		},
	}),
);
const acceptedInstructionExtensions = new Set(['txt', 'md']);

function onNameInput(value: string | number | boolean | null | undefined) {
	const next = typeof value === 'string' ? value : String(value ?? '');
	name.value = next;
	emit('update:skill', { name: next });
}

function onDescriptionInput(value: string | number | boolean | null | undefined) {
	const next = typeof value === 'string' ? value : String(value ?? '');
	description.value = next;
	emit('update:skill', { description: next });
}

function onFieldValidate(field: 'name' | 'description', valid: boolean) {
	formValidation[field] = valid;
}

function onInstructionsInput(value: string) {
	emit('update:skill', { instructions: value });
}

function replaceInstructions(instructions: string) {
	fileError.value = '';
	emit('update:skill', { instructions });
}

function openFilePicker() {
	fileInput.value?.click();
}

function readInstructionsFile(file: File) {
	const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
	if (!acceptedInstructionExtensions.has(extension)) {
		fileError.value = i18n.baseText('agents.builder.skills.instructions.file.invalidType');
		return;
	}

	const reader = new FileReader();
	reader.onload = () => {
		replaceInstructions(String(reader.result ?? ''));
		reader.onload = null;
		reader.onerror = null;
	};
	reader.onerror = () => {
		fileError.value = i18n.baseText('agents.builder.skills.instructions.file.readError');
		reader.onload = null;
		reader.onerror = null;
	};
	reader.readAsText(file);
}

function onInstructionsFileChange(event: Event) {
	const input = event.target instanceof HTMLInputElement ? event.target : null;
	const file = input?.files?.[0];
	if (file) readInstructionsFile(file);
	if (input) input.value = '';
}

watch(
	() => props.skill.name,
	(value) => {
		if (value !== name.value) name.value = value;
	},
);

watch(
	() => props.skill.description,
	(value) => {
		if (value !== description.value) description.value = value;
	},
);

watch(formIsValid, (valid) => emit('update:valid', valid), { immediate: true });
</script>

<template>
	<div
		:class="[$style.panel, props.scrollable && $style.scrollable]"
		data-testid="agent-skill-viewer"
	>
		<div :class="$style.field">
			<N8nFormInput
				:model-value="name"
				:label="i18n.baseText('agents.builder.skills.name.label')"
				name="skill-name"
				required
				label-size="small"
				:placeholder="i18n.baseText('agents.builder.skills.name.placeholder')"
				:disabled="props.disabled"
				:show-validation-warnings="props.showValidationWarnings"
				:validation-rules="nameValidationRules"
				data-testid="agent-skill-name-input"
				@update:model-value="onNameInput"
				@validate="onFieldValidate('name', $event)"
			/>
		</div>

		<div :class="$style.field">
			<N8nFormInput
				:model-value="description"
				:label="i18n.baseText('agents.builder.skills.description.label')"
				name="skill-description"
				required
				label-size="small"
				:placeholder="i18n.baseText('agents.builder.skills.description.placeholder')"
				:disabled="props.disabled"
				:show-validation-warnings="props.showValidationWarnings"
				:validation-rules="descriptionValidationRules"
				data-testid="agent-skill-description-input"
				@update:model-value="onDescriptionInput"
				@validate="onFieldValidate('description', $event)"
			/>
		</div>

		<div :class="[$style.field, $style.instructionsField]">
			<div :class="$style.instructionsHeader">
				<label :class="$style.label">
					<N8nText size="small" :bold="true">{{
						i18n.baseText('agents.builder.skills.instructions.label')
					}}</N8nText>
				</label>
				<N8nButton
					variant="subtle"
					size="mini"
					:disabled="props.disabled"
					data-testid="agent-skill-upload-instructions"
					@click="openFilePicker"
				>
					<template #prefix><N8nIcon icon="upload" :size="12" /></template>
					{{ i18n.baseText('agents.builder.skills.instructions.file.upload') }}
				</N8nButton>
				<input
					ref="fileInput"
					type="file"
					accept=".txt,.md,text/plain,text/markdown"
					:disabled="props.disabled"
					:class="$style.fileInput"
					data-testid="agent-skill-instructions-file-input"
					@change="onInstructionsFileChange"
				/>
			</div>
			<N8nMarkdownEditor
				:class="$style.editor"
				:model-value="props.skill.instructions ?? ''"
				:readonly="props.disabled"
				max-height="100%"
				data-testid="agent-skill-instructions-editor"
				@update:model-value="onInstructionsInput"
			/>
			<N8nText v-if="fileError" size="small" color="danger">{{ fileError }}</N8nText>
			<N8nText v-if="instructionsError" size="small" color="danger">{{
				instructionsError
			}}</N8nText>
			<N8nText v-if="props.errors?.instructions" size="small" color="danger">{{
				props.errors.instructions
			}}</N8nText>
			<N8nText size="xsmall" color="text-light">{{ instructionsCharacterCount }}</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
.panel {
	padding: var(--spacing--lg);
	overflow: hidden;
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	gap: var(--spacing--sm);
	width: 100%;
}

.scrollable {
	overflow-y: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.instructionsField {
	flex: 1;
	min-height: 0;
}

.label {
	display: block;
}

.instructionsHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
}

.fileInput {
	display: none;
}

.editor {
	flex: 1;
	min-height: 0;
}
</style>
