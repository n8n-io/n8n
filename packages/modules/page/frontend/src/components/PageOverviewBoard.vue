<script setup lang="ts">
import type { PageOverviewWorkflow } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { N8nIcon, N8nInput, N8nLoading, N8nText } from '@n8n/design-system';
import { componentRegistry } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import PageOverviewCard from './PageOverviewCard.vue';
import { usePageOverview } from '../composables/usePageOverview';
import { CATEGORY_LABELS, toSectionDisplay } from '../overview/overviewDisplay';
import {
	filterWorkflows,
	isDocumented,
	searchWorkflows,
	toCategoryCounts,
	toCoverage,
	toOfferedGroupings,
	toSections,
	toWorkflowPageContent,
	type OverviewFilter,
	type OverviewGrouping,
} from '../overview/pageOverviewSections';
import { usePageStore } from '../page.store';

/**
 * Sums up the documentation of the workflows as a board of cards.
 * It loads the overview itself. `select-page` asks the host to show a page.
 * `select-project` asks the host to show the documentation of one project.
 * The `page-overview-actions` slot of the shell shows in the header when it is registered.
 */
const props = withDefaults(
	defineProps<{
		/** The project of the overview. Without it the board spans every readable project. */
		projectId?: string;
		/** A positive integer reloads the overview quietly at that interval. Off by default. */
		refreshIntervalMs?: number;
	}>(),
	{ projectId: undefined, refreshIntervalMs: undefined },
);

const emit = defineEmits<{
	'select-page': [pageId: string];
	'select-project': [projectId: string];
}>();

const i18n = useI18n();
const toast = useToast();
const pageStore = usePageStore();

const { overview, isLoading, refresh, refreshQuietly } = usePageOverview(
	() => props.projectId,
	() => props.refreshIntervalMs,
);

const OverviewActions = computed(() => componentRegistry.get('page-overview-actions'));

const workflows = computed(() => overview.value?.workflows ?? []);
const coverage = computed(() => toCoverage(workflows.value));
const categoryCounts = computed(() => toCategoryCounts(workflows.value));
const undocumentedWorkflows = computed(() =>
	workflows.value
		.filter((workflow) => !isDocumented(workflow))
		.map(({ id, name }) => ({ id, name })),
);

const searchQuery = ref('');
const selectedFilter = ref<OverviewFilter>('all');

/** The grouping that the user chose. `undefined` means the default grouping of the board. */
const selectedGrouping = ref<OverviewGrouping>();

const filters = computed(() => [
	{
		value: 'all' as const,
		label: i18n.baseText('page.overview.filter.all'),
		count: coverage.value.total,
	},
	...categoryCounts.value.map(({ category, count }) => ({
		value: category,
		label: i18n.baseText(CATEGORY_LABELS[category]),
		count,
	})),
	{
		value: 'undocumented' as const,
		label: i18n.baseText('page.overview.filter.undocumented'),
		count: undocumentedWorkflows.value.length,
	},
]);

/** The selected filter, or all workflows when a reload removed the selected category. */
const activeFilter = computed(() =>
	filters.value.some(({ value }) => value === selectedFilter.value) ? selectedFilter.value : 'all',
);

const offeredGroupings = computed(() => toOfferedGroupings(props.projectId));

/** The chosen grouping when the board offers it, or the default grouping of the board. */
const grouping = computed(
	() =>
		offeredGroupings.value.find((offered) => offered === selectedGrouping.value) ??
		offeredGroupings.value[0],
);

const groupings = computed(() =>
	offeredGroupings.value.map((value) => ({
		value,
		label: i18n.baseText(`page.overview.groupBy.${value}`),
	})),
);

/** The keys of the sections whose cards are hidden. The state does not outlive the board. */
const collapsedSectionKeys = ref<ReadonlySet<string>>(new Set());

function toggleSection(key: string): void {
	const collapsed = collapsedSectionKeys.value;
	collapsedSectionKeys.value = new Set(
		collapsed.has(key) ? [...collapsed].filter((other) => other !== key) : [...collapsed, key],
	);
}

const sections = computed(() =>
	toSections(
		filterWorkflows(searchWorkflows(workflows.value, searchQuery.value), activeFilter.value),
		grouping.value,
	).map((section) => ({
		...section,
		display: toSectionDisplay(section, (key) => i18n.baseText(key)),
		isExpanded: !collapsedSectionKeys.value.has(section.key),
		/** The project that "View all" opens. Only a project section that hides cards has one. */
		viewAllProjectId:
			section.kind === 'project' && section.total > section.workflows.length
				? section.projectId
				: undefined,
	})),
);

