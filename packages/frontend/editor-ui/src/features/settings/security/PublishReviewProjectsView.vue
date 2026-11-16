<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
	N8nDataTableServer,
	N8nIcon,
	N8nInput,
	N8nSelect2,
	N8nSelect2Item,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import type { IconOrEmoji, SelectOptionBase, SelectValue, TableHeader } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { PROMOTIONS_SETTINGS_VIEW } from '@n8n/frontend-module-promotions';
import { useRootStore } from '@n8n/stores/useRootStore';
import { VIEWS } from '@/app/constants';
import * as workflowsApi from '@/app/api/workflows';

import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';
import { DEFAULT_PROJECT_ICON } from '@/features/collaboration/projects/projects.constants';
import { useTeamReviewProjects } from '@/features/workflow-reviews/composables/useTeamReviewProjects';
import {
	effectiveProjectReviewers,
	isNewVariant,
	isReviewerPool,
	projectAdminOptedIn,
	projectApprovalDisplay,
	projectReviewerChoice,
	reviewerPoolsUpTo,
	reviewPrototypeState,
	setProjectEnforcement,
	setProjectReviewers,
	type ProjectApprovalDisplay,
	type ReviewerPool,
	type ReviewTrack,
} from '@/features/workflow-reviews/reviewPrototype.state';

const props = withDefaults(defineProps<{ track?: ReviewTrack }>(), { track: 'publishing' });

type ApprovalFilter = 'all' | ProjectApprovalDisplay;

type WorkflowCounts = { workflows: number; active: number };

type ProjectRow = {
	id: string;
	name: string;
	icon: IconOrEmoji;
	approval: ProjectApprovalDisplay;
	reviewers: ReviewerPool;
	workflows: number | null;
	active: number | null;
};

const APPROVAL_RANK: Record<ProjectApprovalDisplay, number> = {
	required: 0,
	optedIn: 1,
	notRequired: 2,
};

const router = useRouter();
const i18n = useI18n();
const rootStore = useRootStore();
const { teamProjects } = useTeamReviewProjects();

const isPublishing = computed(() => props.track === 'publishing');
const testPrefix = computed(() => (isPublishing.value ? 'publish-review' : 'promotion-review'));
const backView = computed(() =>
	isPublishing.value ? VIEWS.SECURITY_SETTINGS : PROMOTIONS_SETTINGS_VIEW,
);
const instanceReviewers = computed(() =>
	isPublishing.value
		? reviewPrototypeState.publishingReviewers
		: reviewPrototypeState.promotingReviewers,
);

const search = ref('');
const approvalFilter = ref<ApprovalFilter>('all');
const sortBy = ref<Array<{ id: string; desc: boolean }>>([]);
const counts = ref<Record<string, WorkflowCounts>>({});

const filterOptions = computed<Array<SelectOptionBase<ApprovalFilter>>>(() => [
	{ value: 'all', label: i18n.baseText('settings.security.workflowReviews.projects.filter.all') },
	{
		value: 'required',
		label: i18n.baseText('settings.security.workflowReviews.projects.filter.required'),
	},
	{
		value: 'optedIn',
		label: i18n.baseText('settings.security.workflowReviews.projects.filter.optedIn'),
	},
	{
		value: 'notRequired',
		label: i18n.baseText('settings.security.workflowReviews.projects.filter.notRequired'),
	},
]);

/** The project can narrow reviewers only when the instance pool includes editors. */
const showReviewersColumn = computed(() => instanceReviewers.value === 'projectAdminsAndEditors');

