<script setup lang="ts">
import { N8nIcon, N8nLink } from '@n8n/design-system';

import { VIEWS } from '@/app/constants';

defineProps<{
	workflowId: string;
	workflowName: string;
}>();
</script>

<template>
	<N8nLink
		:to="{ name: VIEWS.WORKFLOW, params: { workflowId } }"
		theme="text"
		size="medium"
		data-test-id="workflow-review-activity-workflow-link"
	>
		<N8nIcon icon="workflow" size="medium" :class="$style.icon" />{{ workflowName }}
	</N8nLink>
</template>

<style lang="scss" module>
/* Inline with the sentence; the offset optically centres the icon on the text
	(measured: `text-bottom` sits 1.5px low, `middle` 1.2px low). Em-relative so it
	holds if the sentence font size changes. */
.icon {
	margin-right: var(--spacing--4xs);
	vertical-align: -0.15em;
}
</style>
