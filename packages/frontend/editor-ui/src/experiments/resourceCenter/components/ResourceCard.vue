<script setup lang="ts">
import { computed } from 'vue';
import type { ResourceItem } from '../data/resourceCenterData';
import { N8nIcon } from '@n8n/design-system';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useI18n } from '@n8n/i18n';

const props = defineProps<{
	item: ResourceItem;
}>();

defineEmits<{
	click: [];
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();

const badgeConfig = computed(
	() =>
		({
			template: {
				label: i18n.baseText('experiments.resourceCenter.badge.template'),
				icon: undefined,
				colorClass: 'badgeTemplate',
			},
			video: {
				label: i18n.baseText('experiments.resourceCenter.badge.video'),
				icon: 'youtube',
				colorClass: 'badgeVideo',
			},
			'ready-to-run': {
				label: i18n.baseText('experiments.resourceCenter.badge.readyToRun'),
				icon: 'zap',
				colorClass: 'badgeReadyToRun',
			},
		}) as const,
);

const resolvedNodeTypes = computed(() => {
	if (!props.item.nodeTypes?.length) return [];
	return props.item.nodeTypes
		.map((type) => nodeTypesStore.getNodeType(type))
		.filter(Boolean)
		.slice(0, 4);
});
</script>

<template>
	<div
		:class="$style.card"
		role="button"
		tabindex="0"
		data-testid="resource-card"
		@click="$emit('click')"
		@keydown.enter="$emit('click')"
	>
		<!-- Video Header -->
		<div v-if="item.type === 'video'" :class="$style.videoHeader">
			<div :class="$style.playCircle">
				<N8nIcon icon="youtube" size="xlarge" />
			</div>
			<span v-if="item.duration" :class="$style.videoDuration">{{ item.duration }}</span>
		</div>

		<!-- Node Icons Header (template / ready-to-run) -->
		<div
			v-else-if="resolvedNodeTypes.length > 0"
			:class="[$style.nodeIconsHeader, $style[`nodeIconsBg_${item.type}`]]"
		>
			<NodeIcon
				v-for="nodeType in resolvedNodeTypes"
				:key="nodeType!.name"
				:node-type="nodeType"
				:size="28"
				:show-tooltip="true"
			/>
		</div>

		<!-- Card Body -->
		<div :class="$style.body">
			<!-- Type Badge -->
			<div
				:class="[$style.badge, $style[badgeConfig[item.type].colorClass]]"
				data-testid="resource-card-badge"
			>
				<N8nIcon
					v-if="badgeConfig[item.type].icon"
					:icon="badgeConfig[item.type].icon!"
					size="xsmall"
				/>
				{{ badgeConfig[item.type].label }}
			</div>

			<!-- Title -->
			<div :class="$style.title" data-testid="resource-card-title">
				{{ item.title }}
			</div>

			<!-- Metadata -->
			<div :class="$style.metadata" data-testid="resource-card-metadata">
				<template v-if="item.type === 'video'">
					<span v-if="item.duration">{{ item.duration }}</span>
					<span v-if="item.duration && item.level" :class="$style.separator">&middot;</span>
					<span v-if="item.level">{{ item.level }}</span>
				</template>
				<template v-else-if="item.type === 'ready-to-run'">
					<N8nIcon icon="circle-check" size="xsmall" />
					<span>No setup needed</span>
				</template>
				<template v-else-if="item.type === 'template'">
					<span v-if="item.setupTime">{{ item.setupTime }}</span>
					<span v-if="item.setupTime && item.nodeCount" :class="$style.separator">&middot;</span>
					<span v-if="item.nodeCount">{{
						i18n.baseText('experiments.resourceCenter.sandbox.nodes', {
							interpolate: { count: String(item.nodeCount) },
						})
					}}</span>
				</template>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.card {
	display: flex;
	flex-direction: column;
	border: var(--border);
	border-radius: var(--radius--lg);
	cursor: pointer;
	transition:
		border-color 0.15s ease,
		box-shadow 0.15s ease;
	background: var(--color--foreground--tint-2);
	overflow: hidden;

	&:hover {
		border-color: var(--color--primary--tint-1);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);

		.title {
			color: var(--color--primary);
		}
	}

	&:focus-visible {
		outline: 2px solid var(--color--primary);
		outline-offset: 2px;
	}
}

.videoHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--md) var(--spacing--sm);
	border-bottom: var(--border);
	background: var(--color--primary--tint-3);
}

.playCircle {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	border-radius: 50%;
	background: var(--color--primary);
	color: #fff;
}

.videoDuration {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--primary);
}

.nodeIconsHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--md) var(--spacing--sm);
	border-bottom: var(--border);
}

.nodeIconsBg_template {
	background: var(--color--warning--tint-2);
}

// stylelint-disable-next-line selector-class-pattern
.nodeIconsBg_ready-to-run {
	background: var(--color--success--tint-3);
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--sm);
	flex: 1;
}

.badge {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	text-transform: uppercase;
	letter-spacing: 0.04em;
	padding: 2px var(--spacing--4xs);
	border-radius: var(--radius--sm);
	width: fit-content;
}

.badgeTemplate {
	background: var(--color--warning--tint-2);
	color: var(--color--warning--shade-1);
}

.badgeVideo {
	background: var(--color--primary--tint-3);
	color: var(--color--primary);
}

.badgeReadyToRun {
	background: var(--color--success--tint-3);
	color: var(--color--success--shade-1);
}

.title {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	line-height: var(--line-height--md);
	transition: color 0.15s ease;
}

.description {
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	line-height: var(--line-height--xl);
}

.metadata {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
	margin-top: auto;
	padding-top: var(--spacing--4xs);
}

.separator {
	color: var(--color--text--tint-2);
}
</style>
