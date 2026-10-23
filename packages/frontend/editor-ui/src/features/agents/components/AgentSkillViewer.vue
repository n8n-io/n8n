<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import {
	AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH,
	AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH,
	AGENT_SKILL_REFERENCE_MAX_COUNT,
	AGENT_SKILL_REFERENCES_TOTAL_MAX_LENGTH,
} from '@n8n/api-types';
import {
	N8nFormInput,
	N8nInputLabel,
	N8nMarkdown,
	N8nMarkdownEditor,
	N8nText,
} from '@n8n/design-system';
import type { IValidator, Validatable } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import type { Rule, RuleGroup } from '@/Interface';
import type { AgentSkill, AgentSkillReference } from '../types';

const SKILL_FILE = 'SKILL.md';
const READ_ONLY_MARKDOWN_OPTIONS = {
	tasklists: { enabled: false, label: true, labelAfter: false },
};

const props = withDefaults(
	defineProps<{
		skill: AgentSkill;
		disabled?: boolean;
		readOnly?: boolean;
		errors?: Partial<Record<keyof AgentSkill, string>>;
		selectedPath?: string;
		showValidationWarnings?: boolean;
	}>(),
	{
		disabled: false,
		readOnly: false,
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
const description = ref(props.skill.description);
const referenceFileName = ref('');
const formValidation = reactive({
	description: false,
	referenceName: true,
});

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
	// Name the file, so the user knows which reference blocks the save.
	const [first] = invalidReferences.value;
	if (!first) return i18n.baseText('agents.builder.skills.references.invalidSummary');
	if (!first.content.trim()) {
		return i18n.baseText('agents.builder.skills.references.emptyFile', {
			interpolate: { path: first.path },
		});
	}
	return i18n.baseText('agents.builder.skills.references.tooLongFile', {
		interpolate: {
			path: first.path,
			max: AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH.toLocaleString(),
		},
	});
});

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
		<template v-if="props.readOnly">
			<template v-if="isSkillFileSelected">
				<N8nInputLabel
					:class="$style.readOnlyField"
					:label="i18n.baseText('agents.builder.skills.description.label')"
					size="medium"
					color="text-light"
				>
					<N8nText
						tag="p"
						color="text-base"
						:class="$style.readOnlyText"
						data-testid="agent-skill-description-text"
						>{{ props.skill.description }}</N8nText
					>
				</N8nInputLabel>
				<N8nInputLabel
					:class="$style.readOnlyField"
					:label="i18n.baseText('agents.builder.skills.instructions.label')"
					size="medium"
					color="text-light"
				>
					<N8nMarkdown
						:class="$style.readOnlyMarkdown"
						:options="READ_ONLY_MARKDOWN_OPTIONS"
						:content="props.skill.instructions"
						data-testid="agent-skill-instructions-text"
					/>
				</N8nInputLabel>
			</template>
			<N8nInputLabel
				v-else-if="selectedReference"
				:class="$style.readOnlyField"
				:label="selectedReference.path"
				size="medium"
				color="text-light"
			>
				<N8nMarkdown
					:class="$style.readOnlyMarkdown"
					:options="READ_ONLY_MARKDOWN_OPTIONS"
					:content="selectedReference.content"
					data-testid="agent-skill-reference-text"
				/>
			</N8nInputLabel>
		</template>

		<template v-else-if="isSkillFileSelected">
			<!-- A form-level notice, above the fields, so it does not read as an error of the first one. -->
			<N8nText
				v-if="referencesError"
				size="small"
				color="danger"
				data-testid="agent-skill-references-error"
				>{{ referencesError }}</N8nText
			>
			<N8nText v-if="props.errors?.references && !referencesError" size="small" color="danger">{{
				props.errors.references
			}}</N8nText>
			<slot name="fields-start" />

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
	</div>
</template>

<style lang="scss" module>
.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	min-width: 0;
	width: 100%;
	box-sizing: border-box;
}

.readOnlyField {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.readOnlyText {
	margin: 0;
	line-height: var(--line-height--xl);
	white-space: pre-wrap;
}

.panel .readOnlyMarkdown {
	:global(p),
	:global(li) {
		font-size: var(--font-size--sm);
		line-height: var(--line-height--xl);
	}

	:global(h1),
	:global(h2) {
		margin: var(--spacing--sm) 0 var(--spacing--2xs);
		font-size: var(--font-size--md);
		line-height: var(--line-height--lg);
	}

	:global(h3),
	:global(h4),
	:global(h5),
	:global(h6) {
		margin: var(--spacing--xs) 0 var(--spacing--3xs);
		font-size: var(--font-size--sm);
		line-height: var(--line-height--lg);
	}

	:global(:is(h1, h2, h3, h4, h5, h6):first-child) {
		margin-top: 0;
	}
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
</style>
