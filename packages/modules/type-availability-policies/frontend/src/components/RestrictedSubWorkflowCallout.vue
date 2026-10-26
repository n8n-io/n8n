<script setup lang="ts">
import type { PolicyViolation } from '@n8n/api-types';
import { N8nButton, N8nCallout } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { INode } from 'n8n-workflow';
import { computed, ref } from 'vue';

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

const i18n = useI18n();

// The panel is where a builder looks for the reason, so it reads a fresh answer on open.
const { restriction, checkFailed, retry } = useSubWorkflowRestriction({
	parentWorkflowId: () => parentWorkflowId,
	node: () => node,
	enabled: () => enabled,
	refresh: true,
});

const lines = computed(() =>
	restriction.value ? describeSubWorkflowRestriction(restriction.value, labelOf) : [],
);

const isRetrying = ref(false);

async function onRetry() {
	isRetrying.value = true;
	try {
		await retry();
	} finally {
		isRetrying.value = false;
	}
}
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
	<N8nCallout
		v-else-if="checkFailed"
		theme="warning"
		:class="$style.callout"
		data-test-id="sub-workflow-policy-check-failed"
	>
		{{ i18n.baseText('typeAvailabilityPolicies.restrictedSubWorkflow.checkFailed') }}
		<template #trailingContent>
			<N8nButton
				variant="ghost"
				size="small"
				:loading="isRetrying"
				data-test-id="sub-workflow-policy-check-retry"
				@click="onRetry"
			>
				{{ i18n.baseText('typeAvailabilityPolicies.restrictedSubWorkflow.retry') }}
			</N8nButton>
		</template>
	</N8nCallout>
</template>

<style lang="scss" module>
.callout {
	margin-top: var(--spacing--xs);
}
</style>
