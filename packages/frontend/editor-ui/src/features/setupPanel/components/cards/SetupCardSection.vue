<script setup lang="ts">
import { computed, provide } from 'vue';

import type { NodeSetupState } from '@/features/setupPanel/setupPanel.types';
import type { INodeUi } from '@/Interface';
import { ExpressionLocalResolveContextSymbol } from '@/app/constants';
import { useExpressionResolveCtx } from '@/features/workflows/canvas/experimental/composables/useExpressionResolveCtx';
import { useInjectWorkflowId } from '@/app/composables/useInjectWorkflowId';

const props = defineProps<{
	state: NodeSetupState;
}>();

const workflowId = useInjectWorkflowId();
const node = computed<INodeUi | null>(() => props.state.node);
const expressionResolveCtx = useExpressionResolveCtx(workflowId, node);
provide(ExpressionLocalResolveContextSymbol, expressionResolveCtx);
</script>

<template>
	<div>
		<slot />
	</div>
</template>
