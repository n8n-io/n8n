<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { DocOverviewProject, DocPageSummary } from '@n8n/api-types';
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

import DocKindBadge from '../components/DocKindBadge.vue';
import DocSearch from '../components/DocSearch.vue';
import { DOC_PAGE_VIEW, PROJECT_DOCS_VIEW } from '../constants';
import { useDocPagesStore } from '../docPages.store';
import { useOpenDocPage } from '../composables/useOpenDocPage';

const i18n = useI18n();
const router = useRouter();
const toast = useToast();
const docPagesStore = useDocPagesStore();
const projectsStore = useProjectsStore();
const { openDocPage } = useOpenDocPage();

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

async function openItem(item: DocPageSummary) {
	if (item.id) {
		await router.push({
			name: DOC_PAGE_VIEW,
			params: { projectId: item.projectId, pageId: item.id },
		});
		return;
	}
	await openDocPage(item.resourceType, item.resourceId);
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
				<div v-else :class="$style.sections" data-testid="doc-overview-cards">
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
							<span :class="$style.rule" aria-hidden="true" />
						</button>

						<ul v-show="!collapsed.has(entry.project.id)" :class="$style.grid">
							<li
								v-for="(item, index) in entry.items"
								:key="`${item.resourceType}-${item.resourceId}`"
								:style="{ '--card-index': index }"
								:class="$style.cell"
							>
								<button
									type="button"
									:class="$style.card"
									data-testid="doc-overview-item"
									@click="openItem(item)"
								>
									<span :class="$style.cardTop">
										<DocKindBadge :kind="item.kind" />
										<N8nIcon
											:icon="item.resourceType === 'agent' ? 'bot' : 'workflow'"
											size="small"
											:class="$style.resourceIcon"
											:title="i18n.baseText(`docPages.resourceType.${item.resourceType}`)"
										/>
									</span>
									<span :class="$style.cardTitle">{{ item.name }}</span>
									<span :class="[$style.excerpt, { [$style.empty]: !item.excerpt }]">
										{{ item.excerpt || i18n.baseText('docPages.noExcerpt') }}
									</span>
									<span :class="$style.tags">
										<span v-if="item.isStale" :class="[$style.flag, $style.stale]">
											<N8nIcon icon="history" size="xsmall" />
											{{ i18n.baseText('docPages.stale.badge') }}
										</span>
										<span v-if="!item.isPublished" :class="$style.flag">
											{{ i18n.baseText('docPages.unpublished') }}
										</span>
										<N8nIcon icon="arrow-right" size="small" :class="$style.arrow" />
									</span>
								</button>
							</li>
							<li :class="$style.cell" :style="{ '--card-index': entry.items.length }">
								<RouterLink
									:to="{ name: PROJECT_DOCS_VIEW, params: { projectId: entry.project.id } }"
									:class="$style.viewAll"
									data-testid="doc-overview-view-all"
								>
									<N8nIcon icon="book-open" size="small" />
									{{ i18n.baseText('docPages.overview.viewAll') }}
								</RouterLink>
							</li>
						</ul>
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
	gap: var(--spacing--sm);
}

/* Section header: a full-width toggle row, like a Notion group heading. */
.sectionHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	padding: var(--spacing--4xs) var(--spacing--3xs);
	margin-left: calc(-1 * var(--spacing--3xs));
	border: none;
	border-radius: var(--radius--xs);
	background: none;
	color: var(--text-color);
	text-align: left;
	cursor: pointer;

	&:hover .chevron,
	&:focus-visible .chevron {
		color: var(--text-color);
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

.rule {
	flex: 1;
	height: 1px;
	margin-left: var(--spacing--2xs);
	background: var(--border-color--subtle);
}

.grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
	gap: var(--spacing--sm);
	margin: 0;
	padding: 0;
	list-style: none;
}

.cell {
	display: flex;
	min-width: 0;
	animation: rise var(--duration--slow) var(--easing--ease-out-quart) both;
	animation-delay: calc(var(--section-index, 0) * 60ms + var(--card-index, 0) * 35ms);
}

.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	width: 100%;
	min-height: 11rem;
	padding: var(--spacing--sm);
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius--md);
	background: var(--background--surface);
	color: var(--text-color);
	text-align: left;
	cursor: pointer;
	transition:
		border-color var(--duration--snappy) var(--easing--ease-out),
		box-shadow var(--duration--base) var(--easing--ease-out),
		transform var(--duration--base) var(--easing--ease-out);

	&:hover,
	&:focus-visible {
		border-color: var(--border-color--strong);
		box-shadow: var(--shadow--sm);
		transform: translateY(-2px);

		.arrow {
			opacity: 1;
			transform: translateX(0);
		}

		.cardTitle {
			text-decoration-color: currentColor;
		}
	}

	&:focus-visible {
		outline: var(--spacing--5xs) solid var(--color--primary);
		outline-offset: var(--spacing--5xs);
	}
}

.cardTop {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: var(--spacing--4xs);
}

.resourceIcon {
	color: var(--text-color--subtler);
}

.cardTitle {
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--md);
	text-decoration: underline;
	text-decoration-color: transparent;
	text-underline-offset: 3px;
	transition: text-decoration-color var(--duration--snappy) var(--easing--ease-out);
}

.excerpt {
	display: -webkit-box;
	-webkit-line-clamp: 3;
	-webkit-box-orient: vertical;
	overflow: hidden;
	color: var(--text-color--subtle);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);

	&.empty {
		color: var(--text-color--subtler);
		font-style: italic;
	}
}

.tags {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--4xs);
	margin-top: auto;
	padding-top: var(--spacing--2xs);
}

.flag {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
	height: var(--height--xs);
	padding-inline: var(--spacing--2xs);
	border: var(--border-width) dashed var(--border-color);
	border-radius: var(--radius--2xs);
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	white-space: nowrap;

	&.stale {
		border: none;
		background: color-mix(in srgb, var(--color--yellow-500) 18%, transparent);
		color: color-mix(in srgb, var(--color--yellow-700) 75%, var(--text-color));
	}
}

.arrow {
	margin-left: auto;
	color: var(--text-color--subtle);
	opacity: 0;
	transform: translateX(-4px);
	transition:
		opacity var(--duration--snappy) var(--easing--ease-out),
		transform var(--duration--base) var(--easing--ease-out);
}

/* The last tile of a section, like the dashed "New page" tile in Notion. */
.viewAll {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--3xs);
	width: 100%;
	min-height: 11rem;
	border: var(--border-width) dashed var(--border-color);
	border-radius: var(--radius--md);
	color: var(--text-color--subtle);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	text-decoration: none;
	transition:
		border-color var(--duration--snappy) var(--easing--ease-out),
		color var(--duration--snappy) var(--easing--ease-out),
		background-color var(--duration--snappy) var(--easing--ease-out);

	&:hover,
	&:focus-visible {
		border-color: var(--border-color--strong);
		background: var(--background--hover);
		color: var(--text-color);
	}
}

.truncate {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

@keyframes rise {
	from {
		opacity: 0;
		transform: translateY(6px);
	}
}

@media (prefers-reduced-motion: reduce) {
	.cell {
		animation: none;
	}

	.card,
	.arrow,
	.chevron {
		transition: none;
	}

	.card:hover,
	.card:focus-visible {
		transform: none;
	}
}
</style>
