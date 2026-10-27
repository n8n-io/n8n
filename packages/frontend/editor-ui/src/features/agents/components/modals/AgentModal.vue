<script setup lang="ts">
import {
	N8nDialog,
	N8nDialogBody,
	N8nButton,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIcon,
	N8nIconButton,
	N8nInlineTextEdit,
	N8nText,
	type DialogSize,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { FocusScope } from 'reka-ui';
import { computed, nextTick, provide, ref, useSlots, useTemplateRef } from 'vue';
import type { ComponentPublicInstance } from 'vue';
import { ParameterInputModalContextKey } from '@/app/constants/injectionKeys';

const props = withDefaults(
	defineProps<{
		open: boolean;
		title: string;
		editableTitle?: boolean;
		titlePlaceholder?: string;
		titleMaxLength?: number;
		titleError?: string;
		showBack?: boolean;
		showFooter?: boolean;
		showCancel?: boolean;
		bodyScrollable?: boolean;
		bodyFlush?: boolean;
		/** Pin the body height so the dialog does not resize between steps. Short modals leave it off. */
		stableHeight?: boolean;
		busy?: boolean;
		size?: DialogSize;
		stacked?: boolean;
		trapFocus?: boolean;
		disableOutsidePointerEvents?: boolean;
	}>(),
	{
		editableTitle: false,
		titlePlaceholder: '',
		titleMaxLength: 128,
		titleError: '',
		showBack: false,
		showFooter: undefined,
		showCancel: true,
		bodyScrollable: true,
		bodyFlush: false,
		stableHeight: false,
		busy: false,
		size: '2xlarge',
		stacked: false,
		trapFocus: true,
		disableOutsidePointerEvents: true,
	},
);

const emit = defineEmits<{
	'update:open': [value: boolean];
	'update:title': [value: string];
	back: [];
	interactOutside: [event: Event];
}>();

const slots = useSlots();
const i18n = useI18n();
const bodyRoot = useTemplateRef<ComponentPublicInstance>('bodyRoot');
const titleEdit = useTemplateRef<InstanceType<typeof N8nInlineTextEdit>>('titleEdit');

function bodyElement(): HTMLElement | null {
	const element = bodyRoot.value?.$el;
	return element instanceof HTMLElement ? element : null;
}
const parameterDialogs = ref(new Set<string>());
provide(ParameterInputModalContextKey, { openDialogs: parameterDialogs, appendTo: 'body' });
const trapFocus = computed(() => props.trapFocus && parameterDialogs.value.size === 0);
const hasFooter = computed(
	() =>
		props.showFooter ??
		Boolean(slots.footer || slots.footerLeft || slots.footerBeforeCancel || slots.footerActions),
);
const dismissalBlocked = computed(() => props.busy || !trapFocus.value);

function onOpenChange(open: boolean) {
	if (!open && dismissalBlocked.value) return;
	emit('update:open', open);
}

function close() {
	if (!dismissalBlocked.value) emit('update:open', false);
}

function onBack() {
	if (!dismissalBlocked.value) emit('back');
}

function onEscapeKeyDown(event: KeyboardEvent) {
	const isOutsideDialog =
		event.target instanceof Node &&
		!bodyElement()?.closest('[role="dialog"]')?.contains(event.target);
	if (dismissalBlocked.value || isOutsideDialog) event.preventDefault();
}

function onInteractOutside(event: Event) {
	if (dismissalBlocked.value) event.preventDefault();
	emit('interactOutside', event);
}
const bodyAutofocusSelector =
	'[data-agent-modal-autofocus], input:not([type="hidden"]):not([disabled]):not([tabindex="-1"]), textarea:not([disabled]), select:not([disabled]), [contenteditable="true"]';

/** Puts the editable title in edit mode. */
function focusTitle() {
	titleEdit.value?.forceFocus();
}

defineExpose({ focusTitle });

function onOpenAutoFocus(event: Event) {
	const body =
		bodyElement() ?? document.querySelector<HTMLElement>('[data-testid="agent-modal-body"]');
	const dialog = body?.closest('[role="dialog"]');
	const autofocusTarget =
		body?.querySelector<HTMLElement>(bodyAutofocusSelector) ??
		body?.querySelector<HTMLElement>('button:not([disabled])') ??
		dialog?.querySelector<HTMLElement>(
			'[data-testid="dialog-close-button"]:not([disabled]), [data-test-id="dialog-close-button"]:not([disabled])',
		);
	if (!autofocusTarget) return;

	event.preventDefault();
	void nextTick(() => autofocusTarget.focus());
}
</script>

<template>
	<N8nDialog
		:open="props.open"
		:size="props.size"
		:stacked="props.stacked"
		:trap-focus="trapFocus"
		:disable-outside-pointer-events="
			props.disableOutsidePointerEvents && parameterDialogs.size === 0
		"
		:show-close-button="!dismissalBlocked"
		:container-class="$style.dialog"
		@escape-key-down="onEscapeKeyDown"
		@interact-outside="onInteractOutside"
		@open-auto-focus="onOpenAutoFocus"
		@update:open="onOpenChange"
	>
		<N8nDialogHeader :class="$style.header">
			<div :class="$style.headerContent">
				<N8nIconButton
					v-if="props.showBack"
					icon="arrow-left"
					variant="ghost"
					size="small"
					:disabled="dismissalBlocked"
					:class="$style.backButton"
					:aria-label="i18n.baseText('generic.back')"
					data-testid="agent-modal-back"
					@click="onBack"
				/>

				<div v-if="$slots.titlePrefix" :class="$style.titlePrefix">
					<slot name="titlePrefix" />
				</div>

				<N8nDialogTitle as-child>
					<div :class="$style.titleGroup">
						<N8nInlineTextEdit
							v-if="props.editableTitle"
							ref="titleEdit"
							:model-value="props.title"
							:max-length="props.titleMaxLength"
							:max-width="'100%'"
							:placeholder="props.titlePlaceholder"
							:disabled="props.busy"
							:class="$style.editableTitle"
							@update:model-value="emit('update:title', $event)"
						/>
						<span v-else :class="$style.title">{{ props.title }}</span>
						<N8nIcon
							v-if="props.editableTitle"
							icon="pencil"
							size="small"
							:class="$style.editIcon"
							aria-hidden="true"
						/>
					</div>
				</N8nDialogTitle>

				<div v-if="$slots.headerActions" :class="$style.headerActions">
					<slot name="headerActions" />
				</div>
			</div>
			<N8nText
				v-if="props.titleError"
				size="small"
				color="danger"
				:class="[$style.titleError, props.showBack && $style.titleErrorWithBack]"
			>
				{{ props.titleError }}
			</N8nText>
		</N8nDialogHeader>

		<N8nDialogBody
			ref="bodyRoot"
			:class="[$style.body, props.stableHeight && $style.bodyStableHeight]"
			:data-flush="props.bodyFlush ? 'true' : undefined"
			:data-scrollable="props.bodyScrollable ? 'true' : 'false'"
			data-testid="agent-modal-body"
		>
			<FocusScope v-if="!trapFocus" as-child @mount-auto-focus.prevent @unmount-auto-focus.prevent>
				<span hidden aria-hidden="true" />
			</FocusScope>
			<slot />
		</N8nDialogBody>

		<N8nDialogFooter v-if="hasFooter" :class="$style.footer">
			<slot name="footer">
				<div :class="$style.footerLayout">
					<div :class="$style.footerLeft">
						<slot name="footerLeft" />
					</div>
					<div :class="$style.footerActions" data-testid="agent-modal-footer-actions">
						<slot name="footerBeforeCancel" />
						<N8nButton
							v-if="props.showCancel"
							variant="outline"
							:disabled="dismissalBlocked"
							data-testid="agent-modal-cancel"
							@click="close"
						>
							{{ i18n.baseText('generic.cancel') }}
						</N8nButton>
						<slot name="footerActions" />
					</div>
				</div>
			</slot>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/mixins' as scrollbar-mixins;

[role='dialog'].dialog {
	--n8n-dialog-region--padding: 0;
	--n8n-dialog-close--inset-block-start: calc(
		var(--spacing--md) + (var(--n8n-dialog-title--line) - var(--n8n-dialog-close--size)) / 2
	);
	--n8n-dialog-close--inset-inline-end: var(--spacing--lg);
}

.header {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--md) var(--spacing--lg);
	padding-inline-end: calc(
		var(--spacing--lg) + var(--n8n-dialog-close--size, var(--spacing--lg)) + var(--spacing--xs)
	);
}

