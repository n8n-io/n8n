<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import {
	AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH,
	AGENT_SKILL_REFERENCE_CONTENT_MAX_BYTES,
} from '@n8n/api-types';
import { N8nButton, N8nFormInput, N8nIcon, N8nMarkdownEditor, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { Rule, RuleGroup } from '@/Interface';
import { AgentSkillImportError, useAgentSkillImport } from '../composables/useAgentSkillImport';
import type { AgentSkill, AgentSkillReference } from '../types';

const SKILL_FILE = 'SKILL.md';

const props = withDefaults(
	defineProps<{
		skill: AgentSkill;
		disabled?: boolean;
		errors?: Partial<Record<keyof AgentSkill, string>>;
		selectedPath?: string;
		scrollable?: boolean;
		showValidationWarnings?: boolean;
	}>(),
	{ disabled: false, selectedPath: SKILL_FILE, scrollable: true, showValidationWarnings: false },
);

const emit = defineEmits<{
	'update:skill': [updates: Partial<AgentSkill>];
	'update:valid': [valid: boolean];
	'import:skill': [
		payload: {
			source: 'skill_file' | 'folder';
			status: 'success' | 'error';
			referenceCount?: number;
			error?: string;
		},
	];
}>();

const i18n = useI18n();
const { importSkillFiles } = useAgentSkillImport();
const skillFileInput = ref<HTMLInputElement>();
const skillFolderInput = ref<HTMLInputElement>();
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
const invalidReferences = computed(() =>
	(props.skill.references ?? []).filter(
		(reference) =>
			!reference.content.trim() ||
			(reference.bytes ?? new TextEncoder().encode(reference.content).byteLength) >
				AGENT_SKILL_REFERENCE_CONTENT_MAX_BYTES,
	),
);
const referencesValid = computed(() => invalidReferences.value.length === 0);
const formIsValid = computed(
	() =>
		formValidation.name &&
		formValidation.description &&
		instructionsValid.value &&
		referencesValid.value,
);
const instructionsCharacterCount = computed(() =>
	i18n.baseText('agents.builder.skills.instructions.characterCount', {
		interpolate: {
			count: (props.skill.instructions ?? '').length.toLocaleString(),
			max: AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH.toLocaleString(),
		},
	}),
);
const isSkillFileSelected = computed(() => props.selectedPath === SKILL_FILE);
const selectedReference = computed(() =>
	(props.skill.references ?? []).find((reference) => reference.path === props.selectedPath),
);
const allowedToolsText = computed(() => props.skill.allowedTools?.join(', ') ?? '');
const selectedReferenceCharacterCount = computed(() =>
	i18n.baseText('agents.builder.skills.references.characterCount', {
		interpolate: {
			count: (selectedReference.value?.content ?? '').length.toLocaleString(),
		},
	}),
);
const selectedReferenceError = computed(() => {
	const reference = selectedReference.value;
	if (!reference) return '';
	if (!reference.content.trim())
		return i18n.baseText('agents.builder.skills.references.contentRequired');
	const bytes = reference.bytes ?? new TextEncoder().encode(reference.content).byteLength;
	if (bytes > AGENT_SKILL_REFERENCE_CONTENT_MAX_BYTES) {
		return i18n.baseText('agents.builder.skills.references.contentMaxBytes', {
			interpolate: { max: AGENT_SKILL_REFERENCE_CONTENT_MAX_BYTES.toLocaleString() },
		});
	}
	return '';
});
const referencesError = computed(() => {
	if (referencesValid.value) return '';
	return i18n.baseText('agents.builder.skills.references.invalidSummary');
});

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

function onAllowedToolsInput(value: string | number | boolean | null | undefined) {
	const next = typeof value === 'string' ? value : String(value ?? '');
	const allowedTools = next
		.split(',')
		.map((tool) => tool.trim())
		.filter(Boolean);
	emit('update:skill', { allowedTools: allowedTools.length > 0 ? allowedTools : undefined });
}

function openSkillFilePicker() {
	skillFileInput.value?.click();
}

function openSkillFolderPicker() {
	skillFolderInput.value?.click();
}

async function importFiles(files: File[], source: 'skill_file' | 'folder') {
	try {
		fileError.value = '';
		const importedSkill = await importSkillFiles(files);
		emit('update:skill', importedSkill);
		emit('import:skill', {
			source,
			status: 'success',
			referenceCount: importedSkill.references?.length ?? 0,
		});
	} catch (error) {
		fileError.value =
			error instanceof AgentSkillImportError
				? i18n.baseText(error.i18nKey)
				: i18n.baseText('agents.builder.skills.import.invalidFolder');
		emit('import:skill', {
			source,
			status: 'error',
			error: error instanceof AgentSkillImportError ? error.i18nKey : 'unknown',
		});
	}
}

function onSkillFileChange(event: Event) {
	const input = event.target instanceof HTMLInputElement ? event.target : null;
	const files = input?.files ? Array.from(input.files) : [];
	if (files.length > 0) void importFiles(files, 'skill_file');
	if (input) input.value = '';
}

function onSkillFolderChange(event: Event) {
	const input = event.target instanceof HTMLInputElement ? event.target : null;
	const files = input?.files ? Array.from(input.files) : [];
	if (files.length > 0) void importFiles(files, 'folder');
	if (input) input.value = '';
}

function replaceReference(updated: AgentSkillReference) {
	emit('update:skill', {
		references: (props.skill.references ?? []).map((reference) =>
			reference.path === updated.path ? updated : reference,
		),
	});
}

async function onReferenceInput(value: string) {
	const reference = selectedReference.value;
	if (!reference) return;
	replaceReference({
		...reference,
		content: value,
		bytes: new TextEncoder().encode(value).byteLength,
		sha256: await sha256(value),
	});
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

async function sha256(content: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
</script>

<template>
	<div
		:class="[$style.panel, props.scrollable && $style.scrollable]"
		data-testid="agent-skill-viewer"
	>
		<template v-if="isSkillFileSelected">
			<div :class="$style.importActions">
				<N8nButton
					variant="subtle"
					size="mini"
					:disabled="props.disabled"
					data-testid="agent-skill-upload-skill-md"
					@click="openSkillFilePicker"
				>
					<template #prefix><N8nIcon icon="upload" :size="12" /></template>
					{{ i18n.baseText('agents.builder.skills.import.skillFile') }}
				</N8nButton>
				<N8nButton
					variant="subtle"
					size="mini"
					:disabled="props.disabled"
					data-testid="agent-skill-upload-folder"
					@click="openSkillFolderPicker"
				>
					<template #prefix><N8nIcon icon="folder-up" :size="12" /></template>
					{{ i18n.baseText('agents.builder.skills.import.folder') }}
				</N8nButton>
				<input
					ref="skillFileInput"
					type="file"
					accept=".md,text/markdown"
					:disabled="props.disabled"
					:class="$style.fileInput"
					data-testid="agent-skill-skill-md-file-input"
					@change="onSkillFileChange"
				/>
				<input
					ref="skillFolderInput"
					type="file"
					webkitdirectory
					multiple
					:disabled="props.disabled"
					:class="$style.fileInput"
					data-testid="agent-skill-folder-file-input"
					@change="onSkillFolderChange"
				/>
			</div>
			<N8nText v-if="fileError" size="small" color="danger">{{ fileError }}</N8nText>
			<N8nText v-if="referencesError" size="small" color="danger">{{ referencesError }}</N8nText>
			<N8nText v-if="props.errors?.references && !referencesError" size="small" color="danger">{{
				props.errors.references
			}}</N8nText>

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

			<div :class="$style.field">
				<N8nFormInput
					:model-value="allowedToolsText"
					:label="i18n.baseText('agents.builder.skills.allowedTools.label')"
					name="skill-allowed-tools"
					label-size="small"
					:placeholder="i18n.baseText('agents.builder.skills.allowedTools.placeholder')"
					:disabled="props.disabled"
					data-testid="agent-skill-allowed-tools-input"
					@update:model-value="onAllowedToolsInput"
				/>
			</div>

			<div :class="[$style.field, $style.instructionsField]">
				<div :class="$style.instructionsHeader">
					<label :class="$style.label">
						<N8nText size="small" :bold="true">{{
							i18n.baseText('agents.builder.skills.instructions.label')
						}}</N8nText>
					</label>
				</div>
				<N8nMarkdownEditor
					:class="$style.editor"
					:model-value="props.skill.instructions ?? ''"
					:readonly="props.disabled"
					max-height="100%"
					data-testid="agent-skill-instructions-editor"
					@update:model-value="onInstructionsInput"
				/>
				<N8nText v-if="instructionsError" size="small" color="danger">{{
					instructionsError
				}}</N8nText>
				<N8nText v-if="props.errors?.instructions" size="small" color="danger">{{
					props.errors.instructions
				}}</N8nText>
				<N8nText size="xsmall" color="text-light">{{ instructionsCharacterCount }}</N8nText>
			</div>
		</template>

		<div v-else-if="selectedReference" :class="[$style.field, $style.instructionsField]">
			<div :class="$style.instructionsHeader">
				<div :class="$style.referenceTitle">
					<N8nText size="small" :bold="true">{{ selectedReference.path }}</N8nText>
					<N8nText size="xsmall" color="text-light">{{
						i18n.baseText('agents.builder.skills.references.markdownOnly')
					}}</N8nText>
				</div>
			</div>
			<N8nMarkdownEditor
				:class="$style.editor"
				:model-value="selectedReference.content"
				:readonly="props.disabled"
				max-height="100%"
				data-testid="agent-skill-reference-editor"
				@update:model-value="onReferenceInput"
			/>
			<N8nText v-if="selectedReferenceError" size="small" color="danger">{{
				selectedReferenceError
			}}</N8nText>
			<N8nText size="xsmall" color="text-light">{{ selectedReferenceCharacterCount }}</N8nText>
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

.importActions {
	display: flex;
	gap: var(--spacing--2xs);
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

.referenceTitle {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}
</style>
