<script setup lang="ts">
import { getSkillWorkflowMentionUrl, type SkillWorkflowMention } from '@n8n/api-types';
import {
	N8nMarkdownEditor,
	type DropdownMenuProps,
	type N8nMarkdownEditorEmits,
	type N8nMarkdownEditorProps,
} from '@n8n/design-system';
import { computed, nextTick, ref, shallowRef, useTemplateRef } from 'vue';
import { useRouter } from 'vue-router';

import { VIEWS } from '@/app/constants';
import { WORKFLOWS_IN_SKILLS_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { isMentionTrigger } from '@/features/ai/assistant-at-mentions/composables/useAssistantAtMentions';

import SkillWorkflowMentionPicker from './SkillWorkflowMentionPicker.vue';

type MarkdownEditor = N8nMarkdownEditorEmits['ready'][0];
type Transaction = MarkdownEditor['state']['tr'];
type EditorProps = NonNullable<N8nMarkdownEditorProps['editorProps']>;

defineOptions({ inheritAttrs: false });

const WORKFLOW_MENTION_URL_PREFIX = getSkillWorkflowMentionUrl('');

const props = withDefaults(
	defineProps<{
		modelValue: string;
		disabled?: boolean;
		mentionProjectId?: string;
		mentionProjectName?: string;
	}>(),
	{ disabled: false, mentionProjectId: undefined, mentionProjectName: undefined },
);

const posthog = usePostHog();
const router = useRouter();
const mentionsEnabled = computed(() =>
	posthog.isVariantEnabled(
		WORKFLOWS_IN_SKILLS_EXPERIMENT.name,
		WORKFLOWS_IN_SKILLS_EXPERIMENT.variant,
	),
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
	handleKeyDown(view, event) {
		if (pickerOpen.value) {
			picker.value?.handleExternalKeydown(event);
			return event.defaultPrevented;
		}
		if (
			!mentionsEnabled.value ||
			props.disabled ||
			(event.key !== 'Backspace' && event.key !== 'Delete')
		) {
			return false;
		}
		const { selection } = view.state;
		if (!selection.empty) return false;
		const mention = workflowMentionRanges(selection.$from).find(({ from, to }) =>
			event.key === 'Backspace' ? to === selection.from : from === selection.from,
		);
		if (!mention) return false;
		view.dispatch(view.state.tr.delete(mention.from, mention.to));
		return true;
	},
	handleClick(_view, _position, event) {
		if (!mentionsEnabled.value || !(event.target instanceof Element)) return false;
		const href = event.target.closest('a')?.getAttribute('href');
		if (!href?.startsWith(WORKFLOW_MENTION_URL_PREFIX)) return false;
		event.preventDefault();
		const workflowId = href.slice(WORKFLOW_MENTION_URL_PREFIX.length).split('?')[0];
		const { href: workflowUrl } = router.resolve({
			name: VIEWS.WORKFLOW,
			params: { workflowId },
		});
		window.open(workflowUrl, '_blank');
		return true;
	},
};

function workflowMentionRanges($position: MarkdownEditor['state']['selection']['$from']) {
	const ranges: Array<{ from: number; to: number; href: string }> = [];
	const start = $position.start();
	$position.parent.forEach((node, offset) => {
		const href: unknown = node.marks.find((mark) => mark.type.name === 'link')?.attrs.href;
		if (typeof href !== 'string' || !href.startsWith(WORKFLOW_MENTION_URL_PREFIX)) return;
		const from = start + offset;
		const previous = ranges.at(-1);
		if (previous?.to === from && previous.href === href) {
			previous.to = from + node.nodeSize;
		} else {
			ranges.push({ from, to: from + node.nodeSize, href });
		}
	});
	return ranges;
}

function closePicker() {
	pickerOpen.value = false;
	typedTriggerPosition.value = undefined;
	typedQuery.value = '';
}

function syncTypedQuery({ transaction }: { transaction: Transaction }) {
	const target = editor.value;
	const position = typedTriggerPosition.value;
	if (!target || position === undefined) return;
	if (!transaction.docChanged && transaction.selectionSet) {
		closePicker();
		return;
	}
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
	if (!open) closePicker();
}
</script>

<template>
	<div :class="$style.root">
		<N8nMarkdownEditor
			v-bind="$attrs"
			:model-value="props.modelValue"
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
@use './workflowMentionChip' as *;

.root {
	display: contents;
}

.workflowChips :global(.n8n-markdown a[href^='n8n://workflow/'])
{
	@include workflow-mention-chip;
}
</style>
