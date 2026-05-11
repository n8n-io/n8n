<script setup lang="ts">
import { computed, provide } from 'vue';

import type { NodeSetupState } from '@/features/setupPanel/setupPanel.types';
import type { INodeUi } from '@/Interface';
import { ExpressionLocalResolveContextSymbol } from '@/app/constants';
import { useExpressionResolveCtx } from '@/features/workflows/canvas/experimental/composables/useExpressionResolveCtx';

const props = defineProps<{
	state: NodeSetupState;
}>();

const node = computed<INodeUi | null>(() => props.state.node);
const expressionResolveCtx = useExpressionResolveCtx(node);
provide(ExpressionLocalResolveContextSymbol, expressionResolveCtx);
</script>

<template>
	<div>
		<slot />
	</div>
</template>
