<script setup lang="ts">
import {
	N8nDialog,
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
import { computed, nextTick, useSlots, useTemplateRef } from 'vue';

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
const body = useTemplateRef<HTMLElement>('body');
const hasFooter = computed(
	() =>
		props.showFooter ??
		Boolean(slots.footer || slots.footerLeft || slots.footerBeforeCancel || slots.footerActions),
);

function onOpenChange(open: boolean) {
	if (!open && props.busy) return;
	emit('update:open', open);
}

function close() {
	if (!props.busy) emit('update:open', false);
}

function onBack() {
	if (!props.busy) emit('back');
}

function onOpenAutoFocus(event: Event) {
	event.preventDefault();
	void nextTick(() => {
		const autofocusTarget =
			body.value?.querySelector<HTMLElement>(
				'[data-agent-modal-autofocus], input:not([type="hidden"]):not([disabled]):not([tabindex="-1"]), textarea:not([disabled]), select:not([disabled]), [contenteditable="true"]',
			) ?? body.value?.querySelector<HTMLElement>('button:not([disabled])');
		autofocusTarget?.focus();
	});
}
</script>

<template>
	<N8nDialog
		:open="props.open"
		:size="props.size"
		:stacked="props.stacked"
		:trap-focus="props.trapFocus"
		:disable-outside-pointer-events="props.disableOutsidePointerEvents"
		:show-close-button="false"
		@interact-outside="emit('interactOutside', $event)"
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
					:disabled="props.busy"
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

				<N8nIconButton
					icon="x"
					variant="ghost"
					size="small"
					:disabled="props.busy"
					:aria-label="i18n.baseText('generic.close')"
					data-testid="dialog-close-button"
					:class="$style.closeButton"
					@click="close"
				/>
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

		<FocusScope
			v-if="!props.trapFocus"
			as-child
			@mount-auto-focus.prevent
			@unmount-auto-focus.prevent
		>
			<span hidden aria-hidden="true" />
		</FocusScope>

		<div
			ref="body"
			:class="[$style.body, !props.bodyScrollable && $style.bodyNotScrollable]"
			data-testid="agent-modal-body"
		>
			<slot />
		</div>

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
							:disabled="props.busy"
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

.header {
	display: flex;
	flex-direction: column;
	margin: calc(var(--spacing--lg) * -1) calc(var(--spacing--lg) * -1) 0;
	padding: var(--spacing--md) var(--spacing--lg);
	border-bottom: var(--border);
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

.backButton,
.closeButton {
	flex-shrink: 0;
}

.titleGroup {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	min-width: 0;
	flex: 1;
	font-size: var(--font-size--lg);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--lg);
	color: light-dark(var(--color--neutral-900), var(--color--neutral-100));

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

.headerActions + .closeButton,
.titleGroup + .closeButton {
	margin-left: auto;
}

.body {
	box-sizing: border-box;
	min-height: 0;
	max-height: min(70dvh, calc(var(--height--5xl) * 6));
	overflow-y: auto;
	margin-inline: calc(var(--spacing--5xs) * -1);
	padding: var(--spacing--md) var(--spacing--5xs) var(--spacing--5xs);

	@include scrollbar-mixins.scroll-bar;
}

.body :global(.n8n-markdown) {
	@include scrollbar-mixins.scroll-bar;
}

.bodyNotScrollable {
	overflow-y: hidden;
}

.footer {
	margin-top: var(--spacing--md);
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
	.header {
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
