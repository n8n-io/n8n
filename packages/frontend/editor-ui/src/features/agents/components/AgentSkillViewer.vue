<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import {
	AGENT_SKILL_DESCRIPTION_MAX_LENGTH,
	AGENT_SKILL_BINARY_CONTENT_MAX_LENGTH,
	AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH,
	AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH,
	AGENT_SKILL_REFERENCE_MAX_COUNT,
	AGENT_SKILL_REFERENCES_TOTAL_MAX_LENGTH,
} from '@n8n/api-types';
import {
	N8nFormInput,
	N8nButton,
	N8nInputLabel,
	N8nMarkdown,
	N8nMarkdownEditor,
	N8nText,
} from '@n8n/design-system';
import type { IValidator, Validatable } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { saveAs } from 'file-saver';
import { base64ToFile } from '@/app/utils/fileUtils';
import {
	readSkillFileLink,
	resolveSkillFileLink,
	skillFileLinkPlugin,
} from '@/features/agents/utils/skillFileLinks';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import type { Rule, RuleGroup } from '@/Interface';
import type { AgentSkill, AgentSkillReference } from '../types';
import AgentSkillMermaidDiagram from './AgentSkillMermaidDiagram.vue';
import type { SkillMermaidResult } from './skillMermaidRenderer';

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

// A relative link in SKILL.md or in a Markdown file opens the linked file in this view.
const readOnlyMarkdownPlugins = computed(() => {
	const fromPath = props.selectedPath;
	const paths = (props.skill.references ?? []).map((reference) => reference.path);
	return [skillFileLinkPlugin((href) => resolveSkillFileLink(href, fromPath, paths))];
});

function onReadOnlyLinkClick(link: HTMLAnchorElement, event: MouseEvent) {
	if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
		return;
	const { handled, path } = readSkillFileLink(link.getAttribute('href'));
	if (!handled) return;
	event.preventDefault();
	if (path !== undefined) emit('select:path', path);
}
const telemetry = useTelemetry();
const description = ref(props.skill.description);
const referenceFileName = ref('');
const formValidation = reactive({
	description: false,
	referenceName: true,
});

