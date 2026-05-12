<script setup lang="ts">
import { N8nIcon, N8nSpinner } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { ITemplatesWorkflowFull } from '@n8n/rest-api-client';
import uniqBy from 'lodash/uniqBy';
import { computed, onMounted, ref } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { useRouter } from 'vue-router';
import ResourceCard from '../components/ResourceCard.vue';
import ResourceFeatureCard from '../components/ResourceFeatureCard.vue';
import {
	featuredTemplateIds,
	getInspiredContent,
	learnTemplateIds,
	learnContent,
	type OrderedSectionResource,
	type ResourceItem,
} from '../data/resourceCenterData';
import { quickStartWorkflows } from '../data/quickStartWorkflows';
import { useUIStore } from '@/app/stores/ui.store';
import { useResourceCenterStore } from '../stores/resourceCenter.store';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { DEBOUNCE_TIME, getDebounceTime } from '@/app/constants/durations';
import { filterTemplateNodes } from '@/app/utils/nodeTypesUtils';

const READY_TO_RUN_ARTWORK_EXCLUDED_TYPES = new Set([
	'n8n-nodes-base.stickyNote',
	'n8n-nodes-base.manualTrigger',
	'n8n-nodes-base.set',
	'@n8n/n8n-nodes-langchain.memoryBufferWindow',
]);
const DEPRIORITIZED_TEMPLATE_CARD_NODE_PREFIXES = ['@n8n/n8n-nodes-langchain.'];

const i18n = useI18n();
const router = useRouter();
const uiStore = useUIStore();
const resourceCenterStore = useResourceCenterStore();

const featuredTemplates = ref<ITemplatesWorkflowFull[]>([]);
const learnTemplates = ref<ITemplatesWorkflowFull[]>([]);
const isLoading = ref(false);
type ResourceSection = Exclude<ResourceItem['section'], undefined>;

const searchQuery = ref('');
const debouncedSearch = ref('');

const searchPlaceholder = computed(() =>
	i18n.baseText('experiments.resourceCenter.search.placeholder'),
);
const isDarkTheme = computed(() => uiStore.appliedTheme === 'dark');

const onSearchInput = useDebounceFn((value: string) => {
	debouncedSearch.value = value;
}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));

const handleSearchInput = (event: Event) => {
	if (!(event.target instanceof HTMLInputElement)) {
		return;
	}

	searchQuery.value = event.target.value;
	void onSearchInput(event.target.value);
};

const matchesSearch = (item: ResourceItem): boolean => {
	if (!debouncedSearch.value) {
		return true;
	}

	return item.title.toLowerCase().includes(debouncedSearch.value.toLowerCase());
};

const filterItems = (items: ResourceItem[]): ResourceItem[] => items.filter(matchesSearch);

const getTemplateCardNodeTypes = (template: ITemplatesWorkflowFull): string[] => {
	const filteredNodes = filterTemplateNodes(template.nodes ?? []);
	const preferredNodes = filteredNodes.filter(
		(node) =>
			!DEPRIORITIZED_TEMPLATE_CARD_NODE_PREFIXES.some((prefix) => node.name.startsWith(prefix)),
	);
	const fallbackNodes = filteredNodes.filter((node) =>
		DEPRIORITIZED_TEMPLATE_CARD_NODE_PREFIXES.some((prefix) => node.name.startsWith(prefix)),
	);

	return uniqBy([...preferredNodes, ...fallbackNodes], (node) => node.icon)
		.map((node) => node.name)
		.filter((nodeName) => nodeName !== '');
};

const buildTemplateResourceItem = (
	template: ITemplatesWorkflowFull,
	section: ResourceSection,
	title: string,
): ResourceItem => {
	const nodeCount = template.workflowInfo.nodeCount;

	return {
		id: template.id,
		type: 'template' as const,
		title,
		description: template.description ?? '',
		section,
		templateId: template.id,
		nodeTypes: getTemplateCardNodeTypes(template),
		nodeCount,
		setupTime: `${Math.max(5, Math.ceil((nodeCount / 3) * 5))} min`,
	};
};

