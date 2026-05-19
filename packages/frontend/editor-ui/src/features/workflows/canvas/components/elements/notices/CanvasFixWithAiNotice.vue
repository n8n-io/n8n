<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIcon, N8nIconButton } from '@n8n/design-system';

const props = withDefaults(
	defineProps<{
		nodeName: string;
		errorMessage: string;
		failedCount?: number;
	}>(),
	{ failedCount: 1 },
);

defineEmits<{
	'fix-with-ai': [];
	dismiss: [];
}>();

const i18n = useI18n();

const title = computed(() =>
	props.failedCount > 1
		? i18n.baseText('nodeView.fixWithAi.notice.title.multiple', {
				interpolate: { count: props.failedCount },
			})
		: i18n.baseText('nodeView.fixWithAi.notice.title.single', {
				interpolate: { nodeName: props.nodeName },
			}),
);
</script>

<template>
	<div :class="$style.notice" role="alert" data-test-id="fix-with-ai-notice">
		<div :class="$style.header">
			<N8nIcon icon="circle-x" size="medium" :class="$style.headerIcon" />
			<div :class="$style.body">
				<span :class="$style.title">{{ title }}</span>
				<span :class="$style.message">{{ errorMessage }}</span>
			</div>
			<N8nIconButton
				icon="x"
				variant="ghost"
				size="xsmall"
				:aria-label="i18n.baseText('nodeView.fixWithAi.notice.dismiss')"
				data-test-id="fix-with-ai-notice-dismiss"
				:class="$style.dismiss"
				@click="$emit('dismiss')"
			/>
		</div>
		<N8nButton
			variant="outline"
			size="small"
			icon="sparkles"
			data-test-id="fix-with-ai-button"
			:class="$style.button"
			@click="$emit('fix-with-ai')"
		>
			{{ i18n.baseText('nodeView.fixWithAi.button') }}
		</N8nButton>
	</div>
</template>

<style module lang="scss">
.notice {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	width: max-content;
	max-width: min(360px, calc(100% - var(--spacing--sm) * 2));
	padding: var(--spacing--2xs) var(--spacing--xs) var(--spacing--xs);
	border: var(--border-width) var(--border-style) var(--callout--border-color--danger);
	border-radius: var(--radius);
	background-color: var(--callout--color--background--danger);
	color: var(--callout--color--text--danger);
	box-shadow: var(--box-shadow--base);
}

.header {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
}

.headerIcon {
	flex-shrink: 0;
	color: var(--callout--icon-color--danger);
	line-height: 1;
	margin-top: 2px;
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	flex: 1;
	min-width: 0;
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--lg);
}

.title {
	font-weight: var(--font-weight--medium);
	color: var(--color--text);
}

.message {
	color: var(--color--text--tint-1);
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 4;
	line-clamp: 4;
	-webkit-box-orient: vertical;
	word-break: break-word;
}

.dismiss {
	flex-shrink: 0;
	margin: -2px -4px 0 0;
}

.button {
	width: 100%;
}
</style>
