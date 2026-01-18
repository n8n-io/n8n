<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIcon } from '@n8n/design-system';
import type { QuickStartWorkflow } from '../data/quickStartWorkflows';

const props = defineProps<{
	workflow: QuickStartWorkflow;
}>();

const emit = defineEmits<{
	click: [];
}>();

const i18n = useI18n();

const nodeCount = computed(() => {
	return props.workflow.nodeCount ?? props.workflow.workflow.nodes?.length ?? 0;
});

const handleClick = () => {
	emit('click');
};
</script>

<template>
	<div :class="$style.card" @click="handleClick">
		<div :class="$style.imageContainer">
			<img
				v-if="workflow.previewImageUrl"
				:src="workflow.previewImageUrl"
				:alt="workflow.name"
				:class="$style.image"
			/>
			<div v-else :class="$style.imagePlaceholder" />
		</div>
		<div :class="$style.content">
			<div :class="$style.titleRow">
				<N8nIcon icon="workflow" :class="$style.icon" size="medium" />
				<span :class="$style.title">{{ workflow.name }}</span>
			</div>
			<div :class="$style.metaRow">
				<div :class="$style.tag">
					{{ i18n.baseText('experiments.resourceCenter.sandbox.easySetup') }}
				</div>
				<span :class="$style.nodeCount">
					{{
						i18n.baseText('experiments.resourceCenter.sandbox.nodes', {
							interpolate: { count: nodeCount },
						})
					}}
				</span>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.card {
	flex: 0 0 calc((100% - 2 * var(--spacing--sm)) / 3);
	min-width: 0;
	display: flex;
	flex-direction: column;
	cursor: pointer;
	transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);

	&:hover {
		.imageContainer {
			transform: translateY(-2px);
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		}
	}
}

.imageContainer {
	width: 100%;
	aspect-ratio: 16 / 9;
	overflow: hidden;
	background-color: var(--color--foreground--tint-2);
	border-radius: var(--radius--lg);
	border: 1px solid var(--color--foreground--tint-1);
	transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.image {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.imagePlaceholder {
	width: 100%;
	height: 100%;
	background: linear-gradient(
		135deg,
		var(--color--foreground--tint-2) 0%,
		var(--color--foreground--tint-1) 100%
	);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding-top: var(--spacing--xs);
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.icon {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
	width: 20px;
	height: 20px;
}

.title {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
	line-height: var(--line-height--md);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.metaRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding-left: calc(20px + var(--spacing--2xs)); /* align with title text (icon width + gap) */
}

.tag {
	display: inline-flex;
	align-items: center;
	padding: var(--spacing--5xs) var(--spacing--3xs);
	background-color: var(--color--success--tint-3);
	color: var(--color--success--shade-1);
	border-radius: var(--radius);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
}

.nodeCount {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}
</style>