const descriptionValidationRules: Array<Rule | RuleGroup> = [
	{ name: 'MAX_LENGTH', config: { maximum: AGENT_SKILL_DESCRIPTION_MAX_LENGTH } },
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
const referenceLimit = (reference: AgentSkillReference) =>
	reference.isBinary
		? AGENT_SKILL_BINARY_CONTENT_MAX_LENGTH
		: AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH;
const invalidReferences = computed(() =>
	(props.skill.references ?? []).filter(
		(reference) => referenceLength(reference) > referenceLimit(reference),
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
const selectedReferenceCanRename = computed(
	() =>
		!!selectedReference.value &&
		!selectedReference.value.isBinary &&
		/^references\/[A-Za-z0-9 _-]+\.md$/.test(selectedReference.value.path),
);
const selectedReferenceIsMarkdown = computed(() => /\.(md|markdown)$/i.test(props.selectedPath));
const selectedReferenceIsEditable = computed(
	() => selectedReferenceIsMarkdown.value && !selectedReference.value?.isBinary,
);

function downloadBinaryFile() {
	const file = selectedReference.value;
	if (!file?.isBinary) return;
	const name = file.path.split('/').at(-1) ?? file.path;
	saveAs(base64ToFile(file.content, name, 'application/octet-stream'), name);
}

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
	if (referenceLength(reference) > referenceLimit(reference)) {
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
	return i18n.baseText('agents.builder.skills.references.tooLongFile', {
		interpolate: {
			path: first.path,
			max: referenceLimit(first).toLocaleString(),
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

// Count the diagram renders of one file view, and report them together when the last one ends.
const openDiagramRenders = ref(0);
const newDiagramCounts = () => ({ rendered: 0, invalid: 0, failed: 0, timeout: 0 });
let diagramCounts = newDiagramCounts();
// The file of the open renders. The selected file can change before the last render ends.
let diagramFile: 'skill' | 'reference' = 'skill';

function onDiagramRenderStart() {
	if (openDiagramRenders.value === 0) {
		diagramFile = isSkillFileSelected.value ? 'skill' : 'reference';
	}
	openDiagramRenders.value++;
}

function onDiagramRenderEnd(outcome: SkillMermaidResult['outcome']) {
	openDiagramRenders.value--;
	if (outcome !== 'aborted') diagramCounts[outcome]++;
	if (openDiagramRenders.value > 0) return;

	const { rendered, invalid, failed, timeout } = diagramCounts;
	diagramCounts = newDiagramCounts();
	if (rendered + invalid + failed + timeout === 0) return;
	try {
		telemetry.track(TELEMETRY_EVENT.CONTEXT.USER_VIEWED_SKILL_DIAGRAMS, {
			file: diagramFile,
			rendered,
			invalid,
			failed,
			timed_out: timeout,
		});
	} catch {
		// Telemetry must not break the skill view.
	}
}
</script>

<template>
	<div :class="$style.panel" data-testid="agent-skill-viewer">
		<template v-if="props.readOnly && isSkillFileSelected">
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
					:plugins="readOnlyMarkdownPlugins"
					:content="props.skill.instructions"
					data-testid="agent-skill-instructions-text"
					@markdown-click="onReadOnlyLinkClick"
				>
					<template #code-block="{ code, language }">
						<AgentSkillMermaidDiagram
							v-if="language.toLowerCase() === 'mermaid'"
							:code="code"
							@render-start="onDiagramRenderStart"
							@render-end="onDiagramRenderEnd"
						>
							<pre :class="$style.codeBlock"><code>{{ code }}</code></pre>
						</AgentSkillMermaidDiagram>
						<pre v-else :class="$style.codeBlock"><code>{{ code }}</code></pre>
					</template>
				</N8nMarkdown>
			</N8nInputLabel>
		</template>
		<N8nInputLabel
			v-else-if="selectedReference && (props.readOnly || !selectedReferenceIsEditable)"
			:class="$style.readOnlyField"
			:label="selectedReference.path"
			size="medium"
			color="text-light"
		>
			<template v-if="selectedReference.isBinary">
				<N8nText size="small">{{ i18n.baseText('agents.builder.skills.files.binary') }}</N8nText>
				<N8nButton
					variant="outline"
					size="small"
					icon="download"
					:class="$style.download"
					@click="downloadBinaryFile"
				>
					{{ i18n.baseText('agents.builder.skills.files.download') }}
				</N8nButton>
			</template>
			<N8nMarkdown
				v-else-if="selectedReferenceIsMarkdown"
				:class="$style.readOnlyMarkdown"
				:options="READ_ONLY_MARKDOWN_OPTIONS"
				:plugins="readOnlyMarkdownPlugins"
				:content="selectedReference.content"
				data-testid="agent-skill-reference-text"
				@markdown-click="onReadOnlyLinkClick"
			>
				<template #code-block="{ code, language }">
					<AgentSkillMermaidDiagram
						v-if="language.toLowerCase() === 'mermaid'"
						:code="code"
						@render-start="onDiagramRenderStart"
						@render-end="onDiagramRenderEnd"
					>
						<pre :class="$style.codeBlock"><code>{{ code }}</code></pre>
					</AgentSkillMermaidDiagram>
					<pre v-else :class="$style.codeBlock"><code>{{ code }}</code></pre>
				</template>
			</N8nMarkdown>
			<pre v-else :class="$style.readOnlyText" data-testid="agent-skill-reference-text">{{
				selectedReference.content
			}}</pre>
		</N8nInputLabel>

		<template v-else-if="!props.readOnly && isSkillFileSelected">
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
						:container-class="$style.resizable"
						:model-value="props.skill.instructions ?? ''"
						:placeholder="i18n.baseText('agents.builder.skills.instructions.placeholder')"
						show-toolbar="floating"
						:disabled="props.disabled"
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

		<template v-else-if="!props.readOnly && selectedReference">
			<div v-if="selectedReferenceCanRename" :class="$style.field">
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
			<N8nText v-else size="small" color="text-light">{{ selectedReference.path }}</N8nText>
			<N8nInputLabel
				:class="$style.editorLabel"
				:label="i18n.baseText('agents.builder.skills.references.content.label')"
				size="small"
			>
				<N8nMarkdownEditor
					:class="[$style.editor, $style.referenceEditor]"
					:model-value="selectedReference.content"
					:placeholder="i18n.baseText('agents.builder.skills.references.content.placeholder')"
					show-toolbar="floating"
					:disabled="props.disabled"
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
	overflow-wrap: anywhere;
}

.download {
	align-self: flex-start;
}

.panel .readOnlyMarkdown {
	--n8n-markdown--font-size--base: var(--font-size--sm);

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

	:global(li label) {
		display: inline;
		line-height: inherit;
	}
}

.codeBlock {
	margin: 0;
	padding: calc(var(--n8n-markdown--spacing) * 2);
	overflow-x: auto;
	white-space: pre-wrap;
	font-family: var(--font-family--monospace);
	font-size: calc(var(--n8n-markdown--font-size--base) * 0.875);
	line-height: var(--line-height--xl);
	color: var(--color--text--shade-1);
	background: var(--background--subtle);
	border: var(--border);
	border-radius: var(--n8n-markdown--radius);
	tab-size: 4;
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

/* The user drags the bottom edge to make the box taller or shorter. Doubled, so it wins over the
   editor's own overflow. The text scrolls inside the editor's content, which clips it by default,
   so a shorter box still shows all of it. */
.resizable.resizable {
	resize: vertical;
	overflow: hidden;

	:global([data-markdown-editor-content-wrapper]) {
		overflow-y: auto;
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