.titleError {
	min-width: 0;
}

.titleErrorWithBack {
	padding-left: calc(var(--spacing--xl) + var(--spacing--2xs));
}

.headerContent {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	min-width: 0;
}

.backButton {
	flex-shrink: 0;
}

.titlePrefix {
	display: flex;
	flex-shrink: 0;
	align-items: center;
}

.titleGroup {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	min-width: 0;
	flex: 1;

	&:hover .editIcon,
	&:focus-within .editIcon {
		opacity: 1;
	}
}

.title {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.editableTitle {
	min-width: 0;
	max-width: 100%;
	font: inherit;
	color: inherit;
}

.editIcon {
	flex-shrink: 0;
	opacity: 0;
	color: var(--color--text--tint-1);
	transition: opacity var(--duration--snappy) ease;
}

.headerActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-left: auto;
}

.footer {
	padding: var(--spacing--md) var(--spacing--lg);
	border-top: var(--border);
}

.body {
	--agent-modal-body--padding-inline: var(--spacing--lg);
	--agent-modal-body--padding-block-end: var(--spacing--md);
	box-sizing: border-box;
	min-height: 0;
	max-height: min(70dvh, calc(var(--height--5xl) * 6));
	overflow-y: auto;
	scrollbar-gutter: stable;
	padding: 0 var(--agent-modal-body--padding-inline) var(--agent-modal-body--padding-block-end);

	@include scrollbar-mixins.scroll-bar;
}

