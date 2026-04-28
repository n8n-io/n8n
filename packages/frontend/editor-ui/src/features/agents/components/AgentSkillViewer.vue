<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { StreamLanguage, type StringStream } from '@codemirror/language';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { codeEditorTheme } from '@/features/shared/editors/components/CodeNodeEditor/theme';
import shared from '../styles/agent-panel.module.scss';
import type { AgentSkill } from '../types';

const props = withDefaults(
	defineProps<{
		skill: AgentSkill;
		disabled?: boolean;
	}>(),
	{ disabled: false },
);

const emit = defineEmits<{
	'update:skill': [updates: Partial<AgentSkill>];
}>();

const i18n = useI18n();
const container = ref<HTMLDivElement>();
const name = ref(props.skill.name);
const description = ref(props.skill.description);
let view: EditorView | null = null;
let applyingExternalUpdate = false;

const editable = new Compartment();
const readOnly = new Compartment();

interface MarkdownState {
	inFencedCode: boolean;
}

const markdownLanguage = StreamLanguage.define<MarkdownState>({
	name: 'markdown',
	startState: () => ({ inFencedCode: false }),
	token(stream: StringStream, state: MarkdownState) {
		if (stream.sol() && stream.match(/^```.*$/)) {
			state.inFencedCode = !state.inFencedCode;
			return 'processingInstruction';
		}

		if (state.inFencedCode) {
			stream.skipToEnd();
			return 'monospace';
		}

		if (stream.sol() && stream.match(/^#{1,6}(?=\s).*/)) return 'heading';
		if (stream.sol() && stream.match(/^>\s?.*/)) return 'quote';
		if (stream.sol() && stream.match(/^\s*(?:[-*+]|\d+\.)\s+/)) return 'list';
		if (stream.match(/`[^`]*`/)) return 'monospace';
		if (stream.match(/\*\*[^*]+\*\*/)) return 'strong';
		if (stream.match(/\*[^*]+\*/)) return 'emphasis';
		if (stream.match(/\[[^\]]+\]\([^)]+\)/)) return 'link';
		if (stream.match(/https?:\/\/\S+/)) return 'url';

		stream.next();
		return null;
	},
});

function createEditor(doc: string) {
	if (!container.value) return;
	view = new EditorView({
		state: EditorState.create({
			doc,
			extensions: [
				markdownLanguage,
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

function onNameInput(value: string) {
	name.value = value;
	emit('update:skill', { name: value });
}

function onDescriptionInput(value: string) {
	description.value = value;
	emit('update:skill', { description: value });
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
</script>

<template>
	<div :class="[$style.panel, shared.scrollbarThin]" data-testid="agent-skill-viewer">
		<div :class="$style.field">
			<label :class="$style.label">
				<N8nText size="small" :bold="true">{{
					i18n.baseText('agents.builder.skills.name.label')
				}}</N8nText>
			</label>
			<N8nInput
				:model-value="name"
				:placeholder="i18n.baseText('agents.builder.skills.name.placeholder')"
				:disabled="props.disabled"
				data-testid="agent-skill-name-input"
				@update:model-value="onNameInput"
			/>
		</div>

		<div :class="$style.field">
			<label :class="$style.label">
				<N8nText size="small" :bold="true">{{
					i18n.baseText('agents.builder.skills.description.label')
				}}</N8nText>
			</label>
			<N8nInput
				:model-value="description"
				:placeholder="i18n.baseText('agents.builder.skills.description.placeholder')"
				:disabled="props.disabled"
				data-testid="agent-skill-description-input"
				@update:model-value="onDescriptionInput"
			/>
		</div>

		<div :class="[$style.field, $style.instructionsField]">
			<label :class="$style.label">
				<N8nText size="small" :bold="true">{{
					i18n.baseText('agents.builder.skills.instructions.label')
				}}</N8nText>
			</label>
			<div ref="container" :class="$style.editor"></div>
			<N8nText size="xsmall" color="text-light">{{
				i18n.baseText('agents.builder.skills.instructions.characterCount', {
					interpolate: { count: String((skill.instructions ?? '').length) },
				})
			}}</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
.panel {
	padding: var(--spacing--lg);
	overflow-y: auto;
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	gap: var(--spacing--sm);
	width: 100%;
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
