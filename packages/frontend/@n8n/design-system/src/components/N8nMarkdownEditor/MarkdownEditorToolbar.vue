<script setup lang="ts">
import type { Editor } from '@tiptap/core';
import { computed } from 'vue';

import { t } from '@n8n/design-system/locale';

import N8nButton from '../N8nButton';
import { N8nDropdownMenu, type DropdownMenuItemProps } from '../N8nDropdownMenu';
import N8nIcon from '../N8nIcon';
import N8nToggle from '../N8nToggle';
import N8nToggleGroup from '../N8nToggleGroup';
import N8nTooltip from '../N8nTooltip';
import type { MarkdownEditorVariant, MarkdownEditorToolbarMode } from './MarkdownEditor.types';
import type { IconName } from '../N8nIcon';

const translate = (path: string) => t(path, undefined);

type ToolbarControl = {
	id: string;
	label: string;
	icon: IconName;
	command: ({ editor }: { editor: Editor }) => void;
};

const props = defineProps<{
	editor: Editor;
	disabled?: boolean;
	isRawMode?: boolean;
	mode: Exclude<MarkdownEditorToolbarMode, 'never'>;
	variant: MarkdownEditorVariant;
}>();

const emit = defineEmits<{
	'update:isRawMode': [value: boolean];
}>();

const markControls = computed<ToolbarControl[]>(() => [
	{
		id: 'bold',
		label: translate('markdownEditor.bold'),
		icon: 'bold',
		command: ({ editor }) => editor.chain().focus().toggleBold().run(),
	},
	{
		id: 'italic',
		label: translate('markdownEditor.italic'),
		icon: 'italic',
		command: ({ editor }) => editor.chain().focus().toggleItalic().run(),
	},
	{
		id: 'strike',
		label: translate('markdownEditor.strikethrough'),
		icon: 'strikethrough',
		command: ({ editor }) => editor.chain().focus().toggleStrike().run(),
	},
]);

const blockControls = computed<ToolbarControl[]>(() => [
	{
		id: 'bulletList',
		label: translate('markdownEditor.bulletList'),
		icon: 'list',
		command: ({ editor }) => editor.chain().focus().toggleBulletList().run(),
	},
	{
		id: 'taskList',
		label: translate('markdownEditor.taskList'),
		icon: 'list-checks',
		command: ({ editor }) => editor.chain().focus().toggleTaskList().run(),
	},
	{
		id: 'codeBlock',
		label: translate('markdownEditor.codeBlock'),
		icon: 'file-code',
		command: ({ editor }) => editor.chain().focus().toggleCodeBlock().run(),
	},
	{
		id: 'blockquote',
		label: translate('markdownEditor.blockquote'),
		icon: 'quote',
		command: ({ editor }) => editor.chain().focus().toggleBlockquote().run(),
	},
]);

const historyControls = computed<ToolbarControl[]>(() => [
	{
		id: 'undo',
		label: translate('markdownEditor.undo'),
		icon: 'undo-2',
		command: ({ editor }) => editor.chain().focus().undo().run(),
	},
	{
		id: 'redo',
		label: translate('markdownEditor.redo'),
		icon: 'redo-2',
		command: ({ editor }) => editor.chain().focus().redo().run(),
	},
]);

const textStyleOptions = computed<Array<DropdownMenuItemProps<string>>>(() => [
	{
		id: 'paragraph',
		label: translate('markdownEditor.text'),
		checked: activeTextStyle.value === 'paragraph',
	},
	{
		id: 'heading-1',
		label: translate('markdownEditor.heading1'),
		checked: activeTextStyle.value === 'heading-1',
	},
	{
		id: 'heading-2',
		label: translate('markdownEditor.heading2'),
		checked: activeTextStyle.value === 'heading-2',
	},
	{
		id: 'heading-3',
		label: translate('markdownEditor.heading3'),
		checked: activeTextStyle.value === 'heading-3',
	},
]);

const activeMarks = computed(() =>
	markControls.value
		.filter((control) => props.editor.isActive(control.id))
		.map((control) => control.id),
);

const activeBlocks = computed(() =>
	blockControls.value
		.filter((control) => props.editor.isActive(control.id))
		.map((control) => control.id),
);

const activeTextStyle = computed(() => {
	if (props.editor.isActive('heading', { level: 1 })) return 'heading-1';
	if (props.editor.isActive('heading', { level: 2 })) return 'heading-2';
	if (props.editor.isActive('heading', { level: 3 })) return 'heading-3';

	return 'paragraph';
});

const activeTextStyleLabel = computed(
	() =>
		textStyleOptions.value.find((option) => option.id === activeTextStyle.value)?.label ??
		translate('markdownEditor.text'),
);

const activeTextStyleIcon = computed<IconName>(() => {
	if (activeTextStyle.value === 'heading-1') return 'heading-1';
	if (activeTextStyle.value === 'heading-2') return 'heading-2';
	if (activeTextStyle.value === 'heading-3') return 'heading-3';

	return 'type';
});

