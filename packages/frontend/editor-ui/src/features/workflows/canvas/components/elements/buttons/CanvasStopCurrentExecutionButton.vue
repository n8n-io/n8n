<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { N8nIconButton } from '@n8n/design-system';
const props = defineProps<{
	stopping?: boolean;
}>();

const i18n = useI18n();

const title = computed(() =>
	props.stopping
		? i18n.baseText('nodeView.stoppingCurrentExecution')
		: i18n.baseText('nodeView.stopCurrentExecution'),
);
</script>

<template>
	<N8nIconButton
		variant="subtle"
		icon="square"
		size="large"
		class="stop-execution"
		:title="title"
		:loading="stopping"
		data-test-id="stop-execution-button"
	/>
</template>