/** The workflow whose page is created now. */
const writingWorkflowId = ref<string>();

/** Creates the page that documents a workflow, in the project of that workflow, then asks the host to show it. */
async function writePage(workflow: PageOverviewWorkflow): Promise<void> {
	if (writingWorkflowId.value === undefined) {
		writingWorkflowId.value = workflow.id;
		try {
			const page = await pageStore.createPage(workflow.projectId, {
				title: workflow.name,
				content: toWorkflowPageContent(workflow),
			});
			void refreshQuietly();
			emit('select-page', page.id);
		} catch (error) {
			toast.showError(error, i18n.baseText('page.create.error'));
		} finally {
			writingWorkflowId.value = undefined;
		}
	}
}

defineExpose({ refresh });
</script>

<template>
	<div :class="$style.board" data-test-id="page-overview-board">
		<N8nLoading v-if="isLoading" :rows="4" />
		<template v-else>
			<header :class="$style.header">
				<div :class="$style.summary">
					<h2 :class="$style.title">{{ i18n.baseText('page.overview.title') }}</h2>
					<div :class="$style.coverage">
						<div
							:class="$style.progress"
							role="progressbar"
							aria-valuemin="0"
							aria-valuemax="100"
							:aria-valuenow="coverage.percent"
							data-test-id="page-overview-progress"
						>
							<div :class="$style.progressValue" :style="{ width: `${coverage.percent}%` }" />
						</div>
						<N8nText size="small" color="text-light" data-test-id="page-overview-coverage">
							{{
								i18n.baseText('page.overview.coverage', {
									interpolate: {
										documented: String(coverage.documented),
										total: String(coverage.total),
									},
								})
							}}
						</N8nText>
					</div>
				</div>
				<div v-if="OverviewActions" :class="$style.actions" data-test-id="page-overview-actions">
					<component
						:is="OverviewActions"
						:project-id="projectId"
						:undocumented-workflows="undocumentedWorkflows"
					/>
				</div>
			</header>
			<N8nText
				v-if="workflows.length === 0"
				color="text-light"
				data-test-id="page-overview-no-workflows"
			>
				{{ i18n.baseText('page.overview.noWorkflows') }}
			</N8nText>
			<template v-else>
				<div :class="$style.toolbar">
					<N8nInput
						v-model="searchQuery"
						size="small"
						clearable
						:class="$style.search"
						:placeholder="i18n.baseText('page.overview.search.placeholder')"
						data-test-id="page-overview-search"
					>
						<template #prefix>
							<N8nIcon icon="search" size="small" />
						</template>
					</N8nInput>
					<div :class="$style.controls">
						<div
							:class="$style.chips"
							role="group"
							:aria-label="i18n.baseText('page.overview.filter.label')"
						>
							<button
								v-for="filter in filters"
								:key="filter.value"
								type="button"
								:class="[$style.chip, filter.value === activeFilter ? $style.chipActive : '']"
								:aria-pressed="filter.value === activeFilter"
								:data-filter="filter.value"
								data-test-id="page-overview-filter"
								@click="selectedFilter = filter.value"
							>
								{{ filter.label }}
								<span :class="$style.chipCount">{{ filter.count }}</span>
							</button>
						</div>
						<div
							:class="$style.groupBy"
							role="group"
							:aria-label="i18n.baseText('page.overview.groupBy.label')"
						>
							<span :class="$style.groupByLabel">
								{{ i18n.baseText('page.overview.groupBy.label') }}
							</span>
							<button
								v-for="option in groupings"
								:key="option.value"
								type="button"
								:class="[$style.chip, option.value === grouping ? $style.chipActive : '']"
								:aria-pressed="option.value === grouping"
								:data-grouping="option.value"
								data-test-id="page-overview-group-by"
								@click="selectedGrouping = option.value"
							>
								{{ option.label }}
							</button>
						</div>
					</div>
				</div>
				<N8nText
					v-if="sections.length === 0"
					color="text-light"
					data-test-id="page-overview-no-match"
				>
					{{ i18n.baseText('page.overview.noMatch') }}
				</N8nText>
				<section
					v-for="section in sections"
					:key="section.key"
					:class="[$style.section, $style[section.display.accent]]"
					data-test-id="page-overview-section"
				>
					<h3 :class="$style.sectionHeading">
						<button
							type="button"
							:class="$style.sectionToggle"
							:aria-expanded="section.isExpanded"
							:aria-label="
								i18n.baseText(
									section.isExpanded
										? 'page.overview.section.collapse'
										: 'page.overview.section.expand',
								)
							"
							data-test-id="page-overview-section-toggle"
							@click="toggleSection(section.key)"
						>
							<N8nIcon :icon="section.isExpanded ? 'chevron-down' : 'chevron-right'" size="small" />
						</button>
						<span :class="$style.sectionIcon">
							<N8nIcon :icon="section.display.icon" size="small" />
						</span>
						<span data-test-id="page-overview-section-label">{{ section.display.label }}</span>
						<span :class="$style.sectionCount">{{ section.total }}</span>
					</h3>
					<div v-if="section.isExpanded" :class="$style.grid">
						<PageOverviewCard
							v-for="workflow in section.workflows"
							:key="workflow.id"
							:workflow="workflow"
							:show-project="projectId === undefined && section.kind !== 'project'"
							:is-writing="workflow.id === writingWorkflowId"
							@select-page="emit('select-page', $event)"
							@write-page="writePage"
						/>
						<button
							v-if="section.viewAllProjectId"
							type="button"
							:class="$style.viewAll"
							data-test-id="page-overview-view-all"
							@click="emit('select-project', section.viewAllProjectId)"
						>
							{{
								i18n.baseText('page.overview.section.viewAll', {
									interpolate: { count: String(section.total) },
								})
							}}
							<N8nIcon icon="arrow-right" size="small" />
						</button>
					</div>
				</section>
			</template>
		</template>
	</div>