.body[data-slot='dialog-body'][data-scrollable] {
	// The base dialog reduces this inset when a footer is present.
	padding-block-end: var(--agent-modal-body--padding-block-end);
	margin-block-end: 0;
}

.body[data-flush='true'][data-slot='dialog-body'][data-scrollable] {
	padding: 0;
}

.body[data-scrollable='false'] {
	overflow: hidden;
}

.body[data-scrollable='true'] > * {
	// Keep the bottom inset after scrolling past a tall form.
	flex-shrink: 0;
}

.bodyStableHeight {
	height: min(60dvh, calc(var(--height--5xl) * 5));
}

.body :global(.n8n-markdown) {
	@include scrollbar-mixins.scroll-bar;
}

.footerLayout {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	width: 100%;
}

.footerLeft,
.footerActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.footerActions {
	margin-left: auto;
}

@media (max-width: 480px) {
	.body {
		--agent-modal-body--padding-inline: var(--spacing--md);
	}

	[role='dialog'].dialog {
		--n8n-dialog-close--inset-inline-end: var(--spacing--md);
	}

	.header {
		padding-inline-start: var(--spacing--md);
		padding-inline-end: calc(
			var(--spacing--md) + var(--n8n-dialog-close--size, var(--spacing--lg)) + var(--spacing--xs)
		);
	}

	.footer {
		padding-inline: var(--spacing--md);
	}

	.footerLayout {
		align-items: stretch;
		flex-direction: column-reverse;
	}

	.footerLeft,
	.footerActions {
		width: 100%;

		button {
			flex: 1;
		}
	}
}

@media (hover: none) {
	.editIcon {
		opacity: 1;
	}
}
</style>
