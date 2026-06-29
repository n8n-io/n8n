<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import {
	AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH,
	AGENT_SKILL_REFERENCE_CONTENT_MAX_BYTES,
	AGENT_SKILL_REFERENCE_MAX_COUNT,
	AGENT_SKILL_REFERENCES_TOTAL_MAX_BYTES,
} from '@n8n/api-types';
import {
	N8nButton,
	N8nDialog,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nFormInput,
	N8nIcon,
	N8nInputLabel,
	N8nMarkdownEditor,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import type { IconName } from '@n8n/design-system/components/N8nIcon';
import type { IValidator, Validatable } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import type { Rule, RuleGroup } from '@/Interface';
import { AgentSkillImportError, useAgentSkillImport } from '../composables/useAgentSkillImport';
import type { AgentSkill, AgentSkillReference } from '../types';
import { formatToolNameForDisplay } from '../utils/toolDisplayName';
import AgentChipButton from './AgentChipButton.vue';

const SKILL_FILE = 'SKILL.md';

export type AgentSkillAllowedToolOption = {
	name: string;
	label: string;
	icon?: IconName;
};

const props = withDefaults(
	defineProps<{
		skill: AgentSkill;
		availableTools?: AgentSkillAllowedToolOption[];
		disabled?: boolean;
		errors?: Partial<Record<keyof AgentSkill, string>>;
		selectedPath?: string;
		scrollable?: boolean;
		showValidationWarnings?: boolean;
	}>(),
	{
		availableTools: () => [],
		disabled: false,
		selectedPath: SKILL_FILE,
		scrollable: true,
		showValidationWarnings: false,
	},
);

const emit = defineEmits<{
	'update:skill': [updates: Partial<AgentSkill>];
	'update:valid': [valid: boolean];
	'select:path': [path: string];
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
const referenceFileName = ref('');
const fileError = ref('');
const addToolDialogOpen = ref(false);
const formValidation = reactive({
	name: false,
	description: false,
	referenceName: true,
});

const nameValidationRules: Array<Rule | RuleGroup> = [
	{ name: 'MAX_LENGTH', config: { maximum: 128 } },
];
const descriptionValidationRules: Array<Rule | RuleGroup> = [
	{ name: 'MAX_LENGTH', config: { maximum: 512 } },
];
const referenceNameValidationRules: Array<Rule | RuleGroup> = [{ name: 'referenceFileName' }];
const referenceNameValidators: Record<string, IValidator> = {
	referenceFileName: {
		validate: (value: Validatable) => validateReferenceFileName(String(value ?? '')),
	},
};

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
const referenceBytes = (reference: AgentSkillReference) =>
	new TextEncoder().encode(reference.content).byteLength;
const invalidReferences = computed(() =>
	(props.skill.references ?? []).filter(
		(reference) =>
			!reference.content.trim() ||
			referenceBytes(reference) > AGENT_SKILL_REFERENCE_CONTENT_MAX_BYTES,
	),
);
const totalReferenceBytes = computed(() =>
	(props.skill.references ?? []).reduce((total, reference) => total + referenceBytes(reference), 0),
);
const referencesTotalError = computed(() => {
	if (totalReferenceBytes.value <= AGENT_SKILL_REFERENCES_TOTAL_MAX_BYTES) return '';
	return i18n.baseText('agents.builder.skills.import.referencesTooLarge');
});
const referencesCountError = computed(() => {
	if ((props.skill.references ?? []).length <= AGENT_SKILL_REFERENCE_MAX_COUNT) return '';
	return i18n.baseText('agents.builder.skills.references.maxCount' as BaseTextKey, {
		interpolate: { max: AGENT_SKILL_REFERENCE_MAX_COUNT.toLocaleString() },
	});
});
const referencesValid = computed(
	() =>
		invalidReferences.value.length === 0 &&
		!referencesTotalError.value &&
		!referencesCountError.value,
);
const formIsValid = computed(
	() =>
		formValidation.name &&
		formValidation.description &&
		(!selectedReference.value || formValidation.referenceName) &&
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
const availableToolsByName = computed(
	() => new Map(props.availableTools.map((tool) => [tool.name, tool])),
);
const selectedAllowedTools = computed(() =>
	(props.skill.allowedTools ?? []).map((toolName) => {
		const availableTool = availableToolsByName.value.get(toolName);
		return {
			name: toolName,
			label: availableTool?.label || formatToolNameForDisplay(toolName) || toolName,
			icon: availableTool?.icon ?? 'wrench',
		};
	}),
);
const hasAllowedTools = computed(() => selectedAllowedTools.value.length > 0);
const addableAllowedTools = computed(() => {
	const selected = new Set(props.skill.allowedTools ?? []);
	return props.availableTools.filter((tool) => !selected.has(tool.name));
});
const selectedReferenceByteCount = computed(() =>
	i18n.baseText('agents.builder.skills.references.byteCount' as BaseTextKey, {
		interpolate: {
			count: (selectedReference.value
				? referenceBytes(selectedReference.value)
				: 0
			).toLocaleString(),
			max: AGENT_SKILL_REFERENCE_CONTENT_MAX_BYTES.toLocaleString(),
		},
	}),
);
const selectedReferenceError = computed(() => {
	const reference = selectedReference.value;
	if (!reference) return '';
	if (!reference.content.trim())
		return i18n.baseText('agents.builder.skills.references.contentRequired');
	const bytes = referenceBytes(reference);
	if (bytes > AGENT_SKILL_REFERENCE_CONTENT_MAX_BYTES) {
		return i18n.baseText('agents.builder.skills.references.contentMaxBytes', {
			interpolate: { max: AGENT_SKILL_REFERENCE_CONTENT_MAX_BYTES.toLocaleString() },
		});
	}
	return '';
});
const referencesError = computed(() => {
	if (referencesCountError.value) return referencesCountError.value;
	if (referencesTotalError.value) return referencesTotalError.value;
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

function onReferenceNameValidate(valid: boolean) {
	formValidation.referenceName = valid;
}

function onInstructionsInput(value: string) {
	emit('update:skill', { instructions: value });
}

function updateAllowedTools(allowedTools: string[]) {
	emit('update:skill', { allowedTools: allowedTools.length > 0 ? allowedTools : undefined });
}

function onAddAllowedTool(toolName: string) {
	const allowedTools = props.skill.allowedTools ?? [];
	if (!allowedTools.includes(toolName)) {
		updateAllowedTools([...allowedTools, toolName]);
	}
	addToolDialogOpen.value = false;
}

function onRemoveAllowedTool(toolName: string) {
	updateAllowedTools((props.skill.allowedTools ?? []).filter((name) => name !== toolName));
}

function openSkillFilePicker() {
	skillFileInput.value?.click();
}

function openSkillFolderPicker() {
	skillFolderInput.value?.click();
}

async function importFiles(files: File[], source: 'skill_file' | 'folder') {
	let importedSkill: AgentSkill;
	try {
		fileError.value = '';
		importedSkill = await importSkillFiles(files);
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
		return;
	}

	emit('update:skill', importedSkill);
	emit('import:skill', {
		source,
		status: 'success',
		referenceCount: importedSkill.references?.length ?? 0,
	});
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

function replaceReference(updated: AgentSkillReference, currentPath = updated.path) {
	emit('update:skill', {
		references: (props.skill.references ?? []).map((reference) =>
			reference.path === currentPath ? updated : reference,
		),
	});
}

function onReferenceInput(value: string) {
	const reference = selectedReference.value;
	if (!reference) return;
	replaceReference({
		path: reference.path,
		content: value,
	});
}

function onReferenceNameInput(value: string | number | boolean | null | undefined) {
	const reference = selectedReference.value;
	if (!reference) return;

	const nextFileName = typeof value === 'string' ? value : String(value ?? '');
	referenceFileName.value = nextFileName;
	if (validateReferenceFileName(nextFileName)) return;

	const path = referencePathFromFileName(nextFileName);
	replaceReference({ path, content: reference.content }, reference.path);
	emit('select:path', path);
}

function validateReferenceFileName(value: string) {
	const fileName = normalizeReferenceFileName(value);
	if (!fileName) {
		return { messageKey: 'agents.builder.skills.references.name.required' };
	}
	if (fileName === '.' || fileName === '..') {
		return { messageKey: 'agents.builder.skills.references.name.invalid' };
	}
	if (/[\\/]/.test(value)) {
		return { messageKey: 'agents.builder.skills.references.name.noPathSeparators' };
	}
	if (!/^[A-Za-z0-9 _-]+$/.test(fileName)) {
		return { messageKey: 'agents.builder.skills.references.name.invalidCharacters' };
	}

	const path = referencePathFromFileName(fileName);
	const duplicate = (props.skill.references ?? []).some(
		(reference) => reference.path !== selectedReference.value?.path && reference.path === path,
	);
	if (duplicate) {
		return { messageKey: 'agents.builder.skills.references.name.duplicate' };
	}

	return false;
}

function fileNameFromReferencePath(path: string): string {
	return path.replace(/^references\//, '').replace(/\.(md|markdown)$/i, '');
}

function referencePathFromFileName(value: string): string {
	const fileName = normalizeReferenceFileName(value);
	if (!fileName) return 'references/reference.md';
	return `references/${fileName}.md`;
}

function normalizeReferenceFileName(value: string): string {
	return value.trim().replace(/\.(md|markdown)$/i, '');
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

watch(
	() => selectedReference.value?.path,
	(path) => {
		referenceFileName.value = path ? fileNameFromReferencePath(path) : '';
		formValidation.referenceName = true;
	},
	{ immediate: true },
);

watch(formIsValid, (valid) => emit('update:valid', valid), { immediate: true });
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
				<N8nInputLabel
					:label="i18n.baseText('agents.builder.skills.allowedTools.label')"
					size="small"
				>
					<div :class="$style.allowedTools" data-testid="agent-skill-allowed-tools">
						<span
							v-for="tool in selectedAllowedTools"
							:key="tool.name"
							:class="$style.allowedToolChip"
							data-testid="agent-skill-allowed-tool-chip"
						>
							<N8nIcon :icon="tool.icon" :size="16" color="text-light" />
							<N8nText size="small" color="text-dark" :class="$style.allowedToolLabel">
								{{ tool.label }}
							</N8nText>
							<N8nButton
								:class="$style.allowedToolRemove"
								variant="ghost"
								size="xsmall"
								icon-only
								icon="x"
								:disabled="props.disabled"
								:aria-label="
									i18n.baseText('agents.builder.skills.allowedTools.remove' as BaseTextKey, {
										interpolate: { tool: tool.label },
									})
								"
								data-testid="agent-skill-allowed-tool-remove"
								@click="onRemoveAllowedTool(tool.name)"
							/>
						</span>
						<N8nTooltip
							:disabled="!hasAllowedTools"
							:content="i18n.baseText('agents.builder.tools.add' as BaseTextKey)"
							placement="top"
						>
							<N8nButton
								variant="ghost"
								size="medium"
								:icon-only="hasAllowedTools"
								:disabled="props.disabled"
								data-testid="agent-skill-add-allowed-tool"
								@click="addToolDialogOpen = true"
							>
								<template #icon>
									<N8nIcon icon="plus" :size="16" color="text-light" />
								</template>
								<template v-if="!hasAllowedTools">
									{{ i18n.baseText('agents.builder.tools.add' as BaseTextKey) }}
								</template>
							</N8nButton>
						</N8nTooltip>
					</div>
				</N8nInputLabel>
			</div>

			<div :class="[$style.field, $style.instructionsField]">
				<N8nInputLabel
					:class="$style.editorLabel"
					:label="i18n.baseText('agents.builder.skills.instructions.label')"
					:required="true"
					size="small"
				>
					<N8nMarkdownEditor
						:class="$style.editor"
						:container-class="$style.fullHeightEditor"
						:model-value="props.skill.instructions ?? ''"
						:readonly="props.disabled"
						max-height="100%"
						data-testid="agent-skill-instructions-editor"
						@update:model-value="onInstructionsInput"
					/>
					<div :class="$style.editorMeta">
						<N8nText v-if="instructionsError" size="small" color="danger">{{
							instructionsError
						}}</N8nText>
						<N8nText v-if="props.errors?.instructions" size="small" color="danger">{{
							props.errors.instructions
						}}</N8nText>
						<N8nText size="xsmall" color="text-light">{{ instructionsCharacterCount }}</N8nText>
					</div>
				</N8nInputLabel>
			</div>
		</template>

		<div v-else-if="selectedReference" :class="[$style.field, $style.instructionsField]">
			<div :class="$style.field">
				<N8nFormInput
					:model-value="referenceFileName"
					:label="i18n.baseText('agents.builder.skills.references.name.label')"
					name="skill-reference-name"
					required
					label-size="small"
					:placeholder="i18n.baseText('agents.builder.skills.references.name.placeholder')"
					:disabled="props.disabled"
					:show-validation-warnings="props.showValidationWarnings"
					:validation-rules="referenceNameValidationRules"
					:validators="referenceNameValidators"
					data-testid="agent-skill-reference-name-input"
					@update:model-value="onReferenceNameInput"
					@validate="onReferenceNameValidate"
				/>
			</div>
			<N8nInputLabel
				:class="$style.editorLabel"
				:label="i18n.baseText('agents.builder.skills.references.content.label')"
				:required="true"
				size="small"
			>
				<N8nMarkdownEditor
					:class="$style.editor"
					:container-class="$style.fullHeightEditor"
					:model-value="selectedReference.content"
					:readonly="props.disabled"
					max-height="100%"
					data-testid="agent-skill-reference-editor"
					@update:model-value="onReferenceInput"
				/>
				<div :class="$style.editorMeta">
					<N8nText v-if="selectedReferenceError" size="small" color="danger">{{
						selectedReferenceError
					}}</N8nText>
					<N8nText v-if="referencesError && !selectedReferenceError" size="small" color="danger">{{
						referencesError
					}}</N8nText>
					<N8nText size="xsmall" color="text-light">{{ selectedReferenceByteCount }}</N8nText>
				</div>
			</N8nInputLabel>
		</div>

		<N8nDialog :open="addToolDialogOpen" size="small" @update:open="addToolDialogOpen = $event">
			<N8nDialogHeader>
				<N8nDialogTitle>
					{{ i18n.baseText('agents.builder.skills.allowedTools.addModal.title' as BaseTextKey) }}
				</N8nDialogTitle>
			</N8nDialogHeader>
			<div :class="$style.allowedToolOptions">
				<N8nText v-if="props.availableTools.length === 0" size="small" color="text-light">
					{{ i18n.baseText('agents.builder.skills.allowedTools.addModal.empty' as BaseTextKey) }}
				</N8nText>
				<N8nText v-else-if="addableAllowedTools.length === 0" size="small" color="text-light">
					{{
						i18n.baseText('agents.builder.skills.allowedTools.addModal.allSelected' as BaseTextKey)
					}}
				</N8nText>
				<AgentChipButton
					v-for="tool in addableAllowedTools"
					:key="tool.name"
					:icon="tool.icon"
					:class="$style.allowedToolOption"
					data-testid="agent-skill-allowed-tool-option"
					@click="onAddAllowedTool(tool.name)"
				>
					{{ tool.label }}
				</AgentChipButton>
			</div>
		</N8nDialog>
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

.fileInput {
	display: none;
}

.editor {
	flex: 1;
	min-height: 0;
}

.allowedTools {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--5xs);
}

.allowedToolChip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
	height: var(--height--md);
	max-width: min(12rem, 100%);
	padding: var(--spacing--xs) var(--spacing--4xs) var(--spacing--xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--full);
	background: light-dark(var(--background--surface), var(--background--subtle));
	box-shadow: var(--shadow--xs);
}

.allowedToolLabel {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-weight: var(--font-weight--medium);
}

.allowedToolRemove {
	--button--color--background-hover: transparent;
	--button--color--background-active: transparent;
}

.allowedToolOptions {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--sm);
}

.allowedToolOption {
	max-width: min(12rem, 100%);
}

.fullHeightEditor {
	height: 100%;

	:global(.n8n-markdown) {
		min-height: 100%;
	}
}

.editorLabel {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	gap: var(--spacing--2xs);
}

.editorMeta {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}
</style>
