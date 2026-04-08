<script setup lang="ts">
import { computed } from 'vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import type { ITemplatesWorkflowFull } from '@n8n/rest-api-client';
import { useResourceCenterStore } from '../stores/resourceCenter.store';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { N8nIcon } from '@n8n/design-system';
import NodeIcon from '@/app/components/NodeIcon.vue';
import WorkflowPreviewSvg from './WorkflowPreviewSvg.vue';

// Static workflow preview images - light mode
import preview7639 from '../workflow-previews/7639.png';
import preview3050 from '../workflow-previews/3050.png';
import preview4966 from '../workflow-previews/4966.png';
import preview7177 from '../workflow-previews/7177.png';
import preview8779 from '../workflow-previews/8779.png';
import preview3100 from '../workflow-previews/3100.png';
import preview8527 from '../workflow-previews/8527.png';
import preview6270 from '../workflow-previews/6270.png';

// Static workflow preview images - dark mode
import preview7639Dark from '../workflow-previews/7639-dark.png';
import preview3050Dark from '../workflow-previews/3050-dark.png';
import preview4966Dark from '../workflow-previews/4966-dark.png';
import preview7177Dark from '../workflow-previews/7177-dark.png';
import preview8779Dark from '../workflow-previews/8779-dark.png';
import preview3100Dark from '../workflow-previews/3100-dark.png';
import preview8527Dark from '../workflow-previews/8527-dark.png';
import preview6270Dark from '../workflow-previews/6270-dark.png';

const previewImagesLight: Record<number, string> = {
	7639: preview7639,
	3050: preview3050,
	4966: preview4966,
	7177: preview7177,
	8779: preview8779,
	3100: preview3100,
	8527: preview8527,
	6270: preview6270,
};

const previewImagesDark: Record<number, string> = {
	7639: preview7639Dark,
	3050: preview3050Dark,
	4966: preview4966Dark,
	7177: preview7177Dark,
	8779: preview8779Dark,
	3100: preview3100Dark,
	8527: preview8527Dark,
	6270: preview6270Dark,
};

const props = withDefaults(
	defineProps<{
		template: ITemplatesWorkflowFull;
		noSetup?: boolean;
		onClickOverride?: () => void;
		section?: 'inspiration' | 'learn';
	}>(),
	{
		noSetup: false,
		onClickOverride: undefined,
		section: 'inspiration',
	},
);

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
const uiStore = useUIStore();
const { getTemplateRoute, trackTileClick } = useResourceCenterStore();
const router = useRouter();

const isDarkMode = computed(() => uiStore.appliedTheme === 'dark');

const templateNodes = computed(() => {
	if (!props.template?.nodes) return [];

	const uniqueNodeTypes = new Set(props.template.nodes.map((node) => node.name));
	const nodeTypesArray = Array.from(uniqueNodeTypes).slice(0, 4);

	return nodeTypesArray.map((nodeType) => nodeTypesStore.getNodeType(nodeType)).filter(Boolean);
});

const remainingNodeCount = computed(() => {
	if (!props.template?.nodes) return 0;
	const uniqueNodeTypes = new Set(props.template.nodes.map((node) => node.name));
	return Math.max(0, uniqueNodeTypes.size - 4);
});

const setupMinutes = computed(() => {
	// Estimate setup time based on number of nodes
	const nodeCount = props.template?.nodes?.length ?? 0;
	if (nodeCount <= 3) return 5;
	if (nodeCount <= 6) return 10;
	return 15;
});

const previewImage = computed(() => {
	const images = isDarkMode.value ? previewImagesDark : previewImagesLight;
	return images[props.template.id] ?? null;
});

const handleClick = async () => {
	if (props.onClickOverride) {
		props.onClickOverride();
	} else {
		trackTileClick(props.section, 'template', props.template.id);
		await router.push(getTemplateRoute(props.template.id));
	}
};
</script>

<template>
	<div :class="$style.card" @click="handleClick">
		<div :class="$style.imageContainer">
			<img
				v-if="previewImage"
				:src="previewImage"
				:alt="template.name"
				:class="$style.workflowPreview"
			/>
			<WorkflowPreviewSvg v-else :class="$style.workflowPreview" />
			<div v-if="templateNodes.length > 0" :class="$style.nodesBadge">
				<div v-for="nodeType in templateNodes" :key="nodeType!.name" :class="$style.nodeIcon">
					<NodeIcon :size="20" :stroke-width="1.5" :node-type="nodeType" />
				</div>
				<span v-if="remainingNodeCount > 0" :class="$style.moreCount"
					>+{{ remainingNodeCount }}</span
				>
			</div>
		</div>
		<div :class="$style.content">
			<div :class="$style.titleRow">
				<N8nIcon icon="workflow" :class="$style.icon" size="medium" />
				<h3 :class="$style.title">{{ template.name }}</h3>
			</div>
			<div :class="$style.meta">
				<N8nIcon icon="clock" :class="$style.clockIcon" size="xsmall" />
				<span>
					{{
						i18n.baseText('experiments.resourceCenter.template.setupTime', {
							interpolate: { minutes: setupMinutes },
						})
					}}
				</span>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.card {
	flex: 1 1 0;
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
	position: relative;
	width: 100%;
	aspect-ratio: 16 / 9;
	overflow: hidden;
	background-color: var(--color--foreground--tint-2);
	border-radius: var(--radius--lg);
	border: 1px solid var(--color--foreground--tint-1);
	transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.workflowPreview {
	width: 100%;
	height: 100%;
	pointer-events: none;
	object-fit: cover;
}

.nodesBadge {
	position: absolute;
	top: 0;
	right: 0;
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--4xs);
	background-color: var(--color--background--light-3);
	border-bottom-left-radius: var(--radius);
	border-bottom: 1px solid var(--color--foreground--tint-1);
	border-left: 1px solid var(--color--foreground--tint-1);
}

.nodeIcon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 20px;
	height: 20px;
}

.moreCount {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 20px;
	height: 20px;
	border-radius: 50%;
	background-color: var(--color--foreground--tint-1);
	border: 1px solid var(--color--background--shade-1);
	font-size: 8px;
	color: var(--color--text--tint-1);
	font-weight: var(--font-weight--bold);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding-top: var(--spacing--xs);
}

.titleRow {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
}

.icon {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
	width: 20px;
	height: 20px;
}

.title {
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
	line-height: var(--line-height--md);
	font-size: var(--font-size--sm);
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	margin: 0;
}

.meta {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	padding-left: calc(20px + var(--spacing--2xs)); /* align with title text (icon width + gap) */
}

.clockIcon {
	color: var(--color--text--tint-1);
}
</style>
