<script setup lang="ts">
import type { Editor } from '@tiptap/core';
import { computed, nextTick, ref } from 'vue';

import N8nButton from '../N8nButton';
import N8nDropdown, { type N8nDropdownOption } from '../N8nDropdown';
import N8nIcon from '../N8nIcon';
import N8nInput from '../N8nInput';
import N8nPopover from '../N8nPopover';
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
	mode: Exclude<MarkdownEditorToolbarMode, 'never'>;
	variant: MarkdownEditorVariant;
}>();

const linkPopoverOpen = ref(false);
const linkUrl = ref('');
const linkInput = ref<InstanceType<typeof N8nInput>>();

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

const linkValue = computed(() => (props.editor.isActive('link') ? ['link'] : []));
const linkControl = computed(() => getCommand('link'));

const runControl = (control: ToolbarControl) => {
	if (props.disabled) return;

	control.command({ editor: props.editor });
};

const setTextStyle = (value: string | number) => {
	if (props.disabled) return;

	getCommand(String(value))?.command({ editor: props.editor });
};

const getActiveLinkHref = () => {
	const href = props.editor.getAttributes('link').href;

	return typeof href === 'string' ? href : '';
};

const openLinkPopover = async () => {
	if (props.disabled) return;

	linkUrl.value = getActiveLinkHref();
	linkPopoverOpen.value = true;
	await nextTick();
	linkInput.value?.focus();
};

const applyLink = () => {
	if (props.disabled) return;

	if (!linkUrl.value) {
		props.editor.chain().focus().unsetLink().run();
		linkPopoverOpen.value = false;
		return;
	}

	props.editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl.value }).run();
	linkPopoverOpen.value = false;
};

const removeLink = () => {
	if (props.disabled) return;

	props.editor.chain().focus().unsetLink().run();
	linkPopoverOpen.value = false;
};

const handleLinkInputKeydown = (event: KeyboardEvent) => {
	if (event.key !== 'Enter') return;

	event.preventDefault();
	applyLink();
};
</script>

<template>
	<div
		:class="[$style.toolbar, mode === 'always' ? $style.alwaysVisible : '']"
		data-test-id="markdown-editor-toolbar"
	>
		<div :class="[$style.toolbarInner, variant === 'textbox' ? $style.textboxToolbar : '']">
			<N8nDropdown
				:options="textStyleOptions"
				:placeholder="activeTextStyleLabel"
				size="small"
				:disabled="disabled"
				:class="$style.textStyleDropdown"
				@select="setTextStyle"
			>
				<template #trigger>
					<N8nButton
						variant="ghost"
						size="small"
						:disabled="disabled"
						:class="$style.textStyleTrigger"
					>
						<span>{{ activeTextStyleLabel }}</span>
						<N8nIcon icon="chevron-down" size="small" />
					</N8nButton>
				</template>
			</N8nDropdown>

			<N8nToggleGroup
				:model-value="activeMarks"
				type="multiple"
				variant="ghost"
				size="small"
				:disabled="disabled"
				:class="$style.toolbarGroup"
			>
				<template #default="slotProps">
					<N8nToggle
						v-for="control in markControls"
						:key="control.id"
						:value="control.id"
						:label="control.label"
						:icon="control.icon"
						:disabled="disabled"
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
				:disabled="disabled"
				:class="$style.toolbarGroup"
			>
				<template #default="slotProps">
					<N8nToggle
						v-for="control in blockControls"
						:key="control.id"
						:value="control.id"
						:label="control.label"
						:icon="control.icon"
						:disabled="disabled"
						v-bind="slotProps"
						@click="runControl(control)"
					/>
				</template>
			</N8nToggleGroup>

			<N8nPopover
				v-model:open="linkPopoverOpen"
				width="280px"
				:content-class="$style.linkPopover"
				:enable-scrolling="false"
				:suppress-auto-focus="true"
			>
				<template #trigger>
					<N8nToggleGroup
						:model-value="linkValue"
						type="multiple"
						variant="ghost"
						size="small"
						:disabled="disabled"
						:class="$style.toolbarGroup"
					>
						<template #default="slotProps">
							<N8nToggle
								value="link"
								:label="linkControl?.label ?? translate('markdownEditor.link')"
								icon="link"
								:disabled="disabled"
								v-bind="slotProps"
								@click="openLinkPopover"
							/>
						</template>
					</N8nToggleGroup>
				</template>

				<template #content>
					<form :class="$style.linkForm" @submit.prevent="applyLink">
						<label :class="$style.linkLabel" for="markdown-editor-link-url">
							{{ translate('markdownEditor.linkUrlLabel') }}
						</label>
						<N8nInput
							id="markdown-editor-link-url"
							ref="linkInput"
							v-model="linkUrl"
							size="small"
							type="text"
							:placeholder="translate('markdownEditor.linkUrlPlaceholder')"
							autocomplete="off"
							@keydown="handleLinkInputKeydown"
						/>
						<div :class="$style.linkActions">
							<N8nButton
								v-if="props.editor.isActive('link')"
								type="button"
								variant="ghost"
								size="small"
								@click="removeLink"
							>
								{{ translate('markdownEditor.removeLink') }}
							</N8nButton>
							<N8nButton type="submit" variant="solid" size="small">
								{{ translate('markdownEditor.applyLink') }}
							</N8nButton>
						</div>
					</form>
				</template>
			</N8nPopover>

			<N8nToggleGroup
				:model-value="[]"
				type="multiple"
				variant="ghost"
				size="small"
				:disabled="disabled"
				:class="$style.toolbarGroup"
			>
				<template #default="slotProps">
					<N8nToggle
						v-for="control in historyControls"
						:key="control.id"
						:value="control.id"
						:label="control.label"
						:icon="control.icon"
						:disabled="disabled"
						v-bind="slotProps"
						@click="runControl(control)"
					/>
				</template>
			</N8nToggleGroup>
		</div>
	</div>
</template>

<style lang="scss" module>
.toolbar {
	/* position: absolute;
	inset-inline: 0;
	bottom: 0; */
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
	background-color: var(--n8n--markdown-editor--background-color, transparent);
	transition:
		opacity var(--duration--snappy) var(--easing--ease-out),
		visibility var(--duration--snappy) var(--easing--ease-out);
}

.textboxToolbar {
	border-top: var(--border);
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
	justify-content: space-between;
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

.linkPopover {
	padding: var(--spacing--xs);
}

.linkForm {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.linkLabel {
	color: var(--text-color);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
}

.linkActions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
