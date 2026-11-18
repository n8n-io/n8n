<script setup lang="ts">
import type { Page, PageOverviewWorkflow } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { N8nEmptyState, N8nIcon, N8nLoading, N8nText } from '@n8n/design-system';
import { componentRegistry } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { computed, provide, ref, useTemplateRef, watch } from 'vue';

import ClippedContent from './ClippedContent.vue';
import PageEditorDocument from './PageEditorDocument.vue';
import PageOverviewCard from './PageOverviewCard.vue';
import { usePageOverview } from '../composables/usePageOverview';
import { toSectionLabel } from '../overview/overviewDisplay';
import { isDocumented, toSections, toWorkflowPageContent } from '../overview/pageOverviewSections';
import { WORKFLOW_CATEGORIES } from '../overview/workflowCategories';
import { usePageStore } from '../page.store';

/**
 * Sums up the documentation of the workflows as a board of cards.
 * It loads the overview itself. `select-page` asks the host to show a page.
 * `select-project` asks the host to show the documentation of one project.
 * A board of one project groups the workflows by trigger, without a heading. A board of every project groups them by project.
 * A board of one project shows the page that sums up the project above the cards. The user can edit it in place.
 * A long summary shows clipped. A chip of a workflow in the summary takes the color of the trigger of that workflow.
 * A project with no page shows an empty state in place of the cards, when the shell registers the actions slot.
 * The user can leave the empty state to write the pages without the actions.
 * The `page-overview-actions` slot of the shell shows in the empty state and next to the summary when it is registered.
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
const undocumentedWorkflows = computed(() =>
	workflows.value
		.filter((workflow) => !isDocumented(workflow))
		.map(({ id, name }) => ({ id, name })),
);

provide(
	WORKFLOW_CATEGORIES,
	computed(() => new Map(workflows.value.map(({ id, category }) => [id, category]))),
);

const summary = computed(() => overview.value?.summary);
const hasSummary = computed(() => summary.value !== undefined && !summary.value.isEmpty);

/** True after the user chose to write the pages without the actions of the shell. */
const writesWithoutActions = ref(false);

/** True when the board offers the actions of the shell in place of a project that has no text. */
const showsEmptyState = computed(
	() =>
		props.projectId !== undefined &&
		OverviewActions.value !== undefined &&
		!writesWithoutActions.value &&
		workflows.value.length > 0 &&
		!hasSummary.value &&
		!workflows.value.some(isDocumented),
);

const summaryDocument = useTemplateRef<InstanceType<typeof PageEditorDocument>>('summaryDocument');

/** The version of the summary that the document shows. */
const shownSummaryVersion = ref<number>();

function rememberShownSummary(page: Page): void {
	shownSummaryVersion.value = page.version;
}