</template>

<style lang="scss" module>
@use '../overview/accent';

@include accent.classes;

.board {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	width: 100%;
	padding: var(--spacing--lg);
	box-sizing: border-box;
}

.header {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.summary {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.title {
	margin: 0;
	color: var(--text-color);
	font-size: var(--font-size--xl);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--md);
}

.coverage {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.progress {
	overflow: hidden;
	width: var(--spacing--4xl);
	height: var(--spacing--3xs);
	border-radius: var(--radius--full);
	background-color: var(--background--active);
}

.progressValue {
	height: 100%;
	border-radius: var(--radius--full);
	background-color: var(--color--success);
	transition: width var(--duration--snappy) var(--easing--ease-out);

	@media (prefers-reduced-motion: reduce) {
		transition: none;
	}
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-left: auto;
}

.toolbar {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.search {
	max-width: calc(var(--spacing--5xl) + var(--spacing--3xl));
}

.controls {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs) var(--spacing--lg);
}

.chips,
.groupBy {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--3xs);
}

.groupByLabel {
	margin-right: var(--spacing--4xs);
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
}

.chip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--full);
	background-color: var(--background--surface);
	color: var(--text-color--subtle);
	font-family: inherit;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--lg);
	cursor: pointer;
	transition: background-color var(--duration--snappy) var(--easing--ease-out);

	&:hover {
		background-color: var(--background--hover);
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--border-color);
	}
}

.chipActive,
.chipActive:hover {
	border-color: var(--text-color);
	background-color: var(--text-color);
	color: var(--background--surface);
}

.chipCount {
	opacity: 0.7;
	font-variant-numeric: tabular-nums;
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.sectionHeading {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin: 0;
	color: var(--text-color);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
}

.sectionToggle {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--4xs);
	border: 0;
	border-radius: var(--radius--md);
	background-color: transparent;
	color: var(--text-color--subtle);
	cursor: pointer;

	&:hover {
		background-color: var(--background--hover);
		color: var(--text-color);
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--border-color);
	}
}

.sectionIcon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--3xs);
	border: var(--border);
	border-color: var(--page-overview--accent--border-color);
	border-radius: var(--radius--md);
	background-color: var(--page-overview--accent--color--background);
	color: var(--sticky--color--text);
}

.sectionCount {
	color: var(--text-color--subtler);
	font-weight: var(--font-weight--regular);
	font-variant-numeric: tabular-nums;
}

.grid {
	display: grid;
	grid-template-columns: repeat(
		auto-fill,
		minmax(calc(var(--spacing--5xl) + var(--spacing--xl)), 1fr)
	);
	gap: var(--spacing--md);
}
.viewAll {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
	min-height: calc(var(--spacing--3xl) + var(--spacing--xl));
	padding: var(--spacing--sm);
	border: var(--border);
	border-style: dashed;
	border-radius: var(--radius--xl);
	background-color: transparent;
	color: var(--text-color--subtle);
	font-family: inherit;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	cursor: pointer;
	transition: background-color var(--duration--snappy) var(--easing--ease-out);

	&:hover {
		background-color: var(--background--hover);
		color: var(--text-color);
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--border-color);
	}

	@media (prefers-reduced-motion: reduce) {
		transition: none;
	}
}
</style>
