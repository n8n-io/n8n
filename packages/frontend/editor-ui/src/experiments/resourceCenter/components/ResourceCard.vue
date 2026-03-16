<script setup lang="ts">
import { computed } from 'vue';
import type { ResourceItem } from '../data/resourceCenterData';
import { N8nIcon } from '@n8n/design-system';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useI18n } from '@n8n/i18n';

export type CardVariant = 'header' | 'accent' | 'spotlight';

const props = withDefaults(
	defineProps<{
		item: ResourceItem;
		variant?: CardVariant;
	}>(),
	{ variant: 'header' },
);

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

const typeIcon = computed(
	() =>
		({
			template: 'file-text',
			video: 'youtube',
			'ready-to-run': 'zap',
		}) as const,
);
</script>

<template>
	<!-- ============ VARIANT A: Header Strip ============ -->
	<div
		v-if="variant === 'header'"
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
				<N8nIcon icon="youtube" size="small" />
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

			<div :class="$style.title" data-testid="resource-card-title">
				{{ item.title }}
			</div>

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

	<!-- ============ VARIANT B: Accent Border ============ -->
	<div
		v-else-if="variant === 'accent'"
		:class="[$style.accentCard, $style[`accent_${item.type}`]]"
		role="button"
		tabindex="0"
		data-testid="resource-card"
		@click="$emit('click')"
		@keydown.enter="$emit('click')"
	>
		<div :class="$style.accentTop">
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
		</div>

		<div :class="$style.accentTitle" data-testid="resource-card-title">
			{{ item.title }}
		</div>

		<div :class="$style.accentBottom" data-testid="resource-card-metadata">
			<div :class="$style.accentMeta">
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
			<div v-if="resolvedNodeTypes.length > 0" :class="$style.accentIcons">
				<NodeIcon
					v-for="nodeType in resolvedNodeTypes"
					:key="nodeType!.name"
					:node-type="nodeType"
					:size="18"
				/>
			</div>
		</div>
	</div>

	<!-- ============ VARIANT C: Spotlight ============ -->
	<div
		v-else
		:class="[$style.spotCard, $style[`spotAccent_${item.type}`]]"
		role="button"
		tabindex="0"
		data-testid="resource-card"
		@click="$emit('click')"
		@keydown.enter="$emit('click')"
	>
		<!-- Row 1: Type icon + badge -->
		<div :class="$style.spotHeader">
			<div :class="[$style.spotIcon, $style[`spotIconColor_${item.type}`]]">
				<N8nIcon :icon="typeIcon[item.type]" size="small" />
			</div>
			<div
				:class="[$style.badge, $style[badgeConfig[item.type].colorClass]]"
				data-testid="resource-card-badge"
			>
				{{ badgeConfig[item.type].label }}
			</div>
		</div>

		<!-- Row 2: Title -->
		<div :class="$style.spotTitle" data-testid="resource-card-title">
			{{ item.title }}
		</div>

		<!-- Row 3: Node icons (if available) -->
		<div v-if="resolvedNodeTypes.length > 0" :class="$style.spotNodes">
			<NodeIcon
				v-for="nodeType in resolvedNodeTypes"
				:key="nodeType!.name"
				:node-type="nodeType"
				:size="20"
			/>
		</div>

		<!-- Row 4: Metadata -->
		<div :class="$style.spotMeta" data-testid="resource-card-metadata">
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
</template>

<style lang="scss" module>
/* ──────────────────────────────────
   Shared
   ────────────────────────────────── */

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
	background: color-mix(in srgb, var(--color--warning) 18%, transparent);
	color: var(--color--warning);
}

.badgeVideo {
	background: color-mix(in srgb, var(--color--primary) 18%, transparent);
	color: var(--color--primary);
}

.badgeReadyToRun {
	background: color-mix(in srgb, var(--color--success) 18%, transparent);
	color: var(--color--success);
}

.separator {
	color: var(--color--text--tint-2);
}

/* ──────────────────────────────────
   Variant A: Header Strip
   ────────────────────────────────── */

.card {
	display: flex;
	flex-direction: column;
	border: var(--border);
	border-radius: var(--radius--lg);
	cursor: pointer;
	transition:
		border-color 0.15s ease,
		box-shadow 0.15s ease;
	background: var(--color--background--light-3);
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
	background: color-mix(in srgb, var(--color--primary) 12%, transparent);
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
	background: color-mix(in srgb, var(--color--warning) 12%, transparent);
}

// stylelint-disable-next-line selector-class-pattern
.nodeIconsBg_ready-to-run {
	background: color-mix(in srgb, var(--color--success) 12%, transparent);
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--sm);
	flex: 1;
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

.metadata {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
	margin-top: auto;
	padding-top: var(--spacing--4xs);
}

/* ──────────────────────────────────
   Variant B: Accent Border
   ────────────────────────────────── */

.accentCard {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-radius: var(--radius--lg);
	cursor: pointer;
	background: var(--color--background--light-3);
	border: var(--border);
	border-left: 4px solid transparent;
	transition:
		border-color 0.15s ease,
		box-shadow 0.15s ease;

	&:hover {
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

		.accentTitle {
			color: var(--color--primary);
		}
	}

	&:focus-visible {
		outline: 2px solid var(--color--primary);
		outline-offset: 2px;
	}
}

.accent_template {
	border-left-color: var(--color--warning);
}

.accent_video {
	border-left-color: var(--color--primary);
}

// stylelint-disable-next-line selector-class-pattern
.accent_ready-to-run {
	border-left-color: var(--color--success);
}

.accentTop {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.accentTitle {
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

.accentBottom {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: auto;
}

.accentMeta {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
}

.accentIcons {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

/* ──────────────────────────────────
   Variant C: Spotlight
   ────────────────────────────────── */

.spotCard {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--md);
	border-radius: var(--radius--xl);
	cursor: pointer;
	background: var(--color--background--light-3);
	border: var(--border);
	border-top: 3px solid transparent;
	transition:
		box-shadow 0.2s ease,
		transform 0.2s ease;

	&:hover {
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
		transform: translateY(-2px);

		.spotTitle {
			color: var(--color--primary);
		}
	}

	&:focus-visible {
		outline: 2px solid var(--color--primary);
		outline-offset: 2px;
	}
}

.spotAccent_template {
	border-top-color: var(--color--warning);
}

.spotAccent_video {
	border-top-color: var(--color--primary);
}

// stylelint-disable-next-line selector-class-pattern
.spotAccent_ready-to-run {
	border-top-color: var(--color--success);
}

.spotHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.spotIcon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	border-radius: var(--radius);
}

.spotIconColor_template {
	background: color-mix(in srgb, var(--color--warning) 18%, transparent);
	color: var(--color--warning);
}

.spotIconColor_video {
	background: color-mix(in srgb, var(--color--primary) 18%, transparent);
	color: var(--color--primary);
}

// stylelint-disable-next-line selector-class-pattern
.spotIconColor_ready-to-run {
	background: color-mix(in srgb, var(--color--success) 18%, transparent);
	color: var(--color--success);
}

.spotTitle {
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	line-height: var(--line-height--lg);
	transition: color 0.15s ease;
}

.spotNodes {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.spotMeta {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	margin-top: auto;
}
</style>
