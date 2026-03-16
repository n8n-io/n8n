<script setup lang="ts">
import { N8nHeading, N8nSpinner } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { ITemplatesWorkflowFull } from '@n8n/rest-api-client';
import { onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import ResourceCard from '../components/ResourceCard.vue';
import type { CardVariant } from '../components/ResourceCard.vue';
import {
	featuredTemplateIds,
	inspirationVideos,
	learningVideos,
	masterclassVideos,
	learnTemplateIds,
} from '../data/resourceCenterData';
import type { ResourceItem } from '../data/resourceCenterData';
import { quickStartWorkflows } from '../data/quickStartWorkflows';
import { useResourceCenterStore } from '../stores/resourceCenter.store';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';

const VARIANT_STORAGE_KEY = 'n8n-resourceCenter-cardVariant';
const CARD_VARIANTS: { value: CardVariant; label: string }[] = [
	{ value: 'header', label: 'A: Header Strip' },
	{ value: 'accent', label: 'B: Accent Border' },
	{ value: 'spotlight', label: 'C: Spotlight' },
];

const cardVariant = ref<CardVariant>(
	(localStorage.getItem(VARIANT_STORAGE_KEY) as CardVariant) || 'header',
);

const setVariant = (v: CardVariant) => {
	cardVariant.value = v;
	localStorage.setItem(VARIANT_STORAGE_KEY, v);
};

const i18n = useI18n();
const router = useRouter();
const resourceCenterStore = useResourceCenterStore();

const featuredTemplates = ref<ITemplatesWorkflowFull[]>([]);
const learnTemplates = ref<ITemplatesWorkflowFull[]>([]);
const isLoading = ref(false);

// Build section items

const getStartedItems = computed<ResourceItem[]>(() =>
	quickStartWorkflows.map((w) => ({
		id: w.id,
		type: 'ready-to-run' as const,
		title: w.name,
		description: w.description,
		quickStartId: w.id,
		nodeTypes: w.nodeTypes,
		nodeCount: w.nodeCount,
	})),
);

const getInspiredItems = computed<ResourceItem[]>(() => {
	const videos: ResourceItem[] = inspirationVideos.map((v) => ({
		id: v.videoId,
		type: 'video' as const,
		title: v.title,
		description: v.description,
		videoId: v.videoId,
		duration: v.duration,
	}));

	const templates: ResourceItem[] = featuredTemplates.value.map((t) => ({
		id: t.id,
		type: 'template' as const,
		title: t.name,
		description: t.description ?? '',
		templateId: t.id,
		nodeTypes: [...new Set((t.nodes ?? []).map((n) => n.name))].slice(0, 4),
		nodeCount: t.nodes?.length,
		setupTime: t.nodes ? `${Math.max(5, Math.ceil((t.nodes.length / 3) * 5))} min` : undefined,
	}));

	// Interleave: template, video, template, video... (by rank order from spec)
	const result: ResourceItem[] = [];
	let ti = 0;
	let vi = 0;
	while (ti < templates.length || vi < videos.length) {
		if (ti < templates.length) result.push(templates[ti++]);
		if (vi < videos.length) result.push(videos[vi++]);
	}
	return result;
});

const learnItems = computed<ResourceItem[]>(() => {
	const tutorials: ResourceItem[] = learningVideos.map((v) => ({
		id: v.videoId,
		type: 'video' as const,
		title: v.title,
		description: v.description,
		videoId: v.videoId,
		duration: v.duration,
		level: v.level,
	}));

	const masterclasses: ResourceItem[] = masterclassVideos.map((v) => ({
		id: v.videoId,
		type: 'video' as const,
		title: v.title,
		description: v.description,
		videoId: v.videoId,
		duration: v.duration,
		level: v.level,
	}));

	const templates: ResourceItem[] = learnTemplates.value.map((t) => ({
		id: t.id,
		type: 'template' as const,
		title: t.name,
		description: t.description ?? '',
		templateId: t.id,
		nodeTypes: [...new Set((t.nodes ?? []).map((n) => n.name))].slice(0, 4),
		nodeCount: t.nodes?.length,
		setupTime: t.nodes ? `${Math.max(5, Math.ceil((t.nodes.length / 3) * 5))} min` : undefined,
	}));

	const courses: ResourceItem[] = [
		{
			id: 'beginner-course',
			type: 'video' as const,
			title: 'n8n Beginner Course',
			description:
				'Official video course covering workflows, APIs, webhooks, nodes, error handling, and debugging.',
			url: 'https://docs.n8n.io/video-courses/',
			duration: '3 hours',
			level: 'Masterclass',
		},
		{
			id: 'advanced-course',
			type: 'video' as const,
			title: 'n8n Advanced Course',
			description:
				'Master complex data flows, advanced nodes, sub-workflows, error workflows, and enterprise features.',
			url: 'https://docs.n8n.io/video-courses/',
			duration: '4 hours',
			level: 'Masterclass',
		},
	];

	return [...templates, ...tutorials, ...masterclasses, ...courses];
});

// Click handlers
const handleCardClick = (item: ResourceItem) => {
	if (item.type === 'ready-to-run' && item.quickStartId) {
		resourceCenterStore.trackTileClick('quick-start', 'ready-to-run', item.quickStartId);
		void resourceCenterStore.createAndOpenQuickStartWorkflow(item.quickStartId);
	} else if (item.type === 'video') {
		const section = getInspiredItems.value.includes(item) ? 'inspiration' : 'learn';
		resourceCenterStore.trackTileClick(section, 'video', item.id);
		const url = item.url ?? `https://www.youtube.com/watch?v=${item.videoId}`;
		window.open(url, '_blank', 'noopener,noreferrer');
	} else if (item.type === 'template' && item.templateId) {
		const section = getInspiredItems.value.includes(item) ? 'inspiration' : 'learn';
		resourceCenterStore.trackTileClick(section, 'template', item.templateId);
		void router.push(resourceCenterStore.getTemplateRoute(item.templateId));
	}
};

// Load data
const loadAllTemplates = async () => {
	isLoading.value = true;
	try {
		const [featured, learn] = await Promise.all([
			resourceCenterStore.loadTemplates(featuredTemplateIds),
			resourceCenterStore.loadTemplates(learnTemplateIds),
		]);
		featuredTemplates.value = featured;
		learnTemplates.value = learn;
	} finally {
		isLoading.value = false;
	}
};

// GRO-246 fix: set browser tab title
const documentTitle = useDocumentTitle();

onMounted(() => {
	documentTitle.set('Resource Center');
	resourceCenterStore.trackResourceCenterView();
	void loadAllTemplates();
});
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.content">
			<div :class="$style.topBar">
				<N8nHeading tag="h1" :bold="true" :class="$style.pageTitle">
					{{ i18n.baseText('experiments.resourceCenter.title') }}
				</N8nHeading>
				<div :class="$style.variantSwitcher">
					<button
						v-for="v in CARD_VARIANTS"
						:key="v.value"
						:class="[$style.variantBtn, { [$style.variantBtnActive]: cardVariant === v.value }]"
						@click="setVariant(v.value)"
					>
						{{ v.label }}
					</button>
				</div>
			</div>

			<!-- Get Started -->
			<section :class="$style.section">
				<h2 :class="$style.sectionTitle">
					{{ i18n.baseText('experiments.resourceCenter.getStarted.title') }}
				</h2>
				<div :class="$style.grid">
					<ResourceCard
						v-for="item in getStartedItems"
						:key="item.id"
						:item="item"
						:variant="cardVariant"
						@click="handleCardClick(item)"
					/>
				</div>
			</section>

			<!-- Get Inspired -->
			<section :class="$style.section">
				<h2 :class="$style.sectionTitle">
					{{ i18n.baseText('experiments.resourceCenter.getInspired.title') }}
				</h2>
				<div v-if="isLoading" :class="$style.loading">
					<N8nSpinner size="small" />
				</div>
				<div v-else :class="$style.grid">
					<ResourceCard
						v-for="item in getInspiredItems"
						:key="item.id"
						:item="item"
						:variant="cardVariant"
						@click="handleCardClick(item)"
					/>
				</div>
			</section>

			<!-- Learn to use n8n -->
			<section :class="$style.section">
				<h2 :class="$style.sectionTitle">
					{{ i18n.baseText('experiments.resourceCenter.learnN8n.title') }}
				</h2>
				<div v-if="isLoading" :class="$style.loading">
					<N8nSpinner size="small" />
				</div>
				<div v-else :class="$style.grid">
					<ResourceCard
						v-for="item in learnItems"
						:key="item.id"
						:item="item"
						:variant="cardVariant"
						@click="handleCardClick(item)"
					/>
				</div>
			</section>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: block;
	width: 100%;
	max-width: var(--content-container--width);
}

