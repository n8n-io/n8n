<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH } from '@n8n/api-types';
import { N8nButton, N8nFormInput, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { Rule, RuleGroup } from '@/Interface';
import { codeEditorTheme } from '@/features/shared/editors/components/CodeNodeEditor/theme';
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
const container = ref<HTMLDivElement>();
const fileInput = ref<HTMLInputElement>();
const name = ref(props.skill.name);
const description = ref(props.skill.description);
const fileError = ref('');
const formValidation = reactive({
	name: false,
	description: false,
});
let view: EditorView | null = null;
let applyingExternalUpdate = false;

const editable = new Compartment();
const readOnly = new Compartment();

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

function createEditor(doc: string) {
	if (!container.value) return;
	view = new EditorView({
		state: EditorState.create({
			doc,
			extensions: [
				lineNumbers(),
				EditorView.lineWrapping,
				readOnly.of(EditorState.readOnly.of(props.disabled)),
				editable.of(EditorView.editable.of(!props.disabled)),
				EditorView.updateListener.of((update) => {
					if (!update.docChanged || applyingExternalUpdate) return;
					emit('update:skill', { instructions: update.state.doc.toString() });
				}),
				codeEditorTheme({ isReadOnly: props.disabled, maxHeight: '100%' }),
			],
		}),
		parent: container.value,
	});
}

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

function replaceInstructions(instructions: string) {
	fileError.value = '';
	if (view) {
		view.dispatch({
			changes: {
				from: 0,
				to: view.state.doc.length,
				insert: instructions,
			},
		});
		return;
	}
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

onMounted(() => createEditor(props.skill.instructions ?? ''));

onBeforeUnmount(() => {
	view?.destroy();
	view = null;
});

watch(
	() => props.skill.instructions,
	(next) => {
		if (!view) return;
		const nextDoc = next ?? '';
		if (view.state.doc.toString() === nextDoc) return;
		applyingExternalUpdate = true;
		view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: nextDoc } });
		applyingExternalUpdate = false;
	},
);

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
	() => props.disabled,
	(disabled) => {
		if (!view) return;
		view.dispatch({
			effects: [
				readOnly.reconfigure(EditorState.readOnly.of(disabled)),
				editable.reconfigure(EditorView.editable.of(!disabled)),
			],
		});
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
			<div ref="container" :class="$style.editor"></div>
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
	display: flex;
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius);
	overflow: hidden;
}

.editor :global(.cm-editor) {
	flex: 1;
	min-height: 0;
}
</style>
