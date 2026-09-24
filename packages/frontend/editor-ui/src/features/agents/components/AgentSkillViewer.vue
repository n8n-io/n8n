<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import {
	AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH,
	AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH,
	AGENT_SKILL_REFERENCE_MAX_COUNT,
	AGENT_SKILL_REFERENCES_TOTAL_MAX_LENGTH,
} from '@n8n/api-types';
import {
	N8nButton,
	N8nFormInput,
	N8nIcon,
	N8nInputLabel,
	N8nMarkdownEditor,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import type { IconName } from '@n8n/design-system';
import type { IValidator, Validatable } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import type { Rule, RuleGroup } from '@/Interface';
import type { AgentSkill, AgentSkillReference } from '../types';
import { formatToolNameForDisplay } from '../utils/toolDisplayName';
import AgentChipButton from './AgentChipButton.vue';
import AgentModal from './modals/AgentModal.vue';

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
		/**
		 * Names of the agent's other skills — a name colliding with one of them
		 * (case-insensitively, trimmed) fails the name field's validation, since
		 * skill names must be unique per agent.
		 */
		existingSkillNames?: string[];
		selectedPath?: string;
		showValidationWarnings?: boolean;
	}>(),
	{
		availableTools: () => [],
		disabled: false,
		existingSkillNames: () => [],
		selectedPath: SKILL_FILE,
		showValidationWarnings: false,
	},
);

const emit = defineEmits<{
	'update:skill': [updates: Partial<AgentSkill>];
	'update:valid': [valid: boolean];
	'select:path': [path: string];
}>();

const i18n = useI18n();
const name = ref(props.skill.name);
const description = ref(props.skill.description);
const referenceFileName = ref('');
const addToolDialogOpen = ref(false);
const formValidation = reactive({
	description: false,
	referenceName: true,
});

const nameValidationRules: Array<Rule | RuleGroup> = [
	{ name: 'MAX_LENGTH', config: { maximum: 128 } },
	{ name: 'uniqueSkillName' },
];
const normalizedExistingSkillNames = computed(
	() => new Set(props.existingSkillNames.map((name) => name.trim().toLowerCase())),
);
const nameIsValid = computed(() => {
	const value = name.value.trim();
	return (
		value.length > 0 &&
		value.length <= 128 &&
		!normalizedExistingSkillNames.value.has(value.toLowerCase())
	);
});
const nameValidators: Record<string, IValidator> = {
	uniqueSkillName: {
		validate: (value: Validatable) =>
			normalizedExistingSkillNames.value.has(
				String(value ?? '')
					.trim()
					.toLowerCase(),
			)
				? { messageKey: 'agents.builder.skills.validation.nameDuplicate' }
				: false,
	},
};
const descriptionValidationRules: Array<Rule | RuleGroup> = [
	{ name: 'MAX_LENGTH', config: { maximum: 512 } },
];
const referenceNameValidationRules: Array<Rule | RuleGroup> = [{ name: 'referenceFileName' }];
const referenceNameValidators: Record<string, IValidator> = {
	referenceFileName: {
		validate: (value: Validatable) => validateReferenceFileName(String(value ?? '')),
	},
};

