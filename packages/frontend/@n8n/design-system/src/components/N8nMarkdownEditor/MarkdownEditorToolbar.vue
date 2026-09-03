<script setup lang="ts">
import type { Editor } from '@tiptap/core';
import { computed, ref, useId } from 'vue';

import { t } from '../../locale';
import N8nButton from '../N8nButton';
import { N8nDropdownMenu, type DropdownMenuItemProps } from '../N8nDropdownMenu';
import N8nIcon from '../N8nIcon';
import type { IconName } from '../N8nIcon';
import N8nIconButton from '../N8nIconButton';
import N8nInput from '../N8nInput';
import N8nPopover from '../N8nPopover';
import N8nText from '../N8nText';
import N8nToggle from '../N8nToggle';
import N8nToggleGroup from '../N8nToggleGroup';
import N8nTooltip from '../N8nTooltip';
import type { MarkdownEditorVariant, MarkdownEditorToolbarMode } from './MarkdownEditor.types';
import { isUrl } from './markdownEditorUtils';

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

const isLinkPopoverOpen = ref(false);
const linkUrl = ref('');
const showLinkValidationError = ref(false);
const linkUrlInputId = useId();
const linkValidationErrorId = useId();

const isExistingLink = computed(() => props.editor.isActive('link'));

const linkValidationError = computed(() => {
	if (!linkUrl.value.trim()) {
		return props.editor.isActive('link') ? null : translate('markdownEditor.linkRequired');
	}
	if (!isUrl(linkUrl.value.trim())) return translate('markdownEditor.linkInvalid');

	return null;
});

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
	{
		id: 'underline',
		label: translate('markdownEditor.underline'),
		icon: 'underline',
		command: ({ editor }) => editor.chain().focus().toggleUnderline().run(),
	},
]);

const blockControls = computed<ToolbarControl[]>(() => [
	{
		id: 'blockquote',
		label: translate('markdownEditor.blockquote'),
		icon: 'quote',
		command: ({ editor }) => editor.chain().focus().toggleBlockquote().run(),
	},
	{
		id: 'codeBlock',
		label: translate('markdownEditor.codeBlock'),
		icon: 'file-code',
		command: ({ editor }) => editor.chain().focus().toggleCodeBlock().run(),
	},
]);

