<script setup lang="ts">
import type { PolicyViolation } from '@n8n/api-types';
import { N8nCallout } from '@n8n/design-system';
import type { INode } from 'n8n-workflow';
import { computed } from 'vue';

import {
	describeSubWorkflowRestriction,
	useSubWorkflowRestriction,
} from '../composables/useSubWorkflowRestriction';

const {
	parentWorkflowId,
	node,
	enabled = true,
	labelOf,
} = defineProps<{
	parentWorkflowId?: string;
	node: Pick<INode, 'type' | 'parameters'>;
	enabled?: boolean;
	labelOf?: (violation: PolicyViolation) => string | undefined;
}>();

// The panel is where a builder looks for the reason, so it reads a fresh answer on open.
const { restriction } = useSubWorkflowRestriction({
	parentWorkflowId: () => parentWorkflowId,
	node: () => node,
	enabled: () => enabled,
	refresh: true,
});

const lines = computed(() =>
	restriction.value ? describeSubWorkflowRestriction(restriction.value, labelOf) : [],
);
</script>

<template>
	<N8nCallout
		v-if="restriction"
		theme="warning"
		:class="$style.callout"
		data-test-id="restricted-sub-workflow-callout"
	>
		<p v-for="line in lines" :key="line">{{ line }}</p>
	</N8nCallout>
</template>

<style lang="scss" module>
.callout {
	margin-top: var(--spacing--xs);
}
</style>
