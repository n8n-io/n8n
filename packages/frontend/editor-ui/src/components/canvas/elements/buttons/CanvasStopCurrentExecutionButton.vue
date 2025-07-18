<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
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
		icon="square"
		size="medium"
		class="stop-execution"
		type="tertiary"
		text
		:title="title"
		:loading="stopping"
		data-test-id="stop-execution-button"
	/>
</template>
