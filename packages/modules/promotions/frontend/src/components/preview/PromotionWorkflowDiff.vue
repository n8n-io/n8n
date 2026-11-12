<script setup lang="ts">
import type { PromotionDirection, PromotionResourceDetail } from '@n8n/api-types';
import { N8nText } from '@n8n/design-system';
import { capabilities, capabilityRegistry, componentRegistry } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { computed, inject, onMounted } from 'vue';

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
const tagNames = capabilityRegistry.use(capabilities.tagNames);
const WorkflowDiff = computed(() => componentRegistry.get('workflow-diff'));

onMounted(async () => {
	try {
		await tagNames.load();
	} catch {
		// Without the instance tags, unchanged tags show their ids.
	}
});

// The preview has the names of changed tags. Other tags have the same id on this instance.
function tagNameOf(side: DetailSide) {
	return (id: string) => {
		const resource = props.graph.resources.get(`tag:${id}`);
		if (!resource) return tagNames.nameOf(id) ?? id;
		return side === 'before' ? (resource.previousName ?? resource.name) : resource.name;
	};
}

function snapshotOf(side: DetailSide) {
	const state = toPromotionDiffSide(props.detail, side, tagNameOf(side));
	return state.kind === 'content' ? state.content : undefined;
}

const source = computed(() => snapshotOf('before'));
const target = computed(() => snapshotOf('after'));
// Both sides have the same id. A side with a different name sets its own.
const workflow = computed(() => props.detail.after ?? props.detail.before);

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
		<component
			:is="WorkflowDiff"
			v-if="WorkflowDiff"
			:workflow-id="workflow?.id ?? resourceKey"
			:workflow-name="workflow?.name ?? ''"
			:source-snapshot="source"
			:target-snapshot="target"
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
		</component>
	</div>
</template>

<style module lang="scss">
.diff {
	height: 100%;
}
</style>
