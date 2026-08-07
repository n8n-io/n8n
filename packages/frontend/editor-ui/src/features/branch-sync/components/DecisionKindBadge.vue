<script lang="ts" setup>
import { N8nBadge, N8nTooltip } from '@n8n/design-system';
import { computed } from 'vue';

import type { Decision } from '@/features/branch-sync/branchSync.types';
import { getDecisionLabel, getDecisionTheme } from '@/features/branch-sync/branchSync.utils';

const props = defineProps<{
	decision: Decision;
}>();

const theme = computed(() => getDecisionTheme(props.decision.kind));
const label = computed(() => getDecisionLabel(props.decision.kind));
</script>

<template>
	<N8nTooltip :content="decision.note" :disabled="!decision.note" placement="top">
		<N8nBadge :theme="theme" size="small" data-test-id="branch-sync-decision-badge">
			{{ label }}
		</N8nBadge>
	</N8nTooltip>
</template>
