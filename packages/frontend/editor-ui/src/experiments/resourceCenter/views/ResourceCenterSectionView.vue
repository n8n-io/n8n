<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { N8nHeading, N8nIcon, N8nSelect, N8nOption, N8nSpinner } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { ITemplatesWorkflowFull } from '@n8n/rest-api-client';
import { VIEWS } from '@/app/constants';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import ResourceCenterHeader from '../components/ResourceCenterHeader.vue';
import TemplateCard from '../components/TemplateCard.vue';
import VideoThumbCard from '../components/VideoThumbCard.vue';
import {
	inspirationVideos,
	courses,
	learningVideos,
	masterclassVideos,
	featuredTemplateIds,
	type YouTubeVideo,
} from '../data/resourceCenterData';
import { useResourceCenterStore } from '../stores/resourceCenter.store';

const i18n = useI18n();
const router = useRouter();
const route = useRoute();
const resourceCenterStore = useResourceCenterStore();
const templatesStore = useTemplatesStore();

const sortBy = ref<'alphabetical' | 'newest'>('alphabetical');
const templates = ref<ITemplatesWorkflowFull[]>([]);
const isLoadingTemplates = ref(false);

const sectionKey = computed(() => {
	const id = route.params.sectionId;
	return Array.isArray(id) ? (id[0] ?? '') : (id ?? '');
});

const sectionConfig = computed(() => {
	const configs: Record<string, { title: string; type: 'video' | 'template' }> = {
		templates: {
			title: i18n.baseText('experiments.resourceCenter.popularTemplates.title'),
			type: 'template',
		},
		courses: {
			title: i18n.baseText('experiments.resourceCenter.courses.title'),
			type: 'video',
		},
		'learning-videos': {
			title: i18n.baseText('experiments.resourceCenter.youtubeLearn.title'),
			type: 'video',
		},
		'masterclass-videos': {
			title: i18n.baseText('experiments.resourceCenter.masterclass.title'),
			type: 'video',
		},
		'inspiration-videos': {
			title: i18n.baseText('experiments.resourceCenter.youtubeInspiration.title'),
			type: 'video',
		},
	};
	return configs[sectionKey.value] || { title: 'Unknown Section', type: 'video' };
});

const videoItems = computed(() => {
	let items: YouTubeVideo[] = [];

	switch (sectionKey.value) {
		case 'courses':
			items = courses.map((c) => ({
				videoId: c.id,
				title: c.title,
				description: c.description,
				thumbnailUrl: c.thumbnailUrl,
			}));
			break;
		case 'learning-videos':
			items = [...learningVideos];
			break;
		case 'masterclass-videos':
			items = [...masterclassVideos];
			break;
		case 'inspiration-videos':
			items = [...inspirationVideos];
			break;
	}

	// Sort items
	if (sortBy.value === 'alphabetical') {
		items.sort((a, b) => a.title.localeCompare(b.title));
	}
	// For 'newest', keep original order (assuming it's already sorted by date)

	return items;
});

const sortedTemplates = computed(() => {
	if (sortBy.value === 'alphabetical') {
		return [...templates.value].sort((a, b) => a.name.localeCompare(b.name));
	}
	return templates.value;
});

const loadTemplates = async () => {
	if (sectionKey.value !== 'templates' || featuredTemplateIds.length === 0) return;

	isLoadingTemplates.value = true;
	try {
		templates.value = await resourceCenterStore.loadTemplates(featuredTemplateIds);
	} finally {
		isLoadingTemplates.value = false;
	}
};

const goBack = async () => {
	await router.push({ name: VIEWS.RESOURCE_CENTER });
};

const handleViewAllTemplates = () => {
	resourceCenterStore.trackTemplateRepoVisit();
	window.open(templatesStore.websiteTemplateRepositoryURL, '_blank', 'noopener,noreferrer');
};

// Map section keys to tracking section values
const getSectionForTracking = (key: string): 'inspiration' | 'learn' => {
	if (key === 'templates' || key === 'inspiration-videos') {
		return 'inspiration';
	}
	return 'learn';
};