const buildOrderedSectionItems = (
	content: OrderedSectionResource[],
	templatesById: Map<number, ITemplatesWorkflowFull>,
	section: ResourceSection,
): ResourceItem[] =>
	content.flatMap((entry) => {
		if (entry.type === 'video') {
			return [
				{
					id: entry.videoId,
					type: 'video' as const,
					title: entry.title,
					description: entry.description,
					section,
					videoId: entry.videoId,
					url: entry.url,
					duration: entry.duration,
					level: entry.level,
				},
			];
		}

		const template = templatesById.get(entry.templateId);
		return template ? [buildTemplateResourceItem(template, section, entry.title)] : [];
	});

const featuredTemplatesById = computed(
	() => new Map(featuredTemplates.value.map((template) => [template.id, template] as const)),
);
const learnTemplatesById = computed(
	() => new Map(learnTemplates.value.map((template) => [template.id, template] as const)),
);

const getStartedItems = computed<ResourceItem[]>(() =>
	quickStartWorkflows.map((workflow) => ({
		id: workflow.id,
		type: 'ready-to-run' as const,
		title: workflow.name,
		description: workflow.description,
		section: 'quick-start' as const,
		quickStartId: workflow.id,
		nodeTypes: [
			...new Set(workflow.workflow.nodes?.map((node) => node.type) ?? workflow.nodeTypes),
		].filter((nodeType) => !READY_TO_RUN_ARTWORK_EXCLUDED_TYPES.has(nodeType)),
		nodeCount: workflow.nodeCount,
	})),
);

const getInspiredItems = computed<ResourceItem[]>(() =>
	buildOrderedSectionItems(getInspiredContent, featuredTemplatesById.value, 'inspiration'),
);

const learnItems = computed<ResourceItem[]>(() =>
	buildOrderedSectionItems(learnContent, learnTemplatesById.value, 'learn'),
);

const filteredGetStarted = computed(() => filterItems(getStartedItems.value));
const filteredGetInspired = computed(() => filterItems(getInspiredItems.value));
const filteredLearn = computed(() => filterItems(learnItems.value));

const hasResults = computed(
	() =>
		filteredGetStarted.value.length > 0 ||
		filteredGetInspired.value.length > 0 ||
		filteredLearn.value.length > 0,
);

const isSearching = computed(() => debouncedSearch.value !== '');

const handleCardClick = (item: ResourceItem) => {
	if (item.type === 'ready-to-run' && item.quickStartId) {
		resourceCenterStore.trackTileClick('quick-start', 'ready-to-run', item.quickStartId);
		void resourceCenterStore.createAndOpenQuickStartWorkflow(item.quickStartId);
		return;
	}

	if (item.type === 'video') {
		const section = item.section ?? 'learn';
		resourceCenterStore.trackTileClick(section, 'video', item.id);
		const url = item.url ?? `https://www.youtube.com/watch?v=${item.videoId}`;
		window.open(url, '_blank', 'noopener,noreferrer');
		return;
	}

	if (item.type === 'template' && item.templateId) {
		const section = item.section ?? 'learn';
		resourceCenterStore.trackTileClick(section, 'template', item.templateId);
		void router.push(resourceCenterStore.getTemplateRoute(item.templateId));
	}
};

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

const documentTitle = useDocumentTitle();

onMounted(() => {
	documentTitle.set('Resource Center');
	resourceCenterStore.trackResourceCenterView();
	void loadAllTemplates();
});
</script>

