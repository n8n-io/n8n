<script lang="ts" setup>
import { computed } from 'vue';
import { N8nBadge } from '@n8n/design-system';
import type { ExecutionCallerKind } from '@n8n/api-types';
import { CALLER_SOURCE_LABEL } from '../executions.utils';

/**
 * Single source of truth for the caller-kind chip (MCP / CLI / SDK). All
 * list/detail surfaces that surface the caller's transport should render this
 * badge so the kind-to-color mapping stays consistent.
 */
const props = defineProps<{
	kind: ExecutionCallerKind | string | undefined;
}>();

const text = computed(() => {
	if (!props.kind) return '';
	return CALLER_SOURCE_LABEL[props.kind] ?? props.kind.toUpperCase();
});
</script>

<template>
	<N8nBadge
		v-if="kind"
		:class="[$style.badge, $style[`kind-${kind}`]]"
		:show-border="false"
		data-test-id="executions-caller-badge"
	>
		{{ text }}
	</N8nBadge>
</template>

<style lang="scss" module>
.badge {
	font-family: var(--font-family);
}

.kind-mcp {
	background: var(--color--primary--tint-2);
	color: var(--color--primary--shade-1);
}

.kind-cli {
	background: var(--color--success--tint-2);
	color: var(--color--success--shade-1);
}

.kind-sdk {
	background: var(--color--warning--tint-2);
	color: var(--color--warning--shade-1);
}

.kind-instance-ai {
	background: var(--color--secondary--tint-2);
	color: var(--color--secondary--shade-1);
}
</style>
