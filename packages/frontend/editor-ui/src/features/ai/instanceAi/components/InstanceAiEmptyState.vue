<script lang="ts" setup>
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const i18n = useI18n();
</script>

<template>
	<div :class="$style.container" data-test-id="instance-ai-empty-state">
		<N8nText tag="h1" size="xlarge" bold :class="$style.title">
			{{ i18n.baseText('instanceAi.emptyState.title') }}
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
	text-align: center;
}
</style>
