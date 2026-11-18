<script setup lang="ts">
import { N8nButton, N8nIcon, N8nKeyboardShortcut, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useTemplateRef } from 'vue';

import JsEditor from '@/features/shared/editors/components/JsEditor/JsEditor.vue';

const props = defineProps<{
	isDirty: boolean;
	isSaving: boolean;
}>();

const draft = defineModel<string>({ required: true });

const emit = defineEmits<{ save: [] }>();

const i18n = useI18n();
const editor = useTemplateRef<InstanceType<typeof JsEditor>>('editor');

function saveIfDirty() {
	if (props.isDirty) emit('save');
}

defineExpose({
	revealLine: (line: number) => editor.value?.revealLine(line),
});
</script>

<template>
	<section
		:class="$style.pane"
		data-testid="workflow-tests-editor"
		@keydown.meta.s.prevent.stop="saveIfDirty"
		@keydown.ctrl.s.prevent.stop="saveIfDirty"
	>
		<header :class="$style.header">
			<div :class="$style.file">
				<N8nIcon icon="file-code" size="small" :class="$style.fileIcon" />
				<N8nText size="small" bold>{{ i18n.baseText('workflowTests.editor.title') }}</N8nText>
				<span v-if="isDirty" :class="$style.unsaved" data-testid="workflow-tests-unsaved">
					<span :class="$style.dot" aria-hidden="true" />
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('workflowTests.editor.unsaved') }}
					</N8nText>
				</span>
			</div>
			<N8nTooltip :disabled="!isDirty">
				<template #content>
					<N8nKeyboardShortcut :keys="['s']" meta-key />
				</template>
				<N8nButton
					variant="outline"
					size="small"
					:disabled="!isDirty"
					:loading="isSaving"
					data-testid="workflow-tests-save"
					@click="emit('save')"
				>
					{{ i18n.baseText('workflowTests.save') }}
				</N8nButton>
			</N8nTooltip>
		</header>
		<div :class="$style.editor">
			<JsEditor ref="editor" v-model="draft" fill-parent />
		</div>
	</section>
</template>

<style module lang="scss">
.pane {
	display: flex;
	flex-direction: column;
	min-width: 0;
	min-height: 0;
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--background--surface);
	overflow: hidden;
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-bottom: var(--border);
}

.file {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex: 1;
	min-width: 0;
}

.fileIcon {
	color: var(--color--text--tint-1);
}

.unsaved {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.dot {
	width: var(--spacing--3xs);
	height: var(--spacing--3xs);
	border-radius: var(--radius--full);
	background-color: var(--color--warning);
}

.editor {
	flex: 1;
	min-height: 0;
}
</style>
