<script setup lang="ts">
import type { PromotionDirection } from '@n8n/api-types';
import { computed, defineAsyncComponent } from 'vue';

import type { DetailEntry } from '../../composables/usePromotionResourceDetails';
import { hasUnreadableSide } from '../../promotionPreview.content';
import type { ResourceKey, SelectionGraph } from '../../promotionPreview.selection';
import type { WorkflowShellStatus } from '../../promotionPreview.workflow';
import PromotionWorkflowShell from './PromotionWorkflowShell.vue';

const props = defineProps<{
	active: boolean;
	entry?: DetailEntry;
	resourceKey: ResourceKey;
	workflowName: string;
	direction: PromotionDirection;
	branchName?: string;
	graph: SelectionGraph;
}>();
const emit = defineEmits<{ activate: []; retry: []; refresh: [] }>();
const detail = computed(() =>
	props.entry?.status === 'loaded' && props.entry.detail.type === 'workflow'
		? props.entry.detail
		: undefined,
);
const unreadable = computed(() => !!detail.value && hasUnreadableSide(detail.value));
const status = computed((): WorkflowShellStatus => {
	if (!props.active) return 'idle';
	if (unreadable.value) return 'unreadable';
	if (props.entry?.status === 'error' || props.entry?.status === 'missing') {
		return props.entry.status;
	}
	return 'loading';
});
const PromotionWorkflowDiff = defineAsyncComponent(
	async () => await import('./PromotionWorkflowDiff.vue'),
);
</script>

<template>
	<div :class="$style.preview" data-test-id="promotion-workflow-preview">
		<Suspense v-if="active && detail && !unreadable">
			<PromotionWorkflowDiff
				:detail="detail"
				:resource-key="resourceKey"
				:direction="direction"
				:branch-name="branchName"
				:graph="graph"
			/>
			<template #fallback>
				<PromotionWorkflowShell
					status="loading"
					:workflow-name="workflowName"
					:direction="direction"
					:branch-name="branchName"
				/>
			</template>
		</Suspense>
		<PromotionWorkflowShell
			v-else
			:status="status"
			:workflow-name="workflowName"
			:direction="direction"
			:branch-name="branchName"
			@activate="emit('activate')"
			@retry="emit('retry')"
			@refresh="emit('refresh')"
		/>
	</div>
</template>

<style module lang="scss">
.preview {
	// The canvas needs a viewport-relative height. No size token fits this layout.
	height: max(28rem, 70vh);
	border-top: var(--border);
}
</style>
