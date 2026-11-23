<script setup lang="ts">
import { getSkillWorkflowMentionUrl, type SkillWorkflowMention } from '@n8n/api-types';
import {
	N8nMarkdownEditor,
	type DropdownMenuProps,
	type N8nMarkdownEditorEmits,
	type N8nMarkdownEditorProps,
} from '@n8n/design-system';
import { computed, nextTick, ref, shallowRef, useTemplateRef } from 'vue';

import { WORKFLOWS_IN_SKILLS_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { isMentionTrigger } from '@/features/ai/assistant-at-mentions/composables/useAssistantAtMentions';

import SkillWorkflowMentionPicker from './SkillWorkflowMentionPicker.vue';

type MarkdownEditor = N8nMarkdownEditorEmits['ready'][0];
type EditorProps = NonNullable<N8nMarkdownEditorProps['editorProps']>;

defineOptions({ inheritAttrs: false });

const props = withDefaults(
	defineProps<{
		disabled?: boolean;
		mentionProjectId?: string;
		mentionProjectName?: string;
	}>(),
	{ disabled: false, mentionProjectId: undefined, mentionProjectName: undefined },
);

const posthog = usePostHog();
const mentionsEnabled = computed(() =>
	posthog.isFeatureEnabled(WORKFLOWS_IN_SKILLS_EXPERIMENT.name),
);
const editor = shallowRef<MarkdownEditor>();
const picker = useTemplateRef<InstanceType<typeof SkillWorkflowMentionPicker>>('picker');
const pickerOpen = ref(false);
const typedTriggerPosition = ref<number>();
const typedQuery = ref('');

const caretReference: DropdownMenuProps['reference'] = {
	getBoundingClientRect: () => {
		const position = typedTriggerPosition.value;
		const view = editor.value?.view;
		if (position === undefined || !view) return new DOMRect();
		const { left, top, bottom } = view.coordsAtPos(position);
		return new DOMRect(left, top, 0, bottom - top);
	},
};

const editorProps: EditorProps = {
	handleTextInput(view, from, _to, text) {
		if (!mentionsEnabled.value || props.disabled || !isMentionTrigger(text)) return false;
		const $from = view.state.doc.resolve(from);
		if ($from.parent.type.spec.code || $from.marks().some((mark) => mark.type.spec.code)) {
			return false;
		}
		const previousCharacter = view.state.doc.textBetween(Math.max($from.start(), from - 1), from);
		if (previousCharacter && !/\s/.test(previousCharacter)) return false;
		void nextTick(() => {
			typedTriggerPosition.value = from;
			typedQuery.value = '';
			pickerOpen.value = true;
		});
		return false;
	},
	handleKeyDown(_view, event) {
		if (!pickerOpen.value) return false;
		return picker.value?.handleExternalKeydown(event) ?? false;
	},
};

function closePicker() {
	pickerOpen.value = false;
	typedTriggerPosition.value = undefined;
	typedQuery.value = '';
}

function syncTypedQuery() {
	const target = editor.value;
	const position = typedTriggerPosition.value;
	if (!target || position === undefined) return;
	const { doc, selection } = target.state;
	const query =
		selection.empty && selection.from > position
			? doc.textBetween(position + 1, selection.from, '\n')
			: '\n';
	if (query.includes('\n') || !isMentionTrigger(doc.textBetween(position, position + 1))) {
		closePicker();
		return;
	}
	typedQuery.value = query;
}

function onReady(target: MarkdownEditor) {
	editor.value = target;
	target.on('transaction', syncTypedQuery);
}

function onSelect(mention: SkillWorkflowMention) {
	const target = editor.value;
	const position = typedTriggerPosition.value;
	if (!target || position === undefined) return;
	target
		.chain()
		.focus()
		.insertContentAt({ from: position, to: target.state.selection.from }, [
			{
				type: 'text',
				text: mention.name,
				marks: [{ type: 'link', attrs: { href: getSkillWorkflowMentionUrl(mention.workflowId) } }],
			},
			{ type: 'text', text: ' ' },
		])
		.run();
}

function onPickerOpenChange(open: boolean) {
	if (open) return;
	closePicker();
	editor.value?.commands.focus();
}
</script>

<template>
	<div :class="$style.root">
		<N8nMarkdownEditor
			v-bind="$attrs"
			:class="mentionsEnabled && $style.workflowChips"
			:disabled="props.disabled"
			:editor-props="editorProps"
			@ready="onReady"
		/>
		<SkillWorkflowMentionPicker
			v-if="mentionsEnabled && !props.disabled"
			ref="picker"
			mode="typed"
			:open="pickerOpen"
			:query="typedQuery"
			:project-id="props.mentionProjectId"
			:project-name="props.mentionProjectName"
			:reference="caretReference"
			:focus-target="editor?.view.dom"
			@update:open="onPickerOpenChange"
			@select="onSelect"
		/>
	</div>
</template>

<style lang="scss" module>
.root {
	display: contents;
}

.workflowChips :global(.n8n-markdown a[href^='n8n://workflow/'])
{
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: 0 var(--spacing--3xs);
	border-radius: var(--radius--3xs);
	background: color-mix(in oklch, var(--color--secondary) 14%, transparent);
	color: var(--color--secondary);
	font-weight: var(--font-weight--medium);
	text-decoration: none;

	&::before {
		content: '';
		width: var(--spacing--xs);
		height: var(--spacing--xs);
		flex-shrink: 0;
		background: currentColor;
		mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 7h6a4 4 0 0 1 4 4v2a4 4 0 0 0 4 4h4'/%3E%3Cpath d='M3 17h5'/%3E%3Cpath d='M16 7h5'/%3E%3C/svg%3E")
			center / contain no-repeat;
	}
}
</style>