const runControl = (control: ToolbarControl) => {
	if (props.disabled || props.isRawMode) return;

	control.command({ editor: props.editor });
};

const setTextStyle = (value: string | number) => {
	if (props.disabled || props.isRawMode) return;

	if (value === 'heading-1') {
		props.editor.chain().focus().toggleHeading({ level: 1 }).run();
		return;
	}

	if (value === 'heading-2') {
		props.editor.chain().focus().toggleHeading({ level: 2 }).run();
		return;
	}

	if (value === 'heading-3') {
		props.editor.chain().focus().toggleHeading({ level: 3 }).run();
		return;
	}

	props.editor.chain().focus().setParagraph().run();
};
</script>

<template>
	<div
		:class="[$style.toolbar, mode === 'always' ? $style.alwaysVisible : '']"
		data-test-id="markdown-editor-toolbar"
	>
		<div :class="[$style.toolbarInner, variant === 'contained' ? $style.containedToolbar : '']">
			<N8nTooltip :content="activeTextStyleLabel">
				<N8nDropdownMenu
					:items="textStyleOptions"
					:disabled="disabled || isRawMode"
					:class="$style.textStyleDropdown"
					placement="bottom-start"
					@select="setTextStyle"
				>
					<template #trigger>
						<N8nButton
							variant="ghost"
							size="small"
							:disabled="disabled || isRawMode"
							:class="$style.textStyleTrigger"
							:aria-label="activeTextStyleLabel"
						>
							<N8nIcon :icon="activeTextStyleIcon" size="small" />
							<N8nIcon icon="chevron-down" size="small" />
						</N8nButton>
					</template>
				</N8nDropdownMenu>
			</N8nTooltip>

			<N8nToggleGroup
				:model-value="activeMarks"
				type="multiple"
				variant="ghost"
				size="small"
				:disabled="disabled || isRawMode"
				:class="$style.toolbarGroup"
			>
				<template #default="slotProps">
					<N8nToggle
						v-for="control in markControls"
						:key="control.id"
						:value="control.id"
						:label="control.label"
						:icon="control.icon"
						v-bind="slotProps"
						@click="runControl(control)"
					/>
				</template>
			</N8nToggleGroup>

			<N8nToggleGroup
				:model-value="activeBlocks"
				type="multiple"
				variant="ghost"
				size="small"
				:disabled="disabled || isRawMode"
				:class="$style.toolbarGroup"
			>
				<template #default="slotProps">
					<N8nToggle
						v-for="control in blockControls"
						:key="control.id"
						:value="control.id"
						:label="control.label"
						:icon="control.icon"
						v-bind="slotProps"
						@click="runControl(control)"
					/>
				</template>
			</N8nToggleGroup>

			<N8nToggleGroup
				:model-value="[]"
				type="multiple"
				variant="ghost"
				size="small"
				:disabled="disabled || isRawMode"
				:class="$style.toolbarGroup"
			>
				<template #default="slotProps">
					<N8nToggle
						v-for="control in historyControls"
						:key="control.id"
						:value="control.id"
						:label="control.label"
						:icon="control.icon"
						v-bind="slotProps"
						@click="runControl(control)"
					/>
				</template>
			</N8nToggleGroup>

			<div :class="[$style.toolbarGroup, $style.rawToggleGroup]">
				<N8nToggle
					:model-value="isRawMode"
					:label="
						isRawMode
							? translate('markdownEditor.formattedMarkdownView')
							: translate('markdownEditor.rawMarkdownView')
					"
					icon="file-code"
					variant="ghost"
					size="small"
					:disabled="disabled"
					@update:model-value="emit('update:isRawMode', $event)"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.toolbar {
	position: absolute;
	inset-inline: 0;
	top: 0;
	padding: 2px;
	z-index: 1;
	opacity: 0;
	visibility: hidden;
	pointer-events: none;
}

.toolbarInner {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	height: var(--height--lg);
	padding: var(--spacing--3xs) var(--spacing--3xs);
	background-color: var(--n8n--markdown-editor--background-color, var(--background--surface));
	transition:
		opacity var(--duration--snappy) var(--easing--ease-out),
		visibility var(--duration--snappy) var(--easing--ease-out);
}

.containedToolbar {
	border-bottom: var(--border);
}

:global(.n8n-markdown-editor-container:hover) .toolbar,
:global(.n8n-markdown-editor-container:focus-within) .toolbar,
.toolbar:has(:global([data-state='open'])),
.alwaysVisible {
	opacity: 1;
	visibility: visible;
	pointer-events: auto;
}

.textStyleDropdown {
	flex: 0 0 auto;
}

.textStyleTrigger {
	gap: var(--spacing--4xs);
	padding-inline: var(--spacing--2xs);
}

.toolbarGroup {
	&:not(:last-child)::after {
		content: '';
		width: 1px;
		height: var(--height--xs);
		margin-inline-start: var(--spacing--3xs);
		background-color: var(--border-color);
	}
}

.rawToggleGroup {
	display: inline-flex;
	align-items: center;
}
</style>
