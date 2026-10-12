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
import { computed, provide, ref, useSlots, useTemplateRef } from 'vue';
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

				<N8nDialogTitle as-child>
					<div :class="$style.titleGroup">
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

.dialog {
	/* Picker lists read these so their scrollbar can sit on the dialog edge. */
	--agent-modal-body--padding-inline: var(--spacing--lg);
	--agent-modal-body--padding-block-end: var(--spacing--md);
}

.dialog.dialog {
	--n8n-dialog-region--padding: 0;
	/* The dialog content rule sets these from its own padding. Match the header inset instead. */
	--n8n-dialog-close--inset-block-start: calc(
		var(--spacing--md) + (var(--n8n-dialog-title--line) - var(--n8n-dialog-close--size)) / 2
	);
	--n8n-dialog-close--inset-inline-end: var(--spacing--lg);
}

.header {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--md) var(--spacing--lg);
}

.header.header {
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
	min-width: 0;
}

.backButton {
	flex-shrink: 0;
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
}

/* One body. The design-system body is the scroll owner. Header bottom padding is the space above it. */
.dialog :global([data-slot='dialog-body']) {
	box-sizing: border-box;
	min-height: 0;
	max-height: min(70dvh, calc(var(--height--5xl) * 6));
	overflow-y: auto;
	padding: 0 var(--agent-modal-body--padding-inline) var(--agent-modal-body--padding-block-end);

	@include scrollbar-mixins.scroll-bar;
}

.dialog:global(:has([data-slot='dialog-footer'])) {
	--agent-modal-body--padding-block-end: 0;
}

.dialog:global(:has([data-slot='dialog-footer'])) :global([data-slot='dialog-body']) {
	padding-block-end: 0;
}

.dialog:global(:has([data-slot='dialog-body'][data-flush='true']))
	:global([data-slot='dialog-body']) {
	padding: 0;
}

.dialog :global([data-slot='dialog-body'][data-scrollable='false']) {
	overflow: hidden;
}

.dialog :global([data-slot='dialog-body'] .n8n-markdown) {
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
	.dialog {
		--agent-modal-body--padding-inline: var(--spacing--md);
	}

	.dialog.dialog {
		--n8n-dialog-close--inset-inline-end: var(--spacing--md);
	}

	.header.header {
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

		:global(.button) {
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
