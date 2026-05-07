<script setup lang="ts">
import type { Editor } from '@tiptap/core';
import { computed } from 'vue';

import N8nButton from '../N8nButton';
import N8nDropdown, { type N8nDropdownOption } from '../N8nDropdown';
import N8nIcon from '../N8nIcon';
import N8nTooltip from '../N8nTooltip';
import N8nToggle from '../N8nToggle';
import N8nToggleGroup from '../N8nToggleGroup';
import { t } from '../../locale';
import type { MarkdownEditorVariant } from './MarkdownEditor.types';
import type { MarkdownEditorToolbarMode } from './MarkdownEditor.types';
import { createMarkdownSlashCommands } from './extensions/slashCommands';
import type { MarkdownSlashCommand } from './extensions/slashCommands/types';

const translate = (path: string) => t(path, undefined);

type ToolbarControl = Pick<MarkdownSlashCommand, 'id' | 'label' | 'icon' | 'command'>;

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

const markdownCommands = computed(() => createMarkdownSlashCommands());

const getCommand = (id: string) => markdownCommands.value.get(id);

const getCommands = (ids: string[]) =>
	ids
		.map((id) => getCommand(id))
		.filter((command): command is ToolbarControl => command !== undefined);

const markControls = computed<ToolbarControl[]>(() => getCommands(['bold', 'italic', 'strike']));

const blockControls = computed<ToolbarControl[]>(() =>
	getCommands(['bulletList', 'taskList', 'codeBlock', 'blockquote']),
);

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

const textStyleOptions = computed<Array<N8nDropdownOption<string>>>(() =>
	getCommands(['paragraph', 'heading-1', 'heading-2', 'heading-3']).map((command) => ({
		label: command.label,
		value: command.id,
		active: command.id === activeTextStyle.value,
	})),
);

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
		textStyleOptions.value.find((option) => option.value === activeTextStyle.value)?.label ??
		translate('markdownEditor.text'),
);

const activeTextStyleIcon = computed(() => getCommand(activeTextStyle.value)?.icon ?? 'type');

const runControl = (control: ToolbarControl) => {
	if (props.disabled || props.isRawMode) return;

	control.command({ editor: props.editor });
};

const setTextStyle = (value: string | number) => {
	if (props.disabled || props.isRawMode) return;

	getCommand(String(value))?.command({ editor: props.editor });
};
</script>

<template>
	<div
		:class="[$style.toolbar, mode === 'always' ? $style.alwaysVisible : '']"
		data-test-id="markdown-editor-toolbar"
	>
		<div :class="[$style.toolbarInner, variant === 'contained' ? $style.containedToolbar : '']">
			<N8nTooltip :content="activeTextStyleLabel">
				<N8nDropdown
					:options="textStyleOptions"
					:placeholder="activeTextStyleLabel"
					size="small"
					:disabled="disabled || isRawMode"
					:class="$style.textStyleDropdown"
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
				</N8nDropdown>
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
						:disabled="disabled || isRawMode"
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
						:disabled="disabled || isRawMode"
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
						:disabled="disabled || isRawMode"
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
