<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { DocOverviewProject } from '@n8n/api-types';
import {
	N8nEmptyState,
	N8nHeading,
	N8nIcon,
	N8nLink,
	N8nLoading,
	N8nText,
	type IconOrEmoji,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { VIEWS } from '@/app/constants';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import PageViewLayout from '@/app/components/layouts/PageViewLayout.vue';
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';

import DocList from '../components/DocList.vue';
import DocSearch from '../components/DocSearch.vue';
import { PROJECT_DOCS_VIEW } from '../constants';
import { useDocPagesStore } from '../docPages.store';

const i18n = useI18n();
const toast = useToast();
const docPagesStore = useDocPagesStore();
const projectsStore = useProjectsStore();

const loading = ref(true);
const projects = ref<DocOverviewProject[]>([]);
const query = ref('');
const collapsed = ref(new Set<string>());

const isSearching = computed(() => query.value.trim().length >= 2);
const visibleProjects = computed(() => projects.value.filter((p) => p.items.length > 0));

const isPersonal = (project: DocOverviewProject['project']) =>
	project.type === ProjectTypes.Personal;

const projectName = (project: DocOverviewProject['project']) =>
	isPersonal(project) ? i18n.baseText('projects.menu.personal') : project.name;

// The overview response has no icon, so take it from the project list that the sidebar loads.
const projectIcon = (project: DocOverviewProject['project']): IconOrEmoji =>
	projectsStore.myProjects.find((p) => p.id === project.id)?.icon ?? {
		type: 'icon',
		value: isPersonal(project) ? 'user' : 'layers',
	};

function toggle(projectId: string) {
	const next = new Set(collapsed.value);
	if (!next.delete(projectId)) next.add(projectId);
	collapsed.value = next;
}

onMounted(async () => {
	useDocumentTitle().set(i18n.baseText('docPages.overview.title'));
	try {
		projects.value = await docPagesStore.fetchOverview();
	} catch (error) {
		toast.showError(error, i18n.baseText('docPages.overview.error'));
	} finally {
		loading.value = false;
	}
});
</script>

<template>
	<PageViewLayout>
		<template #header>
			<div :class="$style.header">
				<div :class="$style.titleBlock">
					<N8nHeading tag="h1" size="2xlarge" bold>
						{{ i18n.baseText('docPages.overview.title') }}
					</N8nHeading>
					<N8nText color="text-light">
						{{ i18n.baseText('docPages.overview.subtitle') }}
					</N8nText>
				</div>
				<N8nLink
					:to="{ name: VIEWS.WORKFLOWS }"
					theme="text"
					size="small"
					data-testid="doc-overview-all-workflows"
				>
					{{ i18n.baseText('docPages.overview.allWorkflows') }}
				</N8nLink>
			</div>
		</template>

		<div :class="$style.content">
			<DocSearch v-model:query="query" />

			<template v-if="!isSearching">
				<N8nLoading v-if="loading" :rows="6" />
				<N8nEmptyState
					v-else-if="visibleProjects.length === 0"
					:icon="{ type: 'icon', value: 'book-open' }"
					:heading="i18n.baseText('docPages.overview.empty.heading')"
					:description="i18n.baseText('docPages.overview.empty.description')"
					data-testid="doc-overview-empty"
				/>
				<div v-else :class="$style.sections" data-testid="doc-overview-sections">
					<section
						v-for="(entry, sectionIndex) in visibleProjects"
						:key="entry.project.id"
						:class="$style.section"
						:style="{ '--section-index': sectionIndex }"
						data-testid="doc-overview-section"
					>
						<button
							type="button"
							:class="$style.sectionHeader"
							:aria-expanded="!collapsed.has(entry.project.id)"
							data-testid="doc-overview-section-toggle"
							@click="toggle(entry.project.id)"
						>
							<N8nIcon
								icon="chevron-right"
								size="small"
								:class="[$style.chevron, { [$style.open]: !collapsed.has(entry.project.id) }]"
							/>
							<ProjectIcon :icon="projectIcon(entry.project)" size="small" border-less />
							<N8nHeading tag="h2" size="medium" bold :class="$style.truncate">
								{{ projectName(entry.project) }}
							</N8nHeading>
							<span :class="$style.count">{{ entry.items.length }}</span>
						</button>

						<DocList v-show="!collapsed.has(entry.project.id)" :items="entry.items">
							<template #footer>
								<RouterLink
									:to="{ name: PROJECT_DOCS_VIEW, params: { projectId: entry.project.id } }"
									:class="$style.viewAll"
									data-testid="doc-overview-view-all"
								>
									{{ i18n.baseText('docPages.overview.viewAll') }}
									<N8nIcon icon="arrow-right" size="xsmall" />
								</RouterLink>
							</template>
						</DocList>
					</section>
				</div>
			</template>
		</div>
	</PageViewLayout>
</template>

<style lang="scss" module>
.header {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding-bottom: var(--spacing--lg);
}

.titleBlock {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xl);
	padding-bottom: var(--spacing--2xl);
}

.sections {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xl);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

/* Section header: a toggle row, like a Notion group heading. */
.sectionHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: fit-content;
	max-width: 100%;
	padding: var(--spacing--4xs) var(--spacing--3xs);
	margin-left: calc(-1 * var(--spacing--3xs));
	border: none;
	border-radius: var(--radius--xs);
	background: none;
	color: var(--text-color);
	text-align: left;
	cursor: pointer;

	&:hover,
	&:focus-visible {
		background: var(--background--hover);

		.chevron {
			color: var(--text-color);
		}
	}

	&:focus-visible {
		outline: var(--spacing--5xs) solid var(--color--primary);
		outline-offset: var(--spacing--5xs);
	}
}

.chevron {
	flex-shrink: 0;
	color: var(--text-color--subtler);
	transition: transform var(--duration--snappy) var(--easing--ease-out);

	&.open {
		transform: rotate(90deg);
	}
}

.count {
	flex-shrink: 0;
	padding: 0 var(--spacing--3xs);
	border-radius: var(--radius--full);
	background: var(--background--hover);
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--xl);
	font-variant-numeric: tabular-nums;
}

.viewAll {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	color: var(--text-color--subtle);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
	text-decoration: none;
	transition:
		color var(--duration--snappy) var(--easing--ease-out),
		background-color var(--duration--snappy) var(--easing--ease-out);

	&:hover,
	&:focus-visible {
		background: var(--background--hover);
		color: var(--text-color);
	}
}

.truncate {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
	.chevron {
		transition: none;
	}
}
</style>