const headers = computed<Array<TableHeader<ProjectRow>>>(() => {
	const columns: Array<TableHeader<ProjectRow>> = [
		{
			title: i18n.baseText('settings.security.workflowReviews.projects.column.project'),
			key: 'name',
			resize: false,
		},
		{
			title: i18n.baseText('settings.security.workflowReviews.projects.column.approval'),
			key: 'approval',
			resize: false,
		},
	];
	if (showReviewersColumn.value) {
		columns.push({
			title: i18n.baseText('settings.security.workflowReviews.reviewers.label'),
			key: 'reviewers',
			resize: false,
		});
	}
	columns.push(
		{
			title: i18n.baseText('generic.workflows'),
			key: 'workflows',
			align: 'end',
			resize: false,
		},
		{
			title: i18n.baseText('settings.security.workflowReviews.projects.column.published'),
			key: 'active',
			align: 'end',
			resize: false,
		},
	);
	return columns;
});

const rows = computed<ProjectRow[]>(() => {
	const query = search.value.trim().toLowerCase();
	const filtered = teamProjects.value
		.map((project): ProjectRow => {
			const projectCounts = counts.value[project.id];
			return {
				id: project.id,
				name: project.name ?? '',
				icon: project.icon ?? DEFAULT_PROJECT_ICON,
				approval: projectApprovalDisplay(project.id, props.track),
				reviewers: effectiveProjectReviewers(project.id, props.track),
				workflows: projectCounts?.workflows ?? null,
				active: projectCounts?.active ?? null,
			};
		})
		.filter((row) => {
			if (query && !row.name.toLowerCase().includes(query)) return false;
			if (approvalFilter.value !== 'all' && row.approval !== approvalFilter.value) return false;
			return true;
		});

	const sort = sortBy.value[0];
	if (!sort) return filtered;
	const direction = sort.desc ? -1 : 1;
	return [...filtered].sort((left, right) => direction * compareRows(left, right, sort.id));
});

const emptyMessage = computed(() =>
	i18n.baseText(
		teamProjects.value.length === 0
			? 'settings.security.workflowReviews.projects.emptyTeam'
			: 'settings.security.workflowReviews.projects.empty',
	),
);

function compareRows(left: ProjectRow, right: ProjectRow, column: string): number {
	if (column === 'name') return left.name.localeCompare(right.name);
	if (column === 'approval') return APPROVAL_RANK[left.approval] - APPROVAL_RANK[right.approval];
	if (column === 'reviewers')
		return reviewerLabel(left.reviewers).localeCompare(reviewerLabel(right.reviewers));
	if (column === 'workflows' || column === 'active') {
		const leftValue = left[column];
		const rightValue = right[column];
		if (leftValue === null && rightValue === null) return 0;
		if (leftValue === null) return 1;
		if (rightValue === null) return -1;
		return leftValue - rightValue;
	}
	return 0;
}

function isApprovalFilter(value: SelectValue | undefined): value is ApprovalFilter {
	return value === 'all' || value === 'required' || value === 'optedIn' || value === 'notRequired';
}

function isApprovalDisplay(value: SelectValue | undefined): value is ProjectApprovalDisplay {
	return value === 'required' || value === 'optedIn' || value === 'notRequired';
}

function onFilter(value: SelectValue | undefined) {
	if (!isApprovalFilter(value)) return;
	approvalFilter.value = value;
}

function approvalOptions(projectId: string): Array<SelectOptionBase<ProjectApprovalDisplay>> {
	const optedIn = projectAdminOptedIn(projectId, props.track);
	return [
		{
			value: 'required',
			label: i18n.baseText('settings.security.workflowReviews.projects.approval.required'),
			icon: 'lock',
		},
		{
			value: 'optedIn',
			label: i18n.baseText('settings.security.workflowReviews.projects.approval.optedIn'),
			icon: 'lock-unlocked',
			disabled: !optedIn,
		},
		{
			value: 'notRequired',
			label: i18n.baseText('settings.security.workflowReviews.projects.approval.notRequired'),
			icon: 'lock-unlocked',
			disabled: optedIn,
		},
	];
}

