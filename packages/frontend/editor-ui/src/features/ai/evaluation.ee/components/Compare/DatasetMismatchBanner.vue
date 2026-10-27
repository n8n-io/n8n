<script setup lang="ts">
import { N8nCallout } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { DatasetMismatch } from '../../composables/useCompareCases';

const props = defineProps<{
	mismatch: DatasetMismatch;
}>();

const i18n = useI18n();

const countsLabel = computed(() => props.mismatch.counts.join(', '));
</script>

<template>
	<N8nCallout theme="warning" icon="triangle-alert" data-test-id="compare-dataset-mismatch">
		{{
			i18n.baseText('evaluation.compare.datasetMismatch', {
				interpolate: { counts: countsLabel },
			})
		}}
	</N8nCallout>
</template>
