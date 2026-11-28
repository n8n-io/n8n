<script setup lang="ts">
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIcon,
	N8nInlineTextEdit,
	N8nSpinner,
	N8nText,
	type DialogSize,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

// Shared modal shell for MCP server tools (workflows, nodes, and agents), mirroring AgentModal.
const props = withDefaults(
	defineProps<{
		open: boolean;
		title: string;
		editableTitle?: boolean;
		titleMaxLength?: number;
		titleError?: string;
		titleHint?: string;
		titleLoading?: boolean;
		ariaDescription?: string;
		canUpdate?: boolean;
		saving?: boolean;
		saveDisabled?: boolean;
		busy?: boolean;
		size?: DialogSize;
	}>(),
	{
		editableTitle: false,
		titleMaxLength: 64,
		titleError: '',
		titleHint: '',
		titleLoading: false,
		ariaDescription: undefined,
		canUpdate: false,
		saving: false,
		saveDisabled: false,
		busy: false,
		size: 'xlarge',
	},
);

const emit = defineEmits<{
	'update:open': [value: boolean];
	'update:title': [value: string];
	save: [];
}>();

defineSlots<{
	titlePrefix?: () => unknown;
	headerActions?: () => unknown;
	titleFooterAction?: () => unknown;
	default?: () => unknown;
	footerLeft?: () => unknown;
	footerActions?: () => unknown;
}>();

const i18n = useI18n();

function onOpenChange(value: boolean) {
	if (!value && props.busy) return;
	emit('update:open', value);
}

function requestClose() {
	if (!props.busy) emit('update:open', false);
}

function onEscapeKeyDown(event: KeyboardEvent) {
	if (props.busy) event.preventDefault();
}

function onInteractOutside(event: Event) {
	if (props.busy) event.preventDefault();
}
</script>

<template>
	<N8nDialog
		:open="props.open"
		:size="props.size"
		:aria-description="props.ariaDescription"
		:show-close-button="!props.busy"
		:container-class="$style.dialog"
		data-test-id="mcp-tool-dialog"
		@escape-key-down="onEscapeKeyDown"
		@interact-outside="onInteractOutside"
		@update:open="onOpenChange"
	>
		<N8nDialogHeader :class="$style.header">
			<div :class="$style.headerContent">
				<div v-if="$slots.titlePrefix" :class="$style.titlePrefix">
					<slot name="titlePrefix" />
				</div>

				<N8nDialogTitle as-child>
					<div :class="$style.titleGroup">
						<N8nInlineTextEdit
							v-if="props.editableTitle && !props.titleLoading"
							:model-value="props.title"
							:max-length="props.titleMaxLength"
							max-width="100%"
							:disabled="props.busy"
							:class="[$style.editableTitle, $style.mono]"
							data-test-id="mcp-tool-dialog-title-edit"
							@update:model-value="emit('update:title', $event)"
						/>
						<span
							v-else
							:class="[$style.title, $style.mono]"
							data-test-id="mcp-tool-dialog-title-readonly"
						>
							{{ props.title }}
						</span>
						<N8nSpinner
							v-if="props.titleLoading"
							size="small"
							data-test-id="mcp-tool-dialog-generating-name"
						/>
						<N8nIcon
							v-else-if="props.editableTitle"
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

			<div
				v-if="props.titleError || props.titleHint || $slots.titleFooterAction"
				:class="$style.titleFooter"
			>
				<N8nText
					v-if="props.titleError"
					tag="p"
					size="small"
					color="danger"
					role="alert"
					:class="$style.titleMessage"
					data-test-id="mcp-tool-dialog-name-error"
				>
					{{ props.titleError }}
				</N8nText>
				<N8nText
					v-else-if="props.titleHint"
					tag="p"
					size="small"
					color="text-light"
					:class="$style.titleMessage"
				>
					{{ props.titleHint }}
				</N8nText>
				<div v-if="$slots.titleFooterAction" :class="$style.titleFooterAction">
					<slot name="titleFooterAction" />
				</div>
			</div>
		</N8nDialogHeader>

		<N8nDialogBody :class="$style.body" data-test-id="mcp-tool-dialog-body">
			<slot />
		</N8nDialogBody>

		<N8nDialogFooter :class="$style.footer">
			<div :class="$style.footerLayout">
				<div :class="$style.footerLeft">
					<slot name="footerLeft" />
				</div>
				<div :class="$style.footerActions">
					<template v-if="props.canUpdate">
						<N8nButton
							variant="outline"
							:disabled="props.busy"
							:label="i18n.baseText('generic.cancel')"
							data-test-id="mcp-tool-dialog-cancel"
							@click="requestClose"
						/>
						<slot name="footerActions">
							<N8nButton
								variant="solid"
								:loading="props.saving"
								:disabled="props.saveDisabled || props.busy"
								:label="i18n.baseText('generic.save')"
								data-test-id="mcp-tool-dialog-save"
								data-attr="mcp-tool-dialog-save"
								@click="emit('save')"
							/>
						</slot>
					</template>
					<N8nButton
						v-else
						variant="outline"
						:label="i18n.baseText('generic.close')"
						data-test-id="mcp-tool-dialog-close"
						@click="requestClose"
					/>
				</div>
			</div>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
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
	gap: var(--spacing--3xs);
	padding: var(--spacing--md) var(--spacing--lg);
	padding-inline-end: calc(
		var(--spacing--lg) + var(--n8n-dialog-close--size, var(--spacing--lg)) + var(--spacing--xs)
	);
}

.headerContent {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	min-width: 0;
}

.titlePrefix {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	color: var(--text-color--subtle);
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

.mono {
	font-family: var(--font-family--monospace);
}

.editIcon {
	flex-shrink: 0;
	opacity: 0;
	color: var(--text-color--subtle);
	transition: opacity var(--duration--snappy) ease;
}

.headerActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-inline-start: auto;
}

.titleFooter {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
}

.titleMessage {
	min-width: 0;
}

.titleFooterAction {
	margin-inline-start: auto;
	flex-shrink: 0;
}

.body {
	box-sizing: border-box;
	min-height: 0;
	max-height: min(70dvh, calc(var(--height--5xl) * 6));
	overflow-y: auto;
	scrollbar-gutter: stable;
	padding: var(--spacing--xs) var(--spacing--lg) var(--spacing--md);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);

	@include scrollbar-mixins.scroll-bar;
}

.footer {
	padding: var(--spacing--md) var(--spacing--lg);
	border-top: var(--border);
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
	margin-inline-start: auto;
}

@media (hover: none) {
	.editIcon {
		opacity: 1;
	}
}
</style>