function onApproval(projectId: string, value: SelectValue | undefined) {
	if (!isApprovalDisplay(value)) return;
	const optedIn = projectAdminOptedIn(projectId, props.track);
	if (value === 'optedIn' && !optedIn) return;
	if (value === 'notRequired' && optedIn) return;
	setProjectEnforcement(
		projectId,
		props.track,
		value === 'required',
		teamProjects.value.map((project) => project.id),
	);
}

function reviewerLabel(pool: ReviewerPool): string {
	return i18n.baseText(
		pool === 'projectAdminsOnly'
			? 'settings.security.workflowReviews.reviewers.option.projectAdminsOnly'
			: 'settings.security.workflowReviews.reviewers.option.projectAdminsAndEditors',
	);
}

function reviewerOptions(): Array<SelectOptionBase<ReviewerPool>> {
	return reviewerPoolsUpTo(instanceReviewers.value).map((pool) => ({
		value: pool,
		label: reviewerLabel(pool),
	}));
}

function onReviewers(projectId: string, value: SelectValue | undefined) {
	if (!isReviewerPool(value)) return;
	const current = projectReviewerChoice(projectId, props.track);
	if (current === value) return;
	setProjectReviewers(projectId, props.track, value);
}

function goBack() {
	void router.push({ name: backView.value });
}

async function loadCounts(projectIds: string[]) {
	const next: Record<string, WorkflowCounts> = {};
	await Promise.all(
		projectIds.map(async (projectId) => {
			try {
				let skip = 0;
				let total = 0;
				let active = 0;
				const pageSize = 100;
				do {
					const response = await workflowsApi.getWorkflows(
						rootStore.restApiContext,
						{ projectId, isArchived: false },
						{ take: pageSize, skip, includeScopes: false },
					);
					total = response.count;
					for (const workflow of response.data) {
						if (workflow.active) active += 1;
					}
					const received = response.data.length;
					skip += received;
					if (received === 0) break;
				} while (skip < total);
				next[projectId] = { workflows: total, active };
			} catch {
				// Counts are a display aid. Leave this project's cells empty.
			}
		}),
	);
	counts.value = next;
}

watch(
	() => teamProjects.value.map((project) => project.id).join('\0'),
	(ids) => {
		const projectIds = ids === '' ? [] : ids.split('\0');
		if (projectIds.length === 0) {
			counts.value = {};
			return;
		}
		void loadCounts(projectIds);
	},
	{ immediate: true },
);

watch(
	isNewVariant,
	(isNew) => {
		if (!isNew) void router.replace({ name: backView.value });
	},
	{ immediate: true },
);
</script>