<template>
	<div :class="[$style.container, { [$style.dark]: isDarkTheme }]">
		<div :class="$style.content">
			<header :class="$style.header">
				<h1 :class="$style.pageTitle">
					{{ i18n.baseText('experiments.resourceCenter.title') }}
				</h1>

				<label :class="$style.searchInput">
					<N8nIcon icon="search" size="small" :class="$style.searchIcon" />
					<input
						type="text"
						:value="searchQuery"
						:placeholder="searchPlaceholder"
						:class="$style.searchField"
						data-testid="resource-center-search"
						@input="handleSearchInput"
					/>
				</label>
			</header>

			<div v-if="!isLoading && isSearching && !hasResults" :class="$style.noResults">
				{{ i18n.baseText('experiments.resourceCenter.search.noResults') }}
			</div>

			<template v-else>
				<div v-if="filteredGetStarted.length > 0" :class="$style.heroGrid">
					<ResourceFeatureCard
						v-for="(item, index) in filteredGetStarted"
						:key="item.id"
						:item="item"
						:tone="index % 2 === 0 ? 'rose' : 'amber'"
						@click="handleCardClick(item)"
					/>
				</div>

				<section v-if="filteredGetInspired.length > 0" :class="$style.section">
					<h2 :class="$style.sectionTitle">
						{{ i18n.baseText('experiments.resourceCenter.getInspired.title') }}
					</h2>
					<div v-if="isLoading" :class="$style.loading">
						<N8nSpinner size="small" />
					</div>
					<div v-else :class="$style.grid">
						<ResourceCard
							v-for="item in filteredGetInspired"
							:key="item.id"
							:item="item"
							@click="handleCardClick(item)"
						/>
					</div>
				</section>

				<section v-if="filteredLearn.length > 0" :class="$style.section">
					<h2 :class="$style.sectionTitle">
						{{ i18n.baseText('workflows.empty.learnN8n') }}
					</h2>
					<div v-if="isLoading" :class="$style.loading">
						<N8nSpinner size="small" />
					</div>
					<div v-else :class="$style.grid">
						<ResourceCard
							v-for="item in filteredLearn"
							:key="item.id"
							:item="item"
							@click="handleCardClick(item)"
						/>
					</div>
				</section>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	--resource-center--color--background--page: white;
	--resource-center--color--text: var(--color--text--shade-1);
	--resource-center--color--text--muted: var(--color--text--tint-1);
	--resource-center--color--text--subtle: var(--color--text--tint-2);
	--resource-center--color--background--search: white;
	--resource-center--border-color--search: color-mix(
		in srgb,
		var(--color--foreground--shade-1) 18%,
		transparent
	);
	--resource-center--icon-color--search: var(--color--text--tint-1);
	--resource-center--color--text--placeholder: var(--color--text--tint-1);
	--resource-center--shadow--search: 0 1px 2px -1px color-mix(in srgb, var(--color--text--shade-1)
				10%, transparent);
	--resource-center--color--background--card: white;
	--resource-center--border-color--card: rgba(0, 0, 0, 0.1);
	--resource-center--shadow--card: 0 0 0 0.5px rgba(0, 0, 0, 0.1), 0 1px 3px -1px rgba(0, 0, 0, 0.1);
	--resource-center--color--background--card-tag: color-mix(
		in srgb,
		var(--color--foreground--tint-2) 9%,
		var(--color--background)
	);
	--resource-center--border-color--card-tag: color-mix(
		in srgb,
		var(--color--foreground--shade-1) 10%,
		transparent
	);
	--resource-center--color--text--card-tag: var(--color--text--shade-1);
	--resource-center--color--background--icon-token: #ebebeb;
	--resource-center--border-color--icon-token: white;
	--resource-center--shadow--icon-token: 0 0 0 0.5px rgba(0, 0, 0, 0.04),
		0 1px 2px rgba(0, 0, 0, 0.04);
	--resource-center--color--background--count-bubble: #e0e0e0;
	--resource-center--border-color--count-bubble: rgba(0, 0, 0, 0.04);
	--resource-center--color--text--count-bubble: #444;
	display: block;
	width: 100%;
	min-height: 100%;
	background: var(--resource-center--color--background--page);

	&.dark {
		--resource-center--color--background--page: #171717;
		--resource-center--color--text: white;
		--resource-center--color--text--muted: #ccc;
		--resource-center--color--text--subtle: #999;
		--resource-center--color--background--search: #171717;
		--resource-center--border-color--search: rgba(255, 255, 255, 0.1);
		--resource-center--icon-color--search: #999;
		--resource-center--color--text--placeholder: #999;
		--resource-center--shadow--search: none;
		--resource-center--color--background--card: #262626;
		--resource-center--border-color--card: rgba(255, 255, 255, 0.1);
		--resource-center--shadow--card: 0 0 0 0.5px rgba(0, 0, 0, 0.1),
			0 1px 3px -1px rgba(0, 0, 0, 0.1);
		--resource-center--color--background--card-tag: rgba(255, 255, 255, 0.06);
		--resource-center--border-color--card-tag: rgba(255, 255, 255, 0.08);
		--resource-center--color--text--card-tag: #f5f5f5;
		--resource-center--color--background--icon-token: #171717;
		--resource-center--border-color--icon-token: #171717;
		--resource-center--shadow--icon-token: none;
		--resource-center--color--background--count-bubble: #3d3d3d;
		--resource-center--border-color--count-bubble: #171717;
		--resource-center--color--text--count-bubble: #d9d9d9;
	}
}