// Characters, matching the server-side agentSkillSchema limits.
const instructionsLength = computed(() => (props.skill.instructions ?? '').length);
const instructionsError = computed(() => {
	const value = props.skill.instructions ?? '';
	if (!value.trim()) return '';
	if (instructionsLength.value > AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH) {
		return i18n.baseText('agents.builder.skills.validation.instructionsMaxLength', {
			interpolate: { max: AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH.toLocaleString() },
		});
	}
	return '';
});
const instructionsValid = computed(
	() => Boolean((props.skill.instructions ?? '').trim()) && !instructionsError.value,
);
const referenceLength = (reference: AgentSkillReference) => reference.content.length;
const invalidReferences = computed(() =>
	(props.skill.references ?? []).filter(
		(reference) =>
			!reference.content.trim() ||
			referenceLength(reference) > AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH,
	),
);
const totalReferenceLength = computed(() =>
	(props.skill.references ?? []).reduce(
		(total, reference) => total + referenceLength(reference),
		0,
	),
);
const referencesTotalError = computed(() => {
	if (totalReferenceLength.value <= AGENT_SKILL_REFERENCES_TOTAL_MAX_LENGTH) return '';
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
		nameIsValid.value &&
		formValidation.description &&
		(!selectedReference.value || formValidation.referenceName) &&
		instructionsValid.value &&
		referencesValid.value,
);
const instructionsCharacterCount = computed(() =>
	i18n.baseText('agents.builder.skills.instructions.characterCount', {
		interpolate: {
			count: instructionsLength.value.toLocaleString(),
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
const selectedReferenceCharacterCount = computed(() =>
	i18n.baseText('agents.builder.skills.references.characterCount' as BaseTextKey, {
		interpolate: {
			count: (selectedReference.value
				? referenceLength(selectedReference.value)
				: 0
			).toLocaleString(),
			max: AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH.toLocaleString(),
		},
	}),
);
const selectedReferenceError = computed(() => {
	const reference = selectedReference.value;
	if (!reference) return '';
	if (!reference.content.trim())
		return i18n.baseText('agents.builder.skills.references.contentRequired');
	if (referenceLength(reference) > AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH) {
		return i18n.baseText('agents.builder.skills.references.contentMaxLength', {
			interpolate: { max: AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH.toLocaleString() },
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

function onDescriptionValidate(valid: boolean) {
	formValidation.description = valid;
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
	<div :class="$style.panel" data-testid="agent-skill-viewer">
		<template v-if="isSkillFileSelected">
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
					focus-initially
					label-size="small"
					:placeholder="i18n.baseText('agents.builder.skills.name.placeholder')"
					:disabled="props.disabled"
					:show-validation-warnings="props.showValidationWarnings"
					:validation-rules="nameValidationRules"
					:validators="nameValidators"
					data-testid="agent-skill-name-input"
					@update:model-value="onNameInput"
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
					@validate="onDescriptionValidate"
				/>
			</div>

			<div :class="$style.field">
				<N8nInputLabel
					:class="$style.editorLabel"
					:label="i18n.baseText('agents.builder.skills.instructions.label')"
					:required="true"
					size="small"
				>
					<N8nMarkdownEditor
						:class="$style.editor"
						:model-value="props.skill.instructions ?? ''"
						:placeholder="i18n.baseText('agents.builder.skills.instructions.placeholder')"
						show-toolbar="floating"
						:readonly="props.disabled"
						max-height="none"
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
						<N8nText size="xsmall" color="text-light" :class="$style.characterCount">
							{{ instructionsCharacterCount }}
						</N8nText>
					</div>
				</N8nInputLabel>
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
		</template>

		<template v-else-if="selectedReference">
			<div :class="$style.field">
				<N8nFormInput
					:model-value="referenceFileName"
					:label="i18n.baseText('agents.builder.skills.references.name.label')"
					name="skill-reference-name"
					required
					focus-initially
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
					:class="[$style.editor, $style.referenceEditor]"
					:model-value="selectedReference.content"
					:placeholder="i18n.baseText('agents.builder.skills.references.content.placeholder')"
					show-toolbar="floating"
					:readonly="props.disabled"
					max-height="none"
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
					<N8nText size="xsmall" color="text-light" :class="$style.characterCount">
						{{ selectedReferenceCharacterCount }}
					</N8nText>
				</div>
			</N8nInputLabel>
		</template>

		<AgentModal
			:open="addToolDialogOpen"
			:title="i18n.baseText('agents.builder.skills.allowedTools.addModal.title' as BaseTextKey)"
			size="small"
			stacked
			:show-footer="false"
			@update:open="addToolDialogOpen = $event"
		>
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
		</AgentModal>
	</div>
</template>

<style lang="scss" module>
.panel {
	padding: var(--spacing--xl);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	min-width: 0;
	width: 100%;
	box-sizing: border-box;
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.editor {
	:global(.n8n-markdown) {
		min-height: calc(var(--height--5xl) + var(--spacing--sm));
	}
}

.referenceEditor {
	:global(.n8n-markdown) {
		min-height: calc(var(--height--5xl) + var(--height--4xl));
	}
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
}

.allowedToolOption {
	max-width: min(12rem, 100%);
}

.editorLabel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.editorMeta {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.characterCount {
	text-align: right;
}

@media (max-width: 480px) {
	.panel {
		padding: var(--spacing--md);
	}
}
</style>
