<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { ResourceItem } from '../data/resourceCenterData';

const props = defineProps<{
	item: ResourceItem;
}>();

const emit = defineEmits<{
	click: [];
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();

const emitClick = () => emit('click');

const onCardKeyActivate = (event: KeyboardEvent) => {
	if (event.target !== event.currentTarget) {
		return;
	}

	emitClick();
};

const tagLabel = computed(() =>
	props.item.type === 'video'
		? i18n.baseText('experiments.resourceCenter.badge.video')
		: i18n.baseText('experiments.resourceCenter.badge.template'),
);

const resolvedTemplateNodeTypes = computed(() => {
	if (props.item.type !== 'template' || !props.item.nodeTypes?.length) {
		return [];
	}

	const allResolved = props.item.nodeTypes
		.map((type) => nodeTypesStore.getNodeType(type))
		.filter(
			(nodeType): nodeType is NonNullable<typeof nodeType> =>
				nodeType !== null && nodeType !== undefined,
		);

	const seenNodeNames = new Set<string>();

	return allResolved.filter((nodeType) => {
		if (seenNodeNames.has(nodeType.name)) {
			return false;
		}

		seenNodeNames.add(nodeType.name);
		return true;
	});
});

const visibleNodeTypes = computed(() => resolvedTemplateNodeTypes.value.slice(0, 3));

const remainingNodeTypeCount = computed(() =>
	Math.max(0, resolvedTemplateNodeTypes.value.length - visibleNodeTypes.value.length),
);

const videoSourceLabel = computed(() => {
	if (props.item.type !== 'video') {
		return '';
	}

	if (!props.item.url) {
		return 'youtube.com';
	}

	try {
		return new URL(props.item.url).hostname.replace(/^www\./, '');
	} catch {
		return props.item.url;
	}
});
</script>

<template>
	<article
		:class="$style.card"
		role="button"
		tabindex="0"
		data-testid="resource-card"
		@click="emitClick"
		@keydown.enter.prevent="onCardKeyActivate"
		@keyup.space.prevent="onCardKeyActivate"
	>
		<div :class="$style.tag" data-testid="resource-card-badge">
			{{ tagLabel }}
		</div>

		<h3 :class="$style.title" data-testid="resource-card-title">
			{{ item.title }}
		</h3>

		<div :class="$style.footer" data-testid="resource-card-metadata">
			<p :class="$style.meta">
				<template v-if="item.type === 'video'">
					{{ videoSourceLabel }}
				</template>
				<template v-else>
					<span v-if="item.setupTime">{{ item.setupTime }}</span>
					<span v-if="item.setupTime && item.nodeCount" :class="$style.separator">&bull;</span>
					<span v-if="item.nodeCount">{{
						i18n.baseText('experiments.resourceCenter.sandbox.nodes', {
							interpolate: { count: String(item.nodeCount) },
						})
					}}</span>
				</template>
			</p>

			<div v-if="visibleNodeTypes.length > 0" :class="$style.iconStack">
				<span
					v-for="(nodeType, index) in visibleNodeTypes"
					:key="nodeType.name"
					:class="$style.iconBubble"
					:style="{ zIndex: String(visibleNodeTypes.length - index + 1) }"
				>
					<NodeIcon :node-type="nodeType" :size="12" :circle="true" />
				</span>
				<span
					v-if="remainingNodeTypeCount > 0"
					:class="$style.countBubble"
					:style="{ zIndex: '1' }"
				>
					+{{ remainingNodeTypeCount }}
				</span>
			</div>
		</div>
	</article>
</template>

<style lang="scss" module>
.card {
	display: flex;
	flex-direction: column;
	min-height: 7.25rem;
	padding: var(--spacing--sm);
	gap: var(--spacing--xs);
	border-radius: 8px;
	background: var(--resource-center--color--background--card, white);
	border: 0.5px solid var(--resource-center--border-color--card, rgba(0, 0, 0, 0.1));
	box-shadow: var(
		--resource-center--shadow--card,
		0 0 0 0.5px rgba(0, 0, 0, 0.1),
		0 1px 3px -1px rgba(0, 0, 0, 0.1)
	);
	cursor: pointer;
	transition:
		transform 0.18s ease,
		box-shadow 0.18s ease,
		border-color 0.18s ease;

	&:hover {
		transform: translateY(-1px);
		border-color: color-mix(in srgb, var(--color--primary) 24%, transparent);
		box-shadow:
			0 0 0 0.5px color-mix(in srgb, var(--color--primary) 14%, transparent),
			0 0.875rem 1.75rem -1.25rem color-mix(in srgb, var(--color--text--shade-1) 22%, transparent);
	}

	&:focus-visible {
		outline: 2px solid var(--color--primary);
		outline-offset: 2px;
	}
}

.tag {
	display: inline-flex;
	align-items: center;
	min-height: 1.5rem;
	padding: 0 var(--spacing--2xs);
	border-radius: 999px;
	width: fit-content;
	background: var(--resource-center--color--background--card-tag);
	border: 1px solid var(--resource-center--border-color--card-tag);
	color: var(--resource-center--color--text--card-tag);
	font-size: var(--font-size--2xs);
	font-weight: 500;
	line-height: 1;
}

.title {
	margin: 0;
	color: var(--resource-center--color--text, var(--color--text--shade-1));
	font-size: var(--font-size--sm);
	font-weight: 500;
	line-height: var(--line-height--lg);
	min-height: 2.375rem;
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
}

.footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	margin-top: auto;
}

.meta {
	margin: 0;
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	color: var(--resource-center--color--text--muted, var(--color--text--tint-1));
	font-size: var(--font-size--2xs);
	line-height: 1.2;
	min-width: 0;
}

.separator {
	color: var(--resource-center--color--text--subtle, var(--color--text--tint-2));
}

.iconStack {
	display: flex;
	align-items: center;
	isolation: isolate;
	padding-right: var(--spacing--4xs);
	flex-shrink: 0;
}

.iconBubble,
.countBubble {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	position: relative;
	width: var(--spacing--md);
	height: var(--spacing--md);
	margin-right: calc(var(--spacing--xs) * -0.5);
	flex-shrink: 0;
	box-sizing: border-box;
}

.iconBubble {
	padding: var(--spacing--4xs);
	border-radius: 999px;
	background: var(--resource-center--color--background--icon-token);
	border: 0.5px solid var(--resource-center--border-color--icon-token);
	box-shadow: var(--resource-center--shadow--icon-token);
}

.countBubble {
	border-radius: 999px;
	background: var(--resource-center--color--background--count-bubble);
	color: var(--resource-center--color--text--count-bubble);
	font-size: var(--font-size--3xs);
	font-weight: 500;
	line-height: 1;
	border: 0.5px solid var(--resource-center--border-color--count-bubble);
}
</style>
