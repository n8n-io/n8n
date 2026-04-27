<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nSpinner, N8nText } from '@n8n/design-system';

defineProps<{
	state: 'pending' | 'success' | 'error';
}>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.step">
		<template v-if="state === 'pending'">
			<N8nSpinner size="large" type="ring" />
			<N8nText size="large" bold>
				{{ i18n.baseText('evaluation.wizard.apply.title') }}
			</N8nText>
		</template>
		<template v-else-if="state === 'success'">
			<N8nIcon icon="circle-check" color="success" size="xlarge" />
			<N8nText size="large" bold>
				{{ i18n.baseText('evaluation.wizard.apply.success') }}
			</N8nText>
		</template>
		<template v-else>
			<N8nIcon icon="triangle-alert" color="danger" size="xlarge" />
			<N8nText size="large" bold>
				{{ i18n.baseText('evaluation.wizard.apply.error') }}
			</N8nText>
		</template>
	</div>
</template>

<style module lang="scss">
.step {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--xl) 0;
}
</style>