const listControls = computed<ToolbarControl[]>(() => [
	{
		id: 'orderedList',
		label: translate('markdownEditor.orderedList'),
		icon: 'list-ordered',
		command: ({ editor }) => editor.chain().focus().toggleOrderedList().run(),
	},
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
	props.isRawMode
		? []
		: markControls.value
				.filter((control) => props.editor.isActive(control.id))
				.map((control) => control.id),
);

const activeBlocks = computed(() =>
	props.isRawMode
		? []
		: [
				...blockControls.value
					.filter((control) => props.editor.isActive(control.id))
					.map((control) => control.id),
				...(isExistingLink.value ? ['link'] : []),
			],
);

const activeLists = computed(() =>
	props.isRawMode
		? []
		: listControls.value
				.filter((control) => props.editor.isActive(control.id))
				.map((control) => control.id),
);

const activeTextStyle = computed(() => {
	if (props.isRawMode) return 'paragraph';
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

function openLinkPopover() {
	if (props.disabled || props.isRawMode) return;

	linkUrl.value = (props.editor.getAttributes('link').href as string) ?? '';
	showLinkValidationError.value = false;
	isLinkPopoverOpen.value = true;
}

function scrollToolbar(event: WheelEvent) {
	const toolbar = event.currentTarget;

	if (!(toolbar instanceof HTMLElement) || toolbar.scrollWidth <= toolbar.clientWidth) return;
	if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;

	toolbar.scrollLeft += event.deltaY;
	event.preventDefault();
}

function handleLinkInvalid(event: Event) {
	event.preventDefault();
	showLinkValidationError.value = true;
}

function removeLink() {
	props.editor.chain().focus().extendMarkRange('link').unsetLink().run();
	isLinkPopoverOpen.value = false;
}

function applyLink() {
	const href = linkUrl.value.trim();

	if (!href && props.editor.isActive('link')) {
		props.editor.chain().focus().extendMarkRange('link').unsetLink().run();
		isLinkPopoverOpen.value = false;
		return;
	}

	if (!isUrl(href)) {
		showLinkValidationError.value = true;
		return;
	}

	if (props.editor.state.selection.empty && !props.editor.isActive('link')) {
		props.editor
			.chain()
			.focus()
			.insertContent({
				type: 'text',
				text: href,
				marks: [{ type: 'link', attrs: { href } }],
			})
			.run();
	} else {
		props.editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
	}

	isLinkPopoverOpen.value = false;
}

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
		:class="[
			$style.toolbar,
			mode === 'always' && $style.alwaysVisible,
			mode === 'floating' && $style.floating,
		]"
		data-test-id="markdown-editor-toolbar"
	>
		<div
			:class="[$style.toolbarInner, variant === 'contained' ? $style.containedToolbar : '']"
			@wheel="scrollToolbar"
		>
			<div :class="$style.toolbarGroup">
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
			</div>

			<div :class="$style.toolbarGroup">
				<N8nToggleGroup
					:model-value="activeBlocks"
					type="multiple"
					variant="ghost"
					size="small"
					:disabled="disabled || isRawMode"
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
						<N8nPopover
							:open="isLinkPopoverOpen"
							width="320px"
							side="bottom"
							:content-class="$style.addLinkPopover"
							@update:open="isLinkPopoverOpen = $event"
						>
							<template #trigger>
								<N8nToggle
									value="link"
									:label="translate('markdownEditor.link')"
									icon="link"
									:class="isLinkPopoverOpen ? $style.linkButtonActive : undefined"
									v-bind="slotProps"
									@click="openLinkPopover"
								/>
							</template>
							<template #content="{ close }">
								<form :class="$style.addLinkForm" @submit.prevent="applyLink">
									<label :for="linkUrlInputId" :class="$style.addLinkFormLabel"
										><N8nText bold>{{ translate('markdownEditor.linkUrl') }}</N8nText></label
									>
									<N8nInput
										:id="linkUrlInputId"
										v-model="linkUrl"
										type="url"
										:required="!props.editor.isActive('link')"
										autofocus
										:placeholder="translate('markdownEditor.linkPlaceholder')"
										:aria-label="translate('markdownEditor.linkUrl')"
										:aria-invalid="showLinkValidationError && !!linkValidationError"
										:aria-describedby="
											showLinkValidationError && linkValidationError
												? linkValidationErrorId
												: undefined
										"
										@invalid="handleLinkInvalid"
									/>
									<N8nText
										v-if="showLinkValidationError && linkValidationError"
										:id="linkValidationErrorId"
										step="2xs"
										color="danger"
										role="alert"
										>{{ linkValidationError }}</N8nText
									>
									<div :class="$style.linkActions">
										<N8nTooltip
											v-if="isExistingLink"
											:content="translate('markdownEditor.removeLink')"
											><N8nIconButton
												variant="ghost"
												size="small"
												icon="trash-2"
												:aria-label="translate('markdownEditor.removeLink')"
												@click="removeLink"
										/></N8nTooltip>
										<span :class="$style.footerSpacer" />
										<N8nButton type="button" variant="outline" @click="close">{{
											translate('markdownEditor.cancel')
										}}</N8nButton>
										<N8nButton type="submit">{{
											translate(
												isExistingLink ? 'markdownEditor.updateLink' : 'markdownEditor.addLink',
											)
										}}</N8nButton>
									</div>
								</form>
							</template>
						</N8nPopover>
					</template>
				</N8nToggleGroup>
			</div>

			<N8nToggleGroup
				:model-value="activeLists"
				type="multiple"
				variant="ghost"
				size="small"
				:disabled="disabled || isRawMode"
				:class="$style.toolbarGroup"
			>
				<template #default="slotProps">
					<N8nToggle
						v-for="control in listControls"
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
	--n8n-markdown-editor-toolbar--pos-x: 0;
	--n8n-markdown-editor-toolbar--pos-y: 0;

	position: absolute;
	inset-inline: var(--n8n-markdown-editor-toolbar--pos-x);
	top: var(--n8n-markdown-editor-toolbar--pos-y);
	z-index: 1;
	opacity: 0;
	visibility: hidden;
	pointer-events: none;
}
.floating {
	position: static;
	inset: auto;
	width: max-content;
	max-width: calc(100vw - var(--spacing--lg));
	opacity: 1;
	visibility: visible;
	pointer-events: auto;

	.toolbarInner {
		border: var(--border);
		border-radius: var(--radius--lg);
		background-color: var(--background--surface);
		box-shadow: var(--shadow--md);
	}
}

.toolbarInner {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	box-sizing: border-box;
	width: 100%;
	min-width: 0;
	max-width: 100%;
	height: var(--height--lg);
	padding: var(--spacing--3xs);
	overflow-x: auto;
	overflow-y: hidden;
	overscroll-behavior-inline: contain;
	scrollbar-width: none;
	background-color: var(--n8n--markdown-editor--background-color, var(--background--surface));
	transition:
		opacity var(--duration--snappy) var(--easing--ease-out),
		visibility var(--duration--snappy) var(--easing--ease-out);

	&::-webkit-scrollbar {
		display: none;
	}
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

.linkButton {
	flex: 0 0 auto;
}

.linkButtonActive {
	--button--color--background: var(--background--active);
}

.invalidInput {
	--input--border-color: var(--color--danger);
}

.linkActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--sm);
}

.footerSpacer {
	flex: 1;
}

.validationError {
	margin: var(--spacing--2xs) 0 0;
	font-size: var(--font-size--2xs);
	color: var(--color--danger);
}

.toolbarGroup {
	display: inline-flex;
	align-items: center;
	flex: 0 0 auto;

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

.addLinkFormLabel {
	display: inline-block;
	margin-bottom: var(--spacing--xs);
}
.addLinkForm {
	padding: var(--spacing--sm);
}
</style>
