<script setup lang="ts">
import { N8nButton, N8nIcon, N8nInlineTextEdit, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, useSlots, useTemplateRef } from 'vue';

const props = withDefaults(
	defineProps<{
		title: string;
		exitLabel: string;
		backLabel?: string;
		editableTitle?: boolean;
		titlePlaceholder?: string;
		titleMaxLength?: number;
		titleError?: string;
		showBack?: boolean;
		showFooter?: boolean;
		showCancel?: boolean;
		busy?: boolean;
	}>(),
	{
		backLabel: '',
		editableTitle: false,
		titlePlaceholder: '',
		titleMaxLength: 128,
		titleError: '',
		showBack: false,
		showFooter: undefined,
		showCancel: true,
		busy: false,
	},
);

const emit = defineEmits<{
	'update:open': [value: boolean];
	'update:title': [value: string];
	back: [];
}>();

const slots = useSlots();
const i18n = useI18n();
const titleEdit = useTemplateRef<InstanceType<typeof N8nInlineTextEdit>>('titleEdit');

const hasFooter = computed(
	() =>
		props.showFooter ??
		Boolean(slots.footerLeft || slots.footerBeforeCancel || slots.footerActions),
);

function onBackLink() {
	if (props.busy) return;
	if (props.showBack) emit('back');
	else emit('update:open', false);
}

function onCancel() {
	if (!props.busy) emit('update:open', false);
}

function focusTitle() {
	titleEdit.value?.forceFocus();
}

defineExpose({ focusTitle });
</script>

<template>
	<section :class="$style.page" data-testid="agent-skill-page">
		<header :class="$style.header">
			<N8nButton
				variant="ghost"
				size="small"
				icon="arrow-left"
				:disabled="props.busy"
				:class="$style.backLink"
				data-testid="agent-skill-page-back"
				@click="onBackLink"
			>
				{{ props.showBack ? props.backLabel : props.exitLabel }}
			</N8nButton>
			<h1 :class="$style.titleGroup">
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
			</h1>
			<N8nText v-if="props.titleError" size="small" color="danger">
				{{ props.titleError }}
			</N8nText>
		</header>

		<div :class="$style.body" data-testid="agent-skill-page-body">
			<slot />
		</div>

		<footer v-if="hasFooter" :class="$style.footer">
			<div :class="$style.footerLeft">
				<slot name="footerLeft" />
			</div>
			<div :class="$style.footerActions" data-testid="agent-skill-page-footer-actions">
				<slot name="footerBeforeCancel" />
				<N8nButton
					v-if="props.showCancel"
					variant="outline"
					:disabled="props.busy"
					data-testid="agent-skill-page-cancel"
					@click="onCancel"
				>
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<slot name="footerActions" />
			</div>
		</footer>
	</section>
</template>

<style module lang="scss">
.page {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-height: 100%;
}

.header {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.backLink {
	margin-left: calc(var(--spacing--2xs) * -1);
	color: var(--color--text--tint-1);
}

.titleGroup {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	min-width: 0;
	max-width: 100%;
	margin: 0;
	font-size: var(--font-size--xl);
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

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	flex: 1;
}

.footer {
	position: sticky;
	bottom: 0;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm) 0;
	border-top: var(--border);
	background-color: var(--color--background--light-2);
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
	.footer {
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
