<script lang="ts" setup>
import { N8nText, N8nIcon } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

const i18n = useI18n();

const props = withDefaults(
	defineProps<{
		titleKey?: BaseTextKey;
		showTitleIcon?: boolean;
	}>(),
	{
		titleKey: 'instanceAi.emptyState.title',
		showTitleIcon: false,
	},
);
</script>

<template>
	<div :class="$style.container" data-test-id="instance-ai-empty-state">
		<N8nText tag="h1" size="xlarge" bold :class="$style.title">
			<N8nIcon v-if="props.showTitleIcon" icon="sparkles" :class="$style.titleIcon" />
			{{ i18n.baseText(props.titleKey) }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
	from {
		opacity: 0;
		transform: translateY(8px);
	}

	to {
		opacity: 1;
		transform: translateY(0);
	}
}

.title {
	display: flex;
	align-items: center;
	text-align: center;
}

.titleIcon {
	margin-right: var(--spacing--2xs);
}
</style>