<template>
	<N8nSettingsLayout
		v-if="isNewVariant"
		:class="$style.page"
		full-width
		show-back
		:back-label="i18n.baseText(isPublishing ? 'settings.security' : 'settings.promotions.title')"
		:data-test-id="`${testPrefix}-projects-view`"
		@back="goBack"
	>
		<N8nSettingsPageHeader
			:title="
				i18n.baseText(
					isPublishing
						? 'projects.settings.reviews.publishing.title'
						: 'settings.promotions.reviews.title',
				)
			"
			:description="
				i18n.baseText(
					isPublishing
						? 'settings.security.workflowReviews.projects.page.description'
						: 'settings.promotions.reviews.projects.description',
				)
			"
			:show-docs-link="false"
		/>

		<div :class="$style.toolbar">
			<N8nInput
				v-model="search"
				:class="$style.search"
				size="medium"
				clearable
				:placeholder="i18n.baseText('settings.security.workflowReviews.projects.search')"
				:data-test-id="`${testPrefix}-projects-search`"
			>
				<template #prefix>
					<N8nIcon icon="search" />
				</template>
			</N8nInput>
			<N8nSelect2
				:model-value="approvalFilter"
				:items="filterOptions"
				size="medium"
				:data-test-id="`${testPrefix}-projects-filter`"
				@update:model-value="onFilter"
			/>
		</div>

		<N8nDataTableServer
			v-model:sort-by="sortBy"
			:headers="headers"
			:items="rows"
			:items-length="rows.length"
			:pagination="false"
			item-value="id"
			:data-test-id="`${testPrefix}-projects-table`"
		>
			<template #[`item.name`]="{ item }">
				<div :class="$style.project">
					<ProjectIcon :icon="item.icon" size="small" />
					<N8nText>{{ item.name }}</N8nText>
				</div>
			</template>
			<template #[`item.approval`]="{ item }">
				<N8nSelect2
					:class="$style.inlineTrigger"
					:model-value="item.approval"
					:items="approvalOptions(item.id)"
					size="small"
					variant="ghost"
					:data-test-id="`${testPrefix}-project-approval-${item.id}`"
					@update:model-value="onApproval(item.id, $event)"
				>
					<template #item="{ item: option }">
						<N8nTooltip v-if="option.disabled" placement="top">
							<template #content>
								{{
									i18n.baseText(
										'settings.security.workflowReviews.projects.approval.setByProjectAdmin',
									)
								}}
							</template>
							<N8nSelect2Item v-bind="option" :class="$style.menuItem" />
						</N8nTooltip>
						<N8nSelect2Item v-else v-bind="option" :class="$style.menuItem" />
					</template>
				</N8nSelect2>
			</template>
			<template v-if="showReviewersColumn" #[`item.reviewers`]="{ item }">
				<N8nSelect2
					:class="$style.inlineTrigger"
					:model-value="item.reviewers"
					:items="reviewerOptions()"
					size="small"
					variant="ghost"
					:data-test-id="`${testPrefix}-project-reviewers-${item.id}`"
					@update:model-value="onReviewers(item.id, $event)"
				/>
			</template>
			<template #[`item.workflows`]="{ item }">
				<N8nText>{{ item.workflows === null ? '' : String(item.workflows) }}</N8nText>
			</template>
			<template #[`item.active`]="{ item }">
				<N8nText>{{ item.active === null ? '' : String(item.active) }}</N8nText>
			</template>
		</N8nDataTableServer>

		<N8nText v-if="rows.length === 0" size="small" color="text-light" :class="$style.empty">
			{{ emptyMessage }}
		</N8nText>
	</N8nSettingsLayout>
</template>

<style module>
/* The settings header reads this token and centers inside it. This page's table is full width, so the title uses the same width as the table. */
.page.page {
	--settings-content--max-width: none;
}

/* The select trigger is full width and pushes the chevron to the cell edge. Hug the label instead. The trigger's own gap is --spacing--4xs. */
.inlineTrigger.inlineTrigger {
	width: fit-content;
	max-width: 100%;
}

.inlineTrigger > * {
	flex: 0 0 auto;
	margin-inline-start: 0;
}

/* The menu item styles live on the select. This slot draws the same row so a disabled choice can carry a tooltip. */
.menuItem {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
	border-radius: var(--input--radius);
	display: flex;
	align-items: flex-start;
	min-height: var(--spacing--xl);
	padding: var(--spacing--2xs);
	user-select: none;
	color: var(--text-color);
	gap: var(--spacing--4xs);
	outline: none;
	width: 100%;
	pointer-events: auto;
}

.menuItem:not([data-disabled]) {
	cursor: pointer;
}

.menuItem:not([data-disabled])[data-highlighted] {
	background-color: var(--background--hover);
}

.menuItem[data-disabled] {
	color: var(--text-color--disabled);
	/* The lock icon paints with --color--text. Use the same disabled color as the label. */
	--color--text: var(--text-color--disabled);
	cursor: not-allowed;
}

.toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	margin-bottom: var(--spacing--sm);
}

/* Same width as the other settings search fields. No width token exists for it. */
.search {
	max-width: 20rem;
	flex: 1 1 auto;
}

.project {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.empty {
	display: block;
	margin-top: var(--spacing--sm);
}
</style>
