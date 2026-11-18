<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useDebounceFn } from '@vueuse/core';
import type { DocPageSummary } from '@n8n/api-types';
import { N8nIcon, N8nInput, N8nLoading, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { DEBOUNCE_TIME } from '@/app/constants';
import type { CommandBarItem, CommandGroup } from '@/features/shared/commandBar/types';
import { useWorkflowNavigationCommands } from '@/features/shared/commandBar/composables/useWorkflowNavigationCommands';
import { useAgentNavigationCommands } from '@/features/shared/commandBar/composables/useAgentNavigationCommands';
import { useCredentialNavigationCommands } from '@/features/shared/commandBar/composables/useCredentialNavigationCommands';
import { useDataTableNavigationCommands } from '@/features/shared/commandBar/composables/useDataTableNavigationCommands';
import { useProjectNavigationCommands } from '@/features/shared/commandBar/composables/useProjectNavigationCommands';

import DocKindBadge from './DocKindBadge.vue';
import { DOC_PAGE_VIEW } from '../constants';
import { useDocPagesStore } from '../docPages.store';
import { useOpenDocPage } from '../composables/useOpenDocPage';

const MIN_QUERY_LENGTH = 2;
const RESULTS_PER_SOURCE = 5;

const query = defineModel<string>('query', { default: '' });

const i18n = useI18n();
const router = useRouter();
const docPagesStore = useDocPagesStore();
const { openDocPage } = useOpenDocPage();

// The command bar sources need a project name only for their "create" commands, which we do not show.
const currentProjectName = computed(() => '');
const commandGroups: CommandGroup[] = [
	useWorkflowNavigationCommands({ currentProjectName }),
	useAgentNavigationCommands({ currentProjectName }),
	useCredentialNavigationCommands({ currentProjectName }),
	useDataTableNavigationCommands({ currentProjectName }),
	useProjectNavigationCommands(),
];

const loading = ref(false);
const pages = ref<DocPageSummary[]>([]);
const sections = ref<Array<{ id: string; title: string; items: CommandBarItem[] }>>([]);
let requestId = 0;

const isActive = computed(() => query.value.trim().length >= MIN_QUERY_LENGTH);
const hasResults = computed(
	() => pages.value.length > 0 || sections.value.some((s) => s.items.length > 0),
);

async function runSearch(q: string) {
	const id = ++requestId;
	const sources = commandGroups
		.map((group) => group.source)
		.filter((source) => source?.isAvailable())
		.flatMap((source) => (source ? [source] : []));

	// Allow each source to fail alone, so one broken source does not hide the others.
	const [pageResult, ...sourceResults] = await Promise.allSettled([
		docPagesStore.search(q),
		...sources.map(
			async (source) => await source.search({ query: q, offset: 0, limit: RESULTS_PER_SOURCE }),
		),
	]);
	if (id !== requestId) return;

	pages.value = pageResult.status === 'fulfilled' ? pageResult.value : [];
	sections.value = sources.map((source, i) => {
		const result = sourceResults[i];
		return {
			id: source.id,
			title: source.title,
			items: result.status === 'fulfilled' ? result.value.items.slice(0, RESULTS_PER_SOURCE) : [],
		};
	});
	loading.value = false;
}

const debouncedSearch = useDebounceFn(runSearch, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));

watch(query, (value) => {
	const q = value.trim();
	if (q.length < MIN_QUERY_LENGTH) {
		requestId++;
		loading.value = false;
		pages.value = [];
		sections.value = [];
		return;
	}
	loading.value = true;
	void debouncedSearch(q);
});

async function openPage(page: DocPageSummary) {
	if (page.id) {
		await router.push({
			name: DOC_PAGE_VIEW,
			params: { projectId: page.projectId, pageId: page.id },
		});
		return;
	}
	await openDocPage(page.resourceType, page.resourceId);
}

async function openItem(item: CommandBarItem) {
	if (item.handler) {
		await item.handler();
	} else if (item.href) {
		await router.push(item.href);
	}
}
</script>

<template>
	<div :class="$style.search" data-testid="doc-search">
		<N8nInput
			v-model="query"
			size="large"
			clearable
			:placeholder="i18n.baseText('docPages.search.placeholder')"
			:aria-label="i18n.baseText('docPages.search.placeholder')"
			data-testid="doc-search-input"
		>
			<template #prefix>
				<N8nIcon icon="search" />
			</template>
		</N8nInput>

		<div v-if="isActive" :class="$style.results" aria-live="polite">
			<N8nLoading v-if="loading" :rows="3" />
			<template v-else-if="hasResults">
				<section v-if="pages.length > 0" :class="$style.section">
					<N8nText tag="h3" size="small" bold color="text-light" :class="$style.sectionTitle">
						{{ i18n.baseText('docPages.search.pages') }}
					</N8nText>
					<button
						v-for="page in pages"
						:key="`${page.resourceType}-${page.resourceId}`"
						type="button"
						:class="$style.row"
						data-testid="doc-search-page-result"
						@click="openPage(page)"
					>
						<N8nIcon icon="file-text" color="text-light" />
						<span :class="$style.rowText">
							<span :class="$style.rowTitle">
								<N8nText size="small" bold>{{ page.name }}</N8nText>
								<DocKindBadge :kind="page.kind" />
							</span>
							<N8nText v-if="page.excerpt" size="small" color="text-light" :class="$style.excerpt">
								{{ page.excerpt }}
							</N8nText>
						</span>
					</button>
				</section>
				<template v-for="section in sections" :key="section.id">
					<section v-if="section.items.length > 0" :class="$style.section">
						<N8nText tag="h3" size="small" bold color="text-light" :class="$style.sectionTitle">
							{{ section.title }}
						</N8nText>
						<button
							v-for="item in section.items"
							:key="item.id"
							type="button"
							:class="$style.row"
							data-testid="doc-search-command-result"
							@click="openItem(item)"
						>
							<span :class="$style.rowText">
								<N8nText size="small" bold>{{ item.title }}</N8nText>
								<N8nText v-if="item.description" size="small" color="text-light">
									{{ item.description }}
								</N8nText>
							</span>
						</button>
					</section>
				</template>
			</template>
			<N8nText v-else size="small" color="text-light" data-testid="doc-search-empty">
				{{ i18n.baseText('docPages.search.noResults') }}
			</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
.search {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.results {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.section {
	display: flex;
	flex-direction: column;
}

.sectionTitle {
	padding: 0 var(--spacing--xs) var(--spacing--4xs);
}

.row {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xs);
	width: 100%;
	padding: var(--spacing--xs);
	border: none;
	border-radius: var(--radius);
	background: none;
	text-align: left;
	cursor: pointer;
	color: var(--text-color);

	&:hover,
	&:focus-visible {
		background-color: var(--background--hover);
	}
}

.rowText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.rowTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.excerpt {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
