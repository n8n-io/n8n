<script setup lang="ts">
import { computed } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import type { ResourceItem } from '../data/resourceCenterData';

type FeatureCardTone = 'rose' | 'amber';

const props = defineProps<{
	item: ResourceItem;
	tone: FeatureCardTone;
}>();

const emit = defineEmits<{
	click: [];
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
const uiStore = useUIStore();

const toneClass = computed(() => (props.tone === 'amber' ? 'toneAmber' : 'toneRose'));
const isDarkTheme = computed(() => uiStore.appliedTheme === 'dark');

const emitClick = () => emit('click');

const onCardKeyActivate = (event: KeyboardEvent) => {
	if (event.target !== event.currentTarget) {
		return;
	}

	emitClick();
};

const resolvedArtworkNodeTypes = computed(() => {
	if (!props.item.nodeTypes?.length) {
		return [];
	}

	const seenNodeNames = new Set<string>();

	return props.item.nodeTypes
		.map((type) => nodeTypesStore.getNodeType(type))
		.filter((nodeType): nodeType is NonNullable<typeof nodeType> => {
			if (nodeType === null || nodeType === undefined || seenNodeNames.has(nodeType.name)) {
				return false;
			}

			seenNodeNames.add(nodeType.name);
			return true;
		})
		.slice(0, 4);
});
</script>

<template>
	<article
		:class="[$style.card, $style[toneClass], { [$style.dark]: isDarkTheme }]"
		role="button"
		tabindex="0"
		data-testid="resource-feature-card"
		@click="emitClick"
		@keydown.enter.prevent="onCardKeyActivate"
		@keyup.space.prevent="onCardKeyActivate"
	>
		<div :class="$style.content">
			<div :class="$style.copy">
				<h2 :class="$style.title">
					{{ item.title }}
				</h2>
				<p :class="$style.subtitle">
					{{ i18n.baseText('templates.card.readyToRun') }}
				</p>
			</div>

			<button type="button" :class="$style.runButton" @click.stop="emitClick">
				<N8nIcon icon="play" size="xsmall" />
				{{ i18n.baseText('ndv.output.run') }}
			</button>
		</div>

		<div :class="$style.artwork" aria-hidden="true">
			<div
				v-for="(nodeType, index) in resolvedArtworkNodeTypes"
				:key="nodeType.name"
				:class="[$style.artTile, $style[`artTile${index + 1}`]]"
			>
				<div :class="$style.tileInner">
					<NodeIcon :node-type="nodeType" :size="index === 0 ? 64 : 58" />
				</div>
			</div>
		</div>
	</article>
</template>

<style lang="scss" module>
.card {
	--feature--color--accent: #e63b97;
	--feature--color--accent-soft: rgba(230, 59, 151, 0.16);
	--feature--color--background--surface: #fdf2f8;
	--feature--color--background--surface-strong: #fff8fb;
	--feature--color--foreground--dot: rgba(230, 59, 151, 0.16);
	--feature--shadow--accent: rgba(230, 59, 151, 0.26);
	position: relative;
	display: flex;
	align-items: stretch;
	min-height: 13.875rem;
	padding: var(--spacing--sm);
	overflow: hidden;
	border-radius: var(--radius--lg);
	border: 1px solid
		var(--feature--border-color--card, color-mix(in srgb, var(--feature--color--accent) 16%, white));
	background: radial-gradient(circle at 88% 12%, rgba(255, 255, 255, 0.92), transparent 18rem),
		linear-gradient(
			122deg,
			var(--feature--color--background--surface) 0%,
			var(--feature--color--background--surface-strong) 55%,
			#fff 100%
		);
	box-shadow: var(
		--feature--shadow--card,
		0 0 0 0.5px color-mix(in srgb, var(--feature--color--accent) 16%, transparent),
		0 1rem 2rem -1.5rem color-mix(in srgb, var(--feature--shadow--accent) 34%, transparent)
	);
	cursor: pointer;
	isolation: isolate;
	transition:
		transform 0.2s ease,
		box-shadow 0.2s ease;

	&::before {
		content: '';
		position: absolute;
		inset: 0;
		background-image: radial-gradient(
			var(--feature--color--foreground--dot) 0.0625rem,
			transparent 0.0625rem
		);
		background-size: 0.625rem 0.625rem;
		mask-image: linear-gradient(135deg, transparent 22%, black 52%, black 100%);
		opacity: 0.8;
		z-index: 0;
	}

	&::after {
		content: '';
		position: absolute;
		inset: auto auto -3.5rem -2.5rem;
		width: 12rem;
		height: 12rem;
		background: radial-gradient(
			circle,
			color-mix(in srgb, var(--feature--color--accent) 10%, transparent),
			transparent 68%
		);
		z-index: 0;
	}

	&:hover {
		transform: translateY(-1px);
		box-shadow:
			0 0 0 0.5px color-mix(in srgb, var(--feature--color--accent) 20%, transparent),
			0 1.25rem 2.5rem -1.75rem color-mix(in srgb, var(--feature--shadow--accent) 42%, transparent);
	}

	&:focus-visible {
		outline: 2px solid var(--feature--color--accent);
		outline-offset: 2px;
	}

	&.dark {
		--feature--border-color--card: rgba(255, 255, 255, 0.1);
		--feature--shadow--card: 0 0 0 0.5px
				color-mix(in srgb, var(--feature--color--accent) 28%, transparent),
			0 1px 3px -1px rgba(0, 0, 0, 0.18);
	}
}

.toneRose {
}

.toneAmber {
	--feature--color--accent: #ff6a1a;
	--feature--color--accent-soft: rgba(255, 106, 26, 0.14);
	--feature--color--background--surface: #fff3e9;
	--feature--color--background--surface-strong: #fff8f2;
	--feature--color--foreground--dot: rgba(255, 106, 26, 0.14);
	--feature--shadow--accent: rgba(255, 106, 26, 0.24);
}

.content {
	position: relative;
	z-index: 2;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	gap: var(--spacing--sm);
	width: min(48%, 15rem);
	min-width: 0;
}

.copy {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.title {
	margin: 0;
	max-width: 12rem;
	color: var(--feature--color--accent);
	font-size: var(--font-size--md);
	font-weight: 500;
	line-height: var(--line-height--md);
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
}

.subtitle {
	margin: 0;
	color: color-mix(in srgb, var(--feature--color--accent) 72%, white);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--md);
}

.runButton {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	align-self: flex-start;
	padding: var(--spacing--2xs) var(--spacing--sm);
	border: none;
	border-radius: var(--radius);
	background: var(--feature--color--accent);
	color: white;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	box-shadow: 0 0.75rem 1.5rem -1rem color-mix(in srgb, var(--feature--shadow--accent) 42%, transparent);
	cursor: pointer;
	transition:
		transform 0.18s ease,
		filter 0.18s ease;

	&:hover {
		filter: brightness(0.96);
		transform: translateY(-1px);
	}
}

.artwork {
	position: absolute;
	inset: 0;
	pointer-events: none;
	z-index: 1;
}

.artTile {
	position: absolute;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 1.125rem;
	background: rgba(255, 255, 255, 0.92);
	border: 1px solid rgba(17, 24, 39, 0.08);
	box-shadow:
		0 1.25rem 2rem -1.75rem rgba(17, 24, 39, 0.42),
		inset 0 0 0 1px rgba(255, 255, 255, 0.3);
	backdrop-filter: blur(0.375rem);
}

.tileInner {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
}

.artTile1 {
	right: 7.25rem;
	bottom: 2.5rem;
	width: 8.5rem;
	height: 8.5rem;
	transform: rotate(-8deg);
}

.artTile2 {
	right: 0.75rem;
	top: 2.25rem;
	width: 7.5rem;
	height: 7.5rem;
	transform: rotate(6deg);
}

.artTile3 {
	right: 3.75rem;
	bottom: -1.125rem;
	width: 7rem;
	height: 7rem;
	transform: rotate(3deg);
}

.artTile4 {
	right: -0.25rem;
	bottom: -0.625rem;
	width: 5.25rem;
	height: 5.25rem;
	transform: rotate(3deg);
}

@media (max-width: 900px) {
	.card {
		min-height: 12rem;
	}

	.content {
		width: min(54%, 15rem);
	}

	.artTile1 {
		right: 6rem;
		width: 7rem;
		height: 7rem;
	}

	.artTile2 {
		right: 0.75rem;
		width: 6.5rem;
		height: 6.5rem;
	}

	.artTile3 {
		right: 3rem;
		width: 6rem;
		height: 6rem;
	}

	.artTile4 {
		width: 4.5rem;
		height: 4.5rem;
	}
}

@media (max-width: 560px) {
	.card {
		min-height: 11.25rem;
	}

	.content {
		width: min(62%, 14rem);
	}
}
</style>
