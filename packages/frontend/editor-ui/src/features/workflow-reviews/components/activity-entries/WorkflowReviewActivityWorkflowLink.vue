<script setup lang="ts">
import { N8nIcon, N8nLink } from '@n8n/design-system';
import { computed } from 'vue';

import { VIEWS } from '@/app/constants';

const props = defineProps<{
	workflowId: string;
	workflowName: string;
	version?: string;
}>();

const label = computed(() =>
	props.version ? `${props.workflowName} ${props.version}` : props.workflowName,
);
</script>

<template>
	<N8nLink
		:to="{ name: VIEWS.WORKFLOW, params: { workflowId } }"
		theme="text"
		size="medium"
		data-test-id="workflow-review-activity-workflow-link"
	>
		<N8nIcon icon="workflow" size="medium" :class="$style.icon" />{{ label }}
	</N8nLink>
</template>

<style lang="scss" module>
/* Inline with the sentence; the offset optically centres the icon on the text. */
.icon {
	margin-right: var(--spacing--4xs);
	vertical-align: -0.15em;
}
</style>