/** Shows the summary that another writer saved, for example the assistant. */
watch(
	() => summary.value?.version,
	(version) => {
		const isNewer =
			version !== undefined &&
			shownSummaryVersion.value !== undefined &&
			version > shownSummaryVersion.value;
		if (isNewer) {
			void summaryDocument.value?.reload();
		}
	},
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
	toSections(workflows.value, props.projectId).map((section) => ({
		...section,
		label: toSectionLabel(section, (key) => i18n.baseText(key)),
		/** A trigger section has no heading, because each card shows the trigger. */
		hasHeading: section.kind === 'project',
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
			<N8nText
				v-if="workflows.length === 0"
				color="text-light"
				data-test-id="page-overview-no-workflows"
			>
				{{ i18n.baseText('page.overview.noWorkflows') }}
			</N8nText>
			<N8nEmptyState
				v-else-if="showsEmptyState"
				:icon="{ type: 'icon', value: 'book-open' }"
				:heading="i18n.baseText('page.overview.empty.heading')"
				:description="i18n.baseText('page.overview.empty.description')"
				data-test-id="page-overview-empty"
			>
				<template #additionalContent>
					<div :class="$style.emptyActions">
						<component
							:is="OverviewActions"
							:project-id="projectId"
							:undocumented-workflows="undocumentedWorkflows"
							:has-summary="false"
						/>
						<button
							type="button"
							:class="$style.writeYourself"
							data-test-id="page-overview-write-yourself"
							@click="writesWithoutActions = true"
						>
							{{ i18n.baseText('page.overview.empty.writeYourself') }}
						</button>
					</div>
				</template>
			</N8nEmptyState>
			<template v-else>
				<section
					v-if="projectId"
					:class="$style.summary"
					:aria-label="i18n.baseText('page.overview.summary.title')"
					data-test-id="page-overview-summary"
				>
					<header :class="$style.summaryBar">
						<span :class="$style.summaryLabel">
							<N8nIcon icon="book-open" size="small" />
							{{ i18n.baseText('page.overview.summary.title') }}
						</span>
						<div
							v-if="OverviewActions"
							:class="$style.actions"
							data-test-id="page-overview-actions"
						>
							<component
								:is="OverviewActions"
								:project-id="projectId"
								:undocumented-workflows="undocumentedWorkflows"
								:has-summary="hasSummary"
							/>
						</div>
					</header>
					<div :class="$style.summaryBody">
						<ClippedContent v-if="summary && hasSummary">
							<PageEditorDocument
								ref="summaryDocument"
								:key="summary.id"
								:page-id="summary.id"
								:project-id="projectId"
								:readonly="false"
								:show-title="false"
								dense
								@loaded="rememberShownSummary"
								@saved="rememberShownSummary"
							/>
						</ClippedContent>
						<N8nText
							v-else
							color="text-light"
							size="small"
							data-test-id="page-overview-summary-empty"
						>
							{{ i18n.baseText('page.overview.summary.empty') }}
						</N8nText>
					</div>
				</section>
				<section
					v-for="section in sections"
					:key="section.key"
					:class="[$style.section, { [$style.untitled]: !section.hasHeading }]"
					:aria-label="section.label"
					data-test-id="page-overview-section"
				>
					<h3 v-if="section.hasHeading" :class="$style.sectionHeading">
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
						<span data-test-id="page-overview-section-label">{{ section.label }}</span>
						<span :class="$style.sectionCount">{{ section.total }}</span>
					</h3>
					<div v-if="section.isExpanded" :class="$style.grid">
						<PageOverviewCard
							v-for="workflow in section.workflows"
							:key="workflow.id"
							:workflow="workflow"
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
.board {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xl);
	width: 100%;
	padding: var(--spacing--lg);
	box-sizing: border-box;
}

.actions {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}

.emptyActions {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--sm);
}

.writeYourself {
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: 0;
	border-radius: var(--radius--md);
	background-color: transparent;
	color: var(--text-color--subtle);
	font-family: inherit;
	font-size: var(--font-size--2xs);
	cursor: pointer;

	&:hover {
		color: var(--text-color);
		text-decoration: underline;
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--border-color);
	}
}

.summary {
	overflow: hidden;
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--background--surface);
}

.summaryBar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	min-height: var(--spacing--xl);
	padding: var(--spacing--4xs) var(--spacing--2xs) var(--spacing--4xs) var(--spacing--md);
	border-bottom: var(--border);
	background-color: var(--background--subtle);
}

.summaryBody {
	padding: var(--spacing--xs) var(--spacing--md) var(--spacing--sm);
}

.summaryLabel {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.untitled + .untitled {
	padding-top: var(--spacing--xl);
	border-top: var(--border);
}

.sectionHeading {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
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
	color: var(--text-color--subtler);
	cursor: pointer;

	&:hover {
		background-color: var(--background--hover);
		color: var(--text-color);
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--border-color);
	}
}

.sectionCount {
	margin-left: var(--spacing--4xs);
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
	gap: var(--spacing--sm);
}

.viewAll {
	display: flex;
	align-items: center;
	align-self: start;
	justify-content: center;
	gap: var(--spacing--2xs);
	min-height: calc(var(--spacing--3xl) * 2);
	padding: var(--spacing--sm);
	border: var(--border);
	border-style: dashed;
	border-radius: var(--radius--lg);
	background-color: transparent;
	color: var(--text-color--subtle);
	font-family: inherit;
	font-size: var(--font-size--2xs);
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
