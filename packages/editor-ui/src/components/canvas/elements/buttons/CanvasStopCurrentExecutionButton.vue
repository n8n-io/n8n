<script lang="ts" setup>
import { useI18n } from '@/composables/useI18n';
import { computed } from 'vue';

const props = defineProps<{
	loading?: boolean;
}>();

const i18n = useI18n();

const title = computed(() =>
	props.loading
		? i18n.baseText('nodeView.stoppingCurrentExecution')
		: i18n.baseText('nodeView.stopCurrentExecution'),
);
</script>

<template>
	<n8n-icon-button
		icon="stop"
		size="large"
		class="stop-execution"
		type="secondary"
		:title="title"
		:loading="loading"
		data-test-id="stop-execution-button"
	/>
</template>
