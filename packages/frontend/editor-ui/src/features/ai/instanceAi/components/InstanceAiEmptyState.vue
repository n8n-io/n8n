<script lang="ts" setup>
import { N8nText, N8nIcon } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

const i18n = useI18n();

const props = withDefaults(
	defineProps<{
		titleKey?: BaseTextKey;
		subtitleKey?: BaseTextKey;
		showTitleIcon?: boolean;
	}>(),
	{
		titleKey: 'instanceAi.emptyState.title',
		subtitleKey: undefined,
		showTitleIcon: false,
	},
);
</script>

<template>
	<div :class="$style.container" data-test-id="instance-ai-empty-state">
		<N8nText tag="h1" size="xlarge" bold :class="$style.title">
			<N8nIcon v-if="props.showTitleIcon" icon="n8n-assistant" :class="$style.titleIcon" />
			{{ i18n.baseText(props.titleKey) }}
		</N8nText>
		<N8nText
			v-if="props.subtitleKey"
			tag="p"
			size="small"
			color="text-light"
			:class="$style.subtitle"
			data-test-id="instance-ai-empty-state-subtitle"
		>
			{{ i18n.baseText(props.subtitleKey) }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.title {
	display: flex;
	align-items: center;
	text-align: center;
}

.titleIcon {
	margin-right: var(--spacing--2xs);
}

.subtitle {
	max-width: 36rem;
	margin: var(--spacing--2xs) 0 0;
	text-align: center;
}
</style>
