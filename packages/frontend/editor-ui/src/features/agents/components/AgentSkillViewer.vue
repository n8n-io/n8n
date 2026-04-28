<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { codeEditorTheme } from '@/features/shared/editors/components/CodeNodeEditor/theme';
import type { AgentSkill } from '../types';

const props = defineProps<{ skill: AgentSkill }>();

const i18n = useI18n();
const container = ref<HTMLDivElement>();
let view: EditorView | null = null;

function createEditor(doc: string) {
	if (!container.value) return;
	view = new EditorView({
		state: EditorState.create({
			doc,
			extensions: [
				lineNumbers(),
				EditorView.lineWrapping,
				EditorState.readOnly.of(true),
				EditorView.editable.of(false),
				codeEditorTheme({ isReadOnly: true, maxHeight: '100%' }),
			],
		}),
		parent: container.value,
	});
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
		view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: nextDoc } });
	},
);
</script>

<template>
	<div :class="$style.wrapper" data-testid="agent-skill-viewer">
		<div :class="$style.header">
			<N8nText tag="h3" size="large" :bold="true">{{ skill.name }}</N8nText>
			<N8nText v-if="skill.description" size="small" color="text-light">{{
				skill.description
			}}</N8nText>
		</div>
		<N8nText size="small" color="text-light" :class="$style.label">{{
			i18n.baseText('agents.builder.skills.instructions')
		}}</N8nText>
		<div ref="container" :class="$style.editor"></div>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--lg) var(--spacing--lg) var(--spacing--sm);
	border-bottom: var(--border);
}

.label {
	padding: var(--spacing--sm) var(--spacing--lg);
	border-bottom: var(--border);
}

.editor {
	flex: 1;
	min-height: 0;
	overflow: auto;
}

.editor :global(.cm-editor) {
	border: none;
	border-radius: 0;
	height: 100%;
}
</style>
