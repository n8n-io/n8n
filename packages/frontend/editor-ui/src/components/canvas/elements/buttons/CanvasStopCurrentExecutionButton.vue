<script lang="ts" setup>
import { useI18n } from '@/composables/useI18n';
import { computed } from 'vue';

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
		icon="stop"
		size="large"
		class="stop-execution"
		type="secondary"
		:title="title"
		:loading="stopping"
		data-test-id="stop-execution-button"
	/>
</template>
