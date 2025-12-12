<script setup lang="ts">
// @todo maybe this component should move to design system
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nLink } from '@n8n/design-system';

interface Props {
	versionId: string;
	workflowId: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
	confirm: [];
	cancel: [];
	showVersion: [versionId: string];
}>();

const i18n = useI18n();

function handleShowVersion() {
	emit('showVersion', props.versionId);
}

function handleConfirm() {
	emit('confirm');
}

function handleCancel() {
	emit('cancel');
}
</script>

<template>
	<div :class="$style.container" data-test-id="restore-version-confirm">
		<div :class="$style.content">
			<h3 :class="$style.title">
				{{ i18n.baseText('aiAssistant.versionCard.restoreModal.title') }}
			</h3>
			<p :class="$style.description">
				<!-- @todo need include the correct number of days -->
				{{ i18n.baseText('aiAssistant.versionCard.restoreModal.description') }}
			</p>
			<N8nLink :class="$style.showVersionLink" @click="handleShowVersion">
				{{ i18n.baseText('aiAssistant.versionCard.restoreModal.showVersion') }}
			</N8nLink>
		</div>
		<div :class="$style.actions">
			<N8nButton type="secondary" size="small" @click="handleCancel">
				{{ i18n.baseText('generic.cancel') }}
			</N8nButton>
			<N8nButton type="primary" size="small" @click="handleConfirm">
				{{ i18n.baseText('aiAssistant.versionCard.restoreModal.restore') }}
			</N8nButton>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius--lg);
	background-color: var(--color--background);
	box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.title {
	margin: 0;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
}

.description {
	margin: 0;
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	line-height: var(--line-height--xl);
}

.showVersionLink {
	font-size: var(--font-size--2xs);
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
