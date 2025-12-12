<script setup lang="ts">
import { useI18n } from '../../../composables/useI18n';
import N8nButton from '../../N8nButton';
import N8nIcon from '../../N8nIcon';

interface Props {
	versionId: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
	confirm: [];
	cancel: [];
	showVersion: [versionId: string];
}>();

const { t } = useI18n();

function handleShowVersion() {
	emit('showVersion', props.versionId);
}

function handleConfirm() {
	emit('confirm');
}
</script>

<template>
	<div :class="$style.container" data-test-id="restore-version-confirm">
		<div :class="$style.content">
			<h3 :class="$style.title">
				{{ t('aiAssistant.versionCard.restoreModal.title') }}
			</h3>
			<p :class="$style.description">
				{{ t('aiAssistant.versionCard.restoreModal.description') }}
			</p>
		</div>
		<div :class="$style.actions">
			<button :class="$style.showVersionButton" type="button" @click="handleShowVersion">
				{{ t('aiAssistant.versionCard.restoreModal.showVersion') }}
				<N8nIcon icon="arrow-up-right" size="xlarge" />
			</button>
			<N8nButton type="primary" size="large" @click="handleConfirm">
				{{ t('aiAssistant.versionCard.restoreModal.restore') }}
			</N8nButton>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--md) var(--spacing--sm);
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius--lg);
	background-color: var(--color--background--light-3);
	width: 288px;
	box-shadow: var(--shadow);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	color: var(--color--text);
}

.title {
	margin: 0;
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
}

.description {
	margin: 0;
	font-size: var(--font-size--sm);
	color: var(--color--text);
	line-height: var(--line-height--xl);
}

.actions {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: var(--spacing--2xs);
}

// @todo is there a reusable version here?
.showVersionButton {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	background: none;
	border: none;
	padding: 0;
	color: var(--color--text--shade-1);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	cursor: pointer;
	padding: var(--spacing--3xs) var(--spacing--sm);

	&:hover {
		text-decoration: underline;
		color: var(--color--primary);
	}
}
</style>
