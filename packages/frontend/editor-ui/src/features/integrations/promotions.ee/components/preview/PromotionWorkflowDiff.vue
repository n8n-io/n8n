<script setup lang="ts">
import type { PromotionDirection, PromotionResourceDetail } from '@n8n/api-types';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, defineAsyncComponent, onMounted } from 'vue';

import { useTagsStore } from '@/features/shared/tags/tags.store';
import { toDiffWorkflow } from '@/features/workflows/workflowDiff/workflowDiff.utils';

import type { DetailSide } from '../../promotionPreview.content';
import type { ResourceKey, SelectionGraph } from '../../promotionPreview.selection';
import { toPromotionDiffSide } from '../../promotionPreview.workflow';

// The canvas code loads only when a diff opens.
const WorkflowDiffView = defineAsyncComponent(
	async () => await import('@/features/workflows/workflowDiff/WorkflowDiffView.vue'),
);

const props = defineProps<{
	detail: Extract<PromotionResourceDetail, { type: 'workflow' }>;
	resourceKey: ResourceKey;
	direction: PromotionDirection;
	branchName?: string;
	graph: SelectionGraph;
}>();

const i18n = useI18n();
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

// Promote changes the branch to match this instance. Apply does the opposite.
const branchSide = computed((): DetailSide => (props.direction === 'promote' ? 'before' : 'after'));

function labelOf(side: DetailSide) {
	return side === branchSide.value
		? i18n.baseText(`promotions.preview.branch.${props.direction}`, {
				interpolate: { branch: props.branchName ?? '' },
			})
		: i18n.baseText('promotions.preview.side.instance');
}

function emptyTextOf(side: DetailSide) {
	return i18n.baseText(
		side === branchSide.value
			? 'promotions.preview.side.notOnBranch'
			: 'promotions.preview.side.notOnInstance',
	);
}
</script>

<template>
	<div :class="$style.diff" data-test-id="promotion-preview-workflow-diff">
		<WorkflowDiffView
			:source-workflow="source"
			:target-workflow="target"
			:source-label="labelOf('before')"
			:target-label="labelOf('after')"
			:canvas-id-prefix="resourceKey"
			show-fullscreen-button
			hide-title
		>
			<template #sourceLabel>
				<span :class="$style.badge">
					<span :class="[$style.dot, $style.before]" />
					<N8nText color="text-dark" size="small" compact>{{ labelOf('before') }}</N8nText>
				</span>
			</template>
			<template #targetLabel>
				<span :class="$style.badge">
					<span :class="[$style.dot, $style.after]" />
					<N8nText color="text-dark" size="small" compact>{{ labelOf('after') }}</N8nText>
				</span>
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
	/* The canvases size themselves to this height. No token fits, so 28rem matches the review diff. */
	height: max(28rem, 70vh);
	border-top: var(--border);
}

.badge {
	composes: sourceBadge from '../../../../workflows/workflowDiff/workflowDiff.module.scss';
}

.dot {
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	border-radius: var(--radius--full);
	flex-shrink: 0;
}

.before {
	background-color: var(--color--mint-600);
}

.after {
	background-color: var(--color--yellow-500);
}
</style>