.content {
	width: 100%;
	padding: 0 var(--spacing--2xl) var(--spacing--lg) var(--spacing--2xl);
}

.topBar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: var(--spacing--xl);
}

.pageTitle {
	font-size: var(--font-size--sm);
	color: var(--color--text--shade-1);
	margin: 0;
}

.variantSwitcher {
	display: flex;
	gap: 2px;
	background: var(--color--foreground);
	border-radius: var(--radius--lg);
	padding: 2px;
}

.variantBtn {
	padding: var(--spacing--4xs) var(--spacing--xs);
	border: none;
	border-radius: var(--radius);
	background: transparent;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--regular);
	cursor: pointer;
	transition:
		background 0.15s ease,
		color 0.15s ease;
	white-space: nowrap;

	&:hover {
		color: var(--color--text);
	}
}

.variantBtnActive {
	background: var(--color--foreground--tint-2);
	color: var(--color--text--shade-1);
	font-weight: var(--font-weight--bold);
}

.section {
	margin-bottom: var(--spacing--3xl);

	&:last-child {
		margin-bottom: 0;
	}
}

.sectionTitle {
	font-size: var(--font-size--2xl);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
	margin: 0 0 var(--spacing--lg) 0;
}

.grid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: var(--spacing--sm);

	@media (max-width: 900px) {
		grid-template-columns: repeat(2, 1fr);
	}

	@media (max-width: 600px) {
		grid-template-columns: 1fr;
	}
}

.loading {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--lg);
}
</style>