.content {
	width: 100%;
	max-width: 70rem;
	margin: 0 auto;
	padding: var(--spacing--xl) var(--spacing--2xl) var(--spacing--3xl);
	box-sizing: border-box;
	background: var(--resource-center--color--background--page);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--lg);
	margin-bottom: var(--spacing--xl);
}

.pageTitle {
	margin: 0;
	color: var(--resource-center--color--text);
	font-size: var(--font-size--xl);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--lg);
}

.searchInput {
	position: relative;
	width: 23.3125rem;
	flex: 0 0 23.3125rem;
	max-width: 100%;
}

.searchIcon {
	position: absolute;
	left: var(--spacing--sm);
	top: 50%;
	transform: translateY(-50%);
	color: var(--resource-center--icon-color--search);
	pointer-events: none;
}

.searchField {
	width: 100%;
	height: 2.5rem;
	padding: 0 var(--spacing--sm) 0 2.375rem;
	border-radius: var(--radius--lg);
	border: 1px solid var(--resource-center--border-color--search);
	background: var(--resource-center--color--background--search);
	color: var(--resource-center--color--text);
	font-size: var(--font-size--sm);
	font-family: var(--font-family);
	outline: none;
	box-shadow: var(--resource-center--shadow--search);
	transition:
		border-color 0.18s ease,
		box-shadow 0.18s ease;

	&::placeholder {
		color: var(--resource-center--color--text--placeholder);
	}

	&:focus {
		border-color: color-mix(in srgb, var(--color--primary) 36%, transparent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color--primary) 12%, transparent);
	}
}

.heroGrid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: var(--spacing--sm);
	margin-bottom: var(--spacing--2xl);
}

.section {
	margin-bottom: var(--spacing--2xl);

	&:last-child {
		margin-bottom: 0;
	}
}

.sectionTitle {
	margin: 0 0 var(--spacing--sm);
	color: var(--resource-center--color--text);
	font-size: var(--font-size--sm);
	font-weight: 500;
	line-height: var(--line-height--lg);
	text-transform: lowercase;

	&::first-letter {
		text-transform: uppercase;
	}
}

.grid {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: var(--spacing--sm);
}

.loading {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 9rem;
}

.noResults {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 12rem;
	padding: var(--spacing--xl);
	color: var(--resource-center--color--text--muted);
	font-size: var(--font-size--sm);
	text-align: center;
}

@media (max-width: 1080px) {
	.grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
}

@media (max-width: 900px) {
	.content {
		padding: var(--spacing--lg) var(--spacing--lg) var(--spacing--2xl);
	}

	.header {
		flex-direction: column;
		align-items: stretch;
	}

	.searchInput {
		flex-basis: auto;
		width: 100%;
	}

	.heroGrid {
		grid-template-columns: 1fr;
	}

	.grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

@media (max-width: 560px) {
	.content {
		padding: var(--spacing--md) var(--spacing--sm) var(--spacing--xl);
	}

	.grid {
		grid-template-columns: 1fr;
	}
}
</style>