onMounted(() => {
	// Reset scroll
	setTimeout(() => {
		const content = document.getElementById('content');
		const contentWrapper = content?.querySelector(':scope > div');
		contentWrapper?.scrollTo({ top: 0, behavior: 'auto' });
	}, 50);

	resourceCenterStore.trackSectionView(sectionConfig.value.title);
	void loadTemplates();
});
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.content">
			<!-- Breadcrumbs Header -->
			<ResourceCenterHeader>
				<span :class="$style.breadcrumbLink" @click="goBack">
					{{ i18n.baseText('experiments.resourceCenter.title') }}
				</span>
				<N8nIcon icon="chevron-right" size="small" :class="$style.breadcrumbSeparator" />
				<span :class="$style.breadcrumbCurrent">{{ sectionConfig.title }}</span>
				<template #actions>
					<N8nSelect v-model="sortBy" size="small" :class="$style.sortSelect">
						<N8nOption value="alphabetical" label="Alphabetical" />
						<N8nOption value="newest" label="Newest first" />
					</N8nSelect>
				</template>
			</ResourceCenterHeader>

			<!-- Section Title -->
			<div :class="$style.sectionHeader">
				<N8nHeading tag="h1" size="xlarge" :class="$style.sectionTitle">
					{{ sectionConfig.title }}
				</N8nHeading>
			</div>

			<!-- Items Grid -->
			<div :class="$style.grid">
				<template v-if="sectionConfig.type === 'video'">
					<VideoThumbCard
						v-for="item in videoItems"
						:key="item.videoId"
						:video="item"
						:section="getSectionForTracking(sectionKey)"
					/>
				</template>
				<template v-else>
					<template v-if="isLoadingTemplates">
						<div :class="$style.loading">
							<N8nSpinner size="small" />
						</div>
					</template>
					<template v-else>
						<TemplateCard
							v-for="template in sortedTemplates"
							:key="template.id"
							:template="template"
							:section="getSectionForTracking(sectionKey)"
						/>
					</template>
				</template>
			</div>

			<!-- View All Templates Link (for templates section only) -->
			<div v-if="sectionKey === 'templates'" :class="$style.viewAllLink">
				<a @click="handleViewAllTemplates">
					{{ i18n.baseText('experiments.resourceCenter.viewAllTemplates') }}
					<N8nIcon icon="external-link" size="small" />
				</a>
			</div>
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

.breadcrumbLink {
	font-family: 'DM Sans', var(--font-family);
	font-size: var(--font-size--sm);
	color: var(--color--primary);
	cursor: pointer;
	transition: color 0.2s ease;

	&:hover {
		color: var(--color--primary--shade-1);
		text-decoration: underline;
	}
}

.breadcrumbSeparator {
	color: var(--color--text--tint-1);
}

.breadcrumbCurrent {
	font-family: 'DM Sans', var(--font-family);
	font-size: var(--font-size--sm);
	color: var(--color--text--shade-1);
	font-weight: 500;
}

.sortSelect {
	min-width: 150px;
}

.sectionHeader {
	margin-bottom: var(--spacing--xl);
}

.sectionTitle {
	font-size: var(--font-size--2xl);
	font-weight: var(--font-weight--bold);
	letter-spacing: -0.01em;
	color: var(--color--text--shade-1);
	margin: 0;
}

.grid {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: var(--spacing--lg);

	@media (max-width: 1400px) {
		grid-template-columns: repeat(3, 1fr);
	}

	@media (max-width: 1000px) {
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
	grid-column: 1 / -1;
}

.viewAllLink {
	margin-top: var(--spacing--xl);
	text-align: center;

	a {
		color: var(--color--primary);
		cursor: pointer;
		font-size: var(--font-size--sm);
		display: inline-flex;
		align-items: center;
		gap: var(--spacing--4xs);

		&:hover {
			text-decoration: underline;
		}
	}
}
</style>
