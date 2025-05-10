<script lang="ts" setup>
import { useI18n } from '@/composables/useI18n';

const i18n = useI18n();
</script>

<template>
	<div :class="$style.callout">
		<N8nIcon icon="chart-bar" size="xlarge"></N8nIcon>
		<N8nText bold tag="h3" size="large">
			{{ i18n.baseText('insights.dashboard.collecting.title') }}
		</N8nText>
		<N8nText>
			{{ i18n.baseText('insights.dashboard.collecting.description') }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.callout {
	display: flex;
	flex-direction: column;
	height: 100%;
	padding: 6rem 0;
	align-items: center;
	max-width: 290px;
	margin: 0 auto;
	text-align: center;
	gap: 10px;
	justify-content: center;
}
</style>
