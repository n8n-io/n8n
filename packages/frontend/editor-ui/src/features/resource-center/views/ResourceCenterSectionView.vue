<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { N8nHeading, N8nIcon, N8nSelect, N8nOption } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { VIEWS } from '@/app/constants';
import VideoThumbCard from '../components/VideoThumbCard.vue';
import TemplatePreviewCard from '../components/TemplatePreviewCard.vue';
import {
	inspirationVideos,
	courses,
	learningVideos,
	templatePreviews,
	type YouTubeVideo,
	type TemplatePreview,
	type Course,
} from '../mockData';

const i18n = useI18n();
const router = useRouter();
const route = useRoute();

const sortBy = ref<'alphabetical' | 'newest'>('alphabetical');

const sectionKey = computed(() => route.params.section as string);

const sectionConfig = computed(() => {
	const configs: Record<string, { title: string; type: 'video' | 'template' }> = {
		templates: {
			title: i18n.baseText('resourceCenter.templatePreviews.title'),
			type: 'template',
		},
		courses: {
			title: i18n.baseText('resourceCenter.courses.title'),
			type: 'video',
		},
		'learning-videos': {
			title: i18n.baseText('resourceCenter.youtubeLearn.title'),
			type: 'video',
		},
		'inspiration-videos': {
			title: i18n.baseText('resourceCenter.youtubeInspiration.title'),
			type: 'video',
		},
	};
	return configs[sectionKey.value] || { title: 'Unknown Section', type: 'video' };
});

const sectionItems = computed(() => {
	let items: (YouTubeVideo | TemplatePreview | Course)[] = [];

	switch (sectionKey.value) {
		case 'templates':
			items = [...templatePreviews];
			break;
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
		case 'inspiration-videos':
			items = [...inspirationVideos];
			break;
	}

	// Sort items
	if (sortBy.value === 'alphabetical') {
		items.sort((a, b) => {
			const nameA = 'title' in a ? a.title : a.name;
			const nameB = 'title' in b ? b.title : b.name;
			return nameA.localeCompare(nameB);
		});
	}
	// For 'newest', keep original order (assuming it's already sorted by date)

	return items;
});

const goBack = () => {
	router.push({ name: VIEWS.RESOURCE_CENTER_V2 });
};
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.content">
			<!-- Breadcrumbs Header -->
			<header :class="$style.header">
				<div :class="$style.breadcrumbs">
					<span :class="$style.breadcrumbLink" @click="goBack">
						{{ i18n.baseText('resourceCenter.title') }}
					</span>
					<N8nIcon icon="chevron-right" size="small" :class="$style.breadcrumbSeparator" />
					<span :class="$style.breadcrumbCurrent">{{ sectionConfig.title }}</span>
				</div>
				<div :class="$style.sortControls">
					<N8nSelect v-model="sortBy" size="small" :class="$style.sortSelect">
						<N8nOption value="alphabetical" label="Alphabetical" />
						<N8nOption value="newest" label="Newest first" />
					</N8nSelect>
				</div>
			</header>

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
						v-for="item in sectionItems"
						:key="'videoId' in item ? item.videoId : item.id"
						:video="item as YouTubeVideo"
					/>
				</template>
				<template v-else>
					<TemplatePreviewCard
						v-for="item in sectionItems"
						:key="item.id"
						:template="item as TemplatePreview"
					/>
				</template>
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

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: var(--spacing--md);
	margin-bottom: var(--spacing--lg);
	padding: var(--spacing--xs) 0;
	border-bottom: 1px solid var(--border-color);
}

.breadcrumbs {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.breadcrumbLink {
	font-family: 'DM Sans', var(--font-family);
	font-size: var(--font-size--md);
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
	font-size: var(--font-size--md);
	color: var(--color--text);
	font-weight: 500;
}

.sortControls {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
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
	color: var(--color--text);
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
</style>
