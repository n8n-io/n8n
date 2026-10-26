<script setup lang="ts">
import type { PromotionDirection, PromotionResourceDetail } from '@n8n/api-types';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, inject, onMounted } from 'vue';

import { useTagsStore } from '@/features/shared/tags/tags.store';
import WorkflowDiffView from '@/features/workflows/workflowDiff/WorkflowDiffView.vue';
import { toDiffWorkflow } from '@/features/workflows/workflowDiff/workflowDiff.utils';

import { PromotionAbsentSideLabelsKey, type DetailSide } from '../../promotionPreview.content';
import type { ResourceKey, SelectionGraph } from '../../promotionPreview.selection';
import { isBranchSide, toPromotionDiffSide } from '../../promotionPreview.workflow';
import PromotionWorkflowSideLabel from './PromotionWorkflowSideLabel.vue';

const props = defineProps<{
	detail: Extract<PromotionResourceDetail, { type: 'workflow' }>;
	resourceKey: ResourceKey;
	direction: PromotionDirection;
	graph: SelectionGraph;
}>();

const i18n = useI18n();
const absentLabels = inject(PromotionAbsentSideLabelsKey, undefined);
const tagsStore = useTagsStore();

onMounted(async () => {
	try {
		await tagsStore.fetchAll();
	} catch {
		// Without the instance tags, unchanged tags show their ids.
	}
});

// The preview has the names of changed tags. Other tags have the same id on this instance.
function tagNameOf(side: DetailSide) {
	return (id: string) => {
		const resource = props.graph.resources.get(`tag:${id}`);
		if (!resource) return tagsStore.tagsById[id]?.name ?? id;
		return side === 'before' ? (resource.previousName ?? resource.name) : resource.name;
	};
}

function workflowOf(side: DetailSide) {
	const state = toPromotionDiffSide(props.detail, side, tagNameOf(side));
	return state.kind === 'content' ? toDiffWorkflow(state.content) : undefined;
}

const source = computed(() => workflowOf('before'));
const target = computed(() => workflowOf('after'));

function emptyTextOf(side: DetailSide) {
	return (
		absentLabels?.[side] ??
		i18n.baseText(
			isBranchSide(side, props.direction)
				? 'promotions.preview.side.notOnBranch'
				: 'promotions.preview.side.notOnInstance',
		)
	);
}
</script>

<template>
	<div :class="$style.diff" data-test-id="promotion-preview-workflow-diff">
		<WorkflowDiffView
			:source-workflow="source"
			:target-workflow="target"
			:canvas-id-prefix="resourceKey"
			show-fullscreen-button
			require-canvas-focus
			hide-title
		>
			<template #sourceLabel>
				<PromotionWorkflowSideLabel side="before" />
			</template>
			<template #targetLabel>
				<PromotionWorkflowSideLabel side="after" />
			</template>
			<template #sourceEmptyText>
				<N8nText size="small" color="text-base">{{ emptyTextOf('before') }}</N8nText>
			</template>
			<template #targetEmptyText>
				<N8nText size="small" color="text-base">{{ emptyTextOf('after') }}</N8nText>
			</template>
		</WorkflowDiffView>
	</div>
</template>

<style module lang="scss">
.diff {
	height: 100%;
}
</style>
