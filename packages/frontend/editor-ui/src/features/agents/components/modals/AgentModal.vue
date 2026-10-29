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
		/** Text of the Cancel button. Defaults to "Cancel". */
		cancelLabel?: string;
		/** Draws a line under the header, for a body whose columns start at the top edge. */
		headerDivider?: boolean;
		/** Warning colors the divider over the body, to match a warning strip at the top of it. */
		headerDividerTone?: 'default' | 'warning';
		bodyScrollable?: boolean;
		bodyFlush?: boolean;
		/** Pin the body height so the dialog does not resize between steps. Short modals leave it off. */
		stableHeight?: boolean;
		/** A fixed size from the window, so the dialog never resizes when its content changes. */
		fixedSize?: boolean;
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
		cancelLabel: undefined,
		headerDivider: false,
		headerDividerTone: 'default',
		bodyScrollable: true,
		bodyFlush: false,
		stableHeight: false,
		fixedSize: false,
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
		:container-class="props.fixedSize ? `${$style.dialog} ${$style.dialogFixed}` : $style.dialog"
		@escape-key-down="onEscapeKeyDown"
		@interact-outside="onInteractOutside"
		@open-auto-focus="onOpenAutoFocus"
		@update:open="onOpenChange"
	>
		<N8nDialogHeader
			:class="[$style.header, props.headerDivider && !props.fixedSize && $style.headerDivider]"
		>
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
					<div :class="[$style.titleGroup, $slots.titleSuffix && $style.titleGroupWithSuffix]">
						<N8nInlineTextEdit
							v-if="props.editableTitle"
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

				<div v-if="$slots.titleSuffix" :class="$style.titleSuffix">
					<slot name="titleSuffix" />
				</div>

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

		<!-- A fixed dialog keeps the split layout, so the panel can slide in and out. -->
		<!-- A fixed dialog draws the divider over each column, so the body and the panel can differ. -->
		<div
			:class="[
				$style.split,
				($slots.sidePanel || props.fixedSize) && $style.splitWithPanel,
				props.headerDivider && props.fixedSize && $style.splitDivided,
				props.headerDividerTone === 'warning' && $style.dividerWarning,
			]"
		>
			<div :class="$style.main">
				<N8nDialogBody
					ref="bodyRoot"
					:class="[$style.body, props.stableHeight && $style.bodyStableHeight]"
					:data-flush="props.bodyFlush ? 'true' : undefined"
					:data-scrollable="props.bodyScrollable ? 'true' : 'false'"
					data-testid="agent-modal-body"
				>
					<FocusScope
						v-if="!trapFocus"
						as-child
						@mount-auto-focus.prevent
						@unmount-auto-focus.prevent
					>
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
									{{ props.cancelLabel ?? i18n.baseText('generic.cancel') }}
								</N8nButton>
								<slot name="footerActions" />
							</div>
						</div>
					</slot>
				</N8nDialogFooter>
			</div>
			<Transition
				:enter-active-class="$style.sidePanelMotion"
				:leave-active-class="$style.sidePanelMotion"
				:enter-from-class="$style.sidePanelHidden"
				:leave-to-class="$style.sidePanelHidden"
			>
				<aside
					v-if="$slots.sidePanel"
					:class="$style.sidePanel"
					data-testid="agent-modal-side-panel"
				>
					<div :class="$style.sidePanelScroll">
						<slot name="sidePanel" />
					</div>
				</aside>
			</Transition>
		</div>
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

.headerDivider {
	border-bottom: var(--border);
}

.splitDivided {
	> .main,
	.sidePanel {
		border-top: var(--border);
	}

	&.dividerWarning > .main {
		border-top-color: var(--callout--border-color--warning);
	}
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

/* Keeps the suffix beside the title instead of at the far end of the header. */
.titleGroupWithSuffix {
	flex: 0 1 auto;
}

.titleSuffix {
	display: flex;
	flex-shrink: 0;
	align-items: center;
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

/* The size of the window less a margin, whatever the content. The body and the side panel scroll. */
[role='dialog'].dialogFixed {
	width: min(72rem, calc(100dvw - var(--spacing--lg) * 2));
	height: calc(100dvh - var(--spacing--3xl) * 2);
	max-width: none;

	.splitWithPanel {
		flex: 1;
	}

	.body {
		flex: 1;
		max-height: none;
	}

	/* The content fills the body, so a full-height column reaches the footer. */
	.body > * {
		display: flex;
		flex-direction: column;
		flex-grow: 1;
	}
}

/* Without a side panel the wrappers add no boxes, so the layout stays as before. */
.split,
.main {
	display: contents;
}

/* A side panel runs beside the body and the footer, from the header to the bottom edge. */
.splitWithPanel {
	display: flex;
	min-height: 0;

	> .main {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
	}
}

.sidePanel {
	--agent-modal-side-panel--size: var(
		--agent-modal-side-panel--width,
		calc(var(--spacing--5xl) * 1.25)
	);
	position: relative;
	flex-shrink: 0;
	width: var(--agent-modal-side-panel--size);
	overflow: hidden;
	border-left: var(--border);
}

/* The panel slides in from the right: its width grows while the content fades in. */
.sidePanelMotion {
	transition:
		width var(--duration--base) var(--easing--ease-out),
		opacity var(--duration--base) var(--easing--ease-out);
}

.sidePanelHidden {
	width: 0;
	opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
	.sidePanelMotion {
		transition: none;
	}
}

/* The panel takes the height of the body and the footer, and a long panel scrolls. Its content
   keeps the full width, so nothing wraps again while the panel slides. */
.sidePanelScroll {
	position: absolute;
	inset: 0 0 0 auto;
	width: var(--agent-modal-side-panel--size);
	overflow-y: auto;

	@include scrollbar-mixins.scroll-bar;
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
	/* The base body moves up over the header to give room for a focus ring. A flush body has
	   no inset to use, so a strip at its top would cover the header divider. */
	margin-block-start: 0;
	/* Full-width strips reach the edge, so no space is kept for a scrollbar. */
	scrollbar-gutter: auto;
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

/* A narrow window has no room beside the body, so the side panel goes under it. */
@media (max-width: 768px) {
	.splitWithPanel {
		flex-direction: column;
	}

	.sidePanel {
		width: auto;
		border-left: none;
		border-top: var(--border);
	}

	/* The body and the panel share the height of the window. */
	.splitWithPanel .body {
		max-height: 40dvh;
	}

	.sidePanelScroll {
		position: static;
		max-height: 30dvh;
	}
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

		button:not([role='checkbox']) {
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
