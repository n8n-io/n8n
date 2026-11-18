<script setup lang="ts">
import { computed, reactive, ref, useTemplateRef, watch } from 'vue';
import { RouterLink } from 'vue-router';
import {
	N8nBadge,
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogDescription,
	N8nDialogFooter,
	N8nEmptyState,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nInputNumber,
	N8nOption,
	N8nPagination,
	N8nSelect,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';
import { formatNumber } from '@/features/projectSettingsPrototype/data/time';
import type { Project } from '@/features/projectSettingsPrototype/data/types';
import { settingsEntry } from '@/features/projectSettingsPrototype/nav/model';
import { panelOpen, protoParams } from '@/features/projectSettingsPrototype/params';
import { useCan } from '@/features/projectSettingsPrototype/state/session';
import {
	SCALING_LABELS,
	membersOf,
	projectOverrides,
	projectState,
	projects,
	setProjectLimits,
	store,
} from '@/features/projectSettingsPrototype/state/store';

/**
 * Settings › Projects: every team project on the instance, the settings each
 * one sets for itself, and its executions against the limit an admin gave it.
 *
 * The list can be 4, 40, or 400 long. Only the visible page reads a project's
 * state, unless a filter needs to look at every project.
 */

type ProjectFilter = 'all' | 'own-settings' | 'has-limit';

const FILTERS: Array<{ value: ProjectFilter; label: string }> = [
	{ value: 'all', label: 'All projects' },
	{ value: 'own-settings', label: 'Sets its own settings' },
	{ value: 'has-limit', label: 'Has an execution limit' },
];

const PAGE_SIZE = 25;
/** The settings a row names before the rest collapse into "+N". */
const BADGES_SHOWN = 2;

const can = useCan();
const toast = useToast();

const canEdit = computed(() => can('instance:settings:edit'));

/* ── Search, filter, pages ────────────────────────────────────────────── */

const search = ref('');
const filter = ref<ProjectFilter>('all');
const page = ref(1);
const listTop = useTemplateRef<HTMLElement>('listTop');

const hasFilters = computed(() => search.value.trim() !== '' || filter.value !== 'all');

const filtered = computed(() => {
	const query = search.value.trim().toLowerCase();
	return projects.value.filter((project) => {
		if (query && !project.name.toLowerCase().includes(query)) return false;
		if (filter.value === 'own-settings') return projectOverrides(project.id).length > 0;
		if (filter.value === 'has-limit') {
			return projectState(project.id).limits.monthlyExecutions !== null;
		}
		return true;
	});
});

const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)));

watch([search, filter], () => {
	page.value = 1;
});

// A filtered list can shrink under the current page, for example when a limit is removed.
watch(pageCount, (count) => {
	if (page.value > count) page.value = count;
});

const pageStart = computed(() => (page.value - 1) * PAGE_SIZE);

const noun = (count: number) => (count === 1 ? 'project' : 'projects');

const countLabel = computed(() => {
	const total = projects.value.length;
	const shown = filtered.value.length;
	return shown === total
		? `${formatNumber(total)} ${noun(total)}`
		: `${formatNumber(shown)} of ${formatNumber(total)} ${noun(total)}`;
});

const rangeLabel = computed(() => {
	const total = filtered.value.length;
	const first = pageStart.value + 1;
	const last = Math.min(pageStart.value + PAGE_SIZE, total);
	return `${formatNumber(first)}-${formatNumber(last)} of ${formatNumber(total)}`;
});

function clearFilters() {
	search.value = '';
	filter.value = 'all';
}

function goToPage(next: number) {
	page.value = next;
	listTop.value?.scrollIntoView({ block: 'nearest' });
}

function openParamsPanel() {
	panelOpen.value = true;
}

/* ── Rows ─────────────────────────────────────────────────────────────── */

interface Row {
	project: Project;
	/** Where the project's settings open, under the current parameters. */
	to: string;
	members: number;
	ownSettings: string[];
	moreSettings: string[];
	used: number;
	limit: number | null;
	/** Whole percent of the monthly limit used. 0 without a limit. */
	percent: number;
	/** At or past the share of a limit that alerts instance admins. */
	atAlert: boolean;
}

function settingsPath(projectId: string): string {
	if (protoParams.variant === 'in-settings') return `/settings/projects/${projectId}/general`;
	return settingsEntry(projectId, protoParams) ?? `/projects/${projectId}/workflows`;
}

function toRow(project: Project): Row {
	const state = projectState(project.id);
	const labels = projectOverrides(project.id).map((key) => SCALING_LABELS[key]);
	const used = state.usage.executionsThisMonth;
	const limit = state.limits.monthlyExecutions;
	const share = limit === null ? 0 : (used / Math.max(limit, 1)) * 100;
	const alertAt = store.instance.limits.alertAtPercent;

	return {
		project,
		to: settingsPath(project.id),
		members: membersOf(project.id).length,
		ownSettings: labels.slice(0, BADGES_SHOWN),
		moreSettings: labels.slice(BADGES_SHOWN),
		used,
		limit,
		percent: Math.floor(share),
		atAlert: limit !== null && alertAt !== null && share >= alertAt,
	};
}

/** Only the visible page: at most 25 projects have their state read per render. */
const rows = computed(() =>
	filtered.value.slice(pageStart.value, pageStart.value + PAGE_SIZE).map(toRow),
);

const alertHint = (row: Row) =>
	`${formatNumber(row.percent)}% of the monthly limit used. Instance admins get an email at ${store.instance.limits.alertAtPercent ?? 0}%.`;

/* ── Edit limits ──────────────────────────────────────────────────────── */

const limitsOpen = ref(false);
/** Kept after the dialog closes, so its title doesn't change while it fades out. */
const editing = ref<Project | null>(null);

const form = reactive<{ monthlyExecutions: number | null; concurrency: number | null }>({
	monthlyExecutions: null,
	concurrency: null,
});

/** An emptied number field reports `undefined`. The store's "no limit" is `null`. */
const toLimit = (value: number | null | undefined): number | null =>
	typeof value === 'number' && Number.isFinite(value) ? value : null;

const monthlyHint = computed(() => {
	const limit = store.instance.limits.monthlyExecutions;
	return limit === null
		? 'Leave empty for no project limit. The instance has no monthly limit.'
		: `Leave empty for no project limit. The project then shares the instance-wide limit of ${formatNumber(limit)} executions per month.`;
});

const concurrencyHint = computed(() => {
	const limit = store.instance.limits.concurrency;
	return limit === null
		? 'Leave empty to follow the instance, which has no concurrency limit.'
		: `Leave empty to follow the instance, which runs up to ${formatNumber(limit)} executions at once.`;
});

function openLimits(project: Project) {
	const { limits } = projectState(project.id);
	editing.value = project;
	form.monthlyExecutions = limits.monthlyExecutions;
	form.concurrency = limits.concurrency;
	limitsOpen.value = true;
}

function saveLimits() {
	const project = editing.value;
	if (!project || !canEdit.value) return;
	setProjectLimits(project.id, {
		monthlyExecutions: form.monthlyExecutions,
		concurrency: form.concurrency,
	});
	limitsOpen.value = false;
	toast.showMessage({ title: 'Limits saved', type: 'success' });
}
</script>

<template>
	<N8nSettingsLayout full-width data-test-id="proto-instance-projects-page">
		<N8nSettingsPageHeader
			title="Projects"
			description="Every team project on this instance, and the settings each one sets for itself."
			:show-docs-link="false"
		/>

		<N8nEmptyState
			v-if="projects.length === 0"
			:icon="{ type: 'icon', value: 'layers' }"
			heading="No team projects yet"
			description="Team projects on this instance show up here. To create sample projects, open the prototype parameters panel with Alt+P."
			button-text="Open parameters panel"
			button-variant="outline"
			data-test-id="proto-instance-projects-empty"
			@click:button="openParamsPanel"
		/>

		<div v-else :class="$style.body">
			<div ref="listTop" :class="$style.toolbar">
				<N8nInput
					v-model="search"
					:class="$style.search"
					size="medium"
					clearable
					placeholder="Search by project name"
					aria-label="Search projects"
					data-test-id="proto-instance-projects-search"
				>
					<template #prefix>
						<N8nIcon icon="search" />
					</template>
				</N8nInput>

				<N8nSelect
					v-model="filter"
					:class="$style.filter"
					size="medium"
					aria-label="Filter projects"
					data-test-id="proto-instance-projects-filter"
				>
					<N8nOption
						v-for="option in FILTERS"
						:key="option.value"
						:value="option.value"
						:label="option.label"
					/>
				</N8nSelect>

				<N8nText
					:class="$style.count"
					size="small"
					color="text-light"
					role="status"
					data-test-id="proto-instance-projects-count"
				>
					{{ countLabel }}
				</N8nText>
			</div>

			<div :class="$style.tableWrap">
				<table
					v-if="rows.length > 0"
					:class="$style.table"
					data-test-id="proto-instance-projects-table"
				>
					<colgroup>
						<col :class="$style.colProject" />
						<col :class="$style.colMembers" />
						<col :class="$style.colSettings" />
						<col :class="$style.colExecutions" />
						<col :class="$style.colActions" />
					</colgroup>
					<thead>
						<tr>
							<th scope="col">Project</th>
							<th scope="col">Members</th>
							<th scope="col">Own settings</th>
							<th scope="col">Executions this month</th>
							<th scope="col"><span :class="$style.srOnly">Actions</span></th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="row in rows"
							:key="row.project.id"
							:data-project-id="row.project.id"
							data-test-id="proto-instance-projects-row"
						>
							<td>
								<div :class="$style.project">
									<ProjectIcon :icon="row.project.icon" size="small" :class="$style.projectIcon" />
									<div :class="$style.projectText">
										<RouterLink
											:to="row.to"
											:class="$style.projectName"
											:title="row.project.name"
											data-test-id="proto-instance-projects-name"
										>
											{{ row.project.name }}
										</RouterLink>
										<span
											v-if="row.project.description"
											:class="$style.projectDescription"
											:title="row.project.description"
										>
											{{ row.project.description }}
										</span>
									</div>
								</div>
							</td>

							<td :class="$style.number">{{ formatNumber(row.members) }}</td>

							<td>
								<div v-if="row.ownSettings.length > 0" :class="$style.badges">
									<N8nBadge
										v-for="label in row.ownSettings"
										:key="label"
										variant="subtle"
										size="xsmall"
									>
										{{ label }}
									</N8nBadge>
									<N8nTooltip
										v-if="row.moreSettings.length > 0"
										:content="row.moreSettings.join(', ')"
										placement="top"
									>
										<N8nBadge
											variant="subtle"
											size="xsmall"
											data-test-id="proto-instance-projects-more-settings"
										>
											+{{ row.moreSettings.length }}
										</N8nBadge>
									</N8nTooltip>
								</div>
								<span v-else :class="$style.subtle">Follows instance</span>
							</td>

							<td>
								<div v-if="row.limit !== null" :class="$style.usage">
									<span :class="[$style.usageText, { [$style.warning]: row.atAlert }]">
										<N8nTooltip v-if="row.atAlert" :content="alertHint(row)" placement="top">
											<N8nIcon icon="triangle-alert" size="small" :class="$style.usageIcon" />
										</N8nTooltip>
										{{ formatNumber(row.used) }} of {{ formatNumber(row.limit) }}
									</span>
									<progress
										:class="[$style.progress, { [$style.progressWarning]: row.atAlert }]"
										:value="Math.min(row.used, row.limit)"
										:max="Math.max(row.limit, 1)"
										:aria-label="`${row.percent}% of the monthly limit used`"
									/>
								</div>
								<div v-else :class="$style.usage">
									<span :class="$style.usageText">{{ formatNumber(row.used) }}</span>
									<span :class="$style.subtle">No project limit</span>
								</div>
							</td>

							<td>
								<div :class="$style.actions">
									<N8nButton
										v-if="canEdit"
										variant="outline"
										size="small"
										:aria-label="`Edit limits for ${row.project.name}`"
										data-test-id="proto-instance-projects-edit-limits"
										@click="openLimits(row.project)"
									>
										Edit limits
									</N8nButton>
									<RouterLink
										:to="row.to"
										:class="$style.link"
										:aria-label="`Open settings for ${row.project.name}`"
										data-test-id="proto-instance-projects-open-settings"
									>
										Open settings
									</RouterLink>
								</div>
							</td>
						</tr>
					</tbody>
				</table>

				<div v-else :class="$style.empty" data-test-id="proto-instance-projects-no-results">
					<N8nIcon icon="search" size="xlarge" color="text-light" />
					<N8nText tag="p" bold color="text-dark">No matching projects</N8nText>
					<N8nText tag="p" size="small" color="text-light">
						Try another name, or clear the search and filter.
					</N8nText>
					<N8nButton
						v-if="hasFilters"
						variant="outline"
						size="small"
						:class="$style.emptyAction"
						data-test-id="proto-instance-projects-clear-filters"
						@click="clearFilters"
					>
						Clear filters
					</N8nButton>
				</div>
			</div>

			<div v-if="filtered.length > PAGE_SIZE" :class="$style.footer">
				<N8nText size="small" color="text-light" data-test-id="proto-instance-projects-range">
					{{ rangeLabel }}
				</N8nText>
				<N8nPagination
					:page="page"
					:total="filtered.length"
					:items-per-page="PAGE_SIZE"
					:show-total="false"
					:show-sizes="false"
					size="small"
					@update:page="goToPage"
				/>
			</div>

			<N8nDialog
				:open="limitsOpen"
				size="medium"
				:header="`Edit limits for ${editing?.name ?? 'project'}`"
				data-test-id="proto-instance-projects-limits-dialog"
				@update:open="limitsOpen = $event"
			>
				<N8nDialogBody>
					<N8nDialogDescription>
						Instance admins set these. The project can see its limits, but can't change them.
					</N8nDialogDescription>
					<form id="proto-project-limits-form" :class="$style.form" @submit.prevent="saveLimits">
						<div :class="$style.field">
							<N8nInputLabel label="Monthly executions" input-name="proto-limit-monthly">
								<N8nInputNumber
									id="proto-limit-monthly"
									:model-value="form.monthlyExecutions"
									:min="1"
									:precision="0"
									:controls="false"
									use-grouping
									placeholder="No project limit"
									data-test-id="proto-instance-projects-limit-monthly"
									@update:model-value="form.monthlyExecutions = toLimit($event)"
								/>
							</N8nInputLabel>
							<N8nText size="small" color="text-light">{{ monthlyHint }}</N8nText>
						</div>

						<div :class="$style.field">
							<N8nInputLabel label="Concurrency" input-name="proto-limit-concurrency">
								<N8nInputNumber
									id="proto-limit-concurrency"
									:model-value="form.concurrency"
									:min="1"
									:precision="0"
									:controls="false"
									use-grouping
									placeholder="Follows the instance"
									data-test-id="proto-instance-projects-limit-concurrency"
									@update:model-value="form.concurrency = toLimit($event)"
								/>
							</N8nInputLabel>
							<N8nText size="small" color="text-light">{{ concurrencyHint }}</N8nText>
						</div>
					</form>
				</N8nDialogBody>
				<N8nDialogFooter>
					<N8nButton
						variant="outline"
						data-test-id="proto-instance-projects-limits-cancel"
						@click="limitsOpen = false"
					>
						Cancel
					</N8nButton>
					<N8nButton
						type="submit"
						form="proto-project-limits-form"
						data-test-id="proto-instance-projects-limits-save"
					>
						Save
					</N8nButton>
				</N8nDialogFooter>
			</N8nDialog>
		</div>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/focus';

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
	min-width: 0;
}

.toolbar {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--xs);
}

.search {
	flex: 0 1 18rem;
	min-width: 12rem;
}

.filter {
	flex: 0 0 14rem;
	width: 14rem;
}

.count {
	margin-inline-start: auto;
	white-space: nowrap;
}

/* ── Table ── */

.tableWrap {
	border: var(--border);
	border-radius: var(--radius--md);
	background-color: var(--background--surface);
	overflow-x: auto;
}

.table {
	width: 100%;
	min-width: 60rem;
	border-collapse: collapse;
	table-layout: fixed;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
	color: var(--text-color);

	th {
		padding: var(--spacing--2xs) var(--spacing--sm);
		border-bottom: var(--border);
		background-color: var(--background--subtle);
		color: var(--text-color--subtle);
		font-size: var(--font-size--2xs);
		font-weight: var(--font-weight--medium);
		text-align: start;
		white-space: nowrap;
	}

	td {
		padding: var(--spacing--xs) var(--spacing--sm);
		border-bottom: var(--border);
		vertical-align: middle;
	}

	tbody tr:last-child td {
		border-bottom: none;
	}

	tbody tr:hover {
		background-color: var(--background--hover);
	}
}

.colProject {
	width: 30%;
}

.colMembers {
	width: 6rem;
}

.colSettings {
	width: 30%;
}

.colExecutions {
	width: 13rem;
}

.colActions {
	width: 15rem;
}

.srOnly {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
}

.subtle {
	color: var(--text-color--subtle);
	font-size: var(--font-size--xs);
}

.number {
	font-variant-numeric: tabular-nums;
}

/* ── Project cell ── */

.project {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	min-width: 0;
}

.projectIcon {
	flex-shrink: 0;
}

.projectText {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.projectName {
	align-self: flex-start;
	max-width: 100%;
	overflow: hidden;
	color: var(--text-color);
	font-weight: var(--font-weight--medium);
	text-decoration: none;
	text-overflow: ellipsis;
	white-space: nowrap;
	border-radius: var(--radius--4xs);

	&:hover {
		text-decoration: underline;
	}

	@include focus.focus-visible-ring-offset;
}

.projectDescription {
	overflow: hidden;
	color: var(--text-color--subtle);
	font-size: var(--font-size--xs);
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* ── Own settings ── */

.badges {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--4xs);
}

/* ── Executions ── */

.usage {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.usageText {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-variant-numeric: tabular-nums;
}

.usageIcon {
	display: block;
}

.warning {
	color: var(--text-color--warning);
}

.progress {
	--progress--color--track: var(--background--active);
	--progress--color--fill: var(--icon-color--strong);

	display: block;
	width: 100%;
	height: var(--spacing--4xs);
	overflow: hidden;
	appearance: none;
	border: none;
	border-radius: var(--radius--full);
	background-color: var(--progress--color--track);

	&::-webkit-progress-bar {
		background-color: var(--progress--color--track);
	}

	&::-webkit-progress-value {
		border-radius: var(--radius--full);
		background-color: var(--progress--color--fill);
	}

	&::-moz-progress-bar {
		border-radius: var(--radius--full);
		background-color: var(--progress--color--fill);
	}
}

.progressWarning {
	--progress--color--fill: var(--icon-color--warning);
}

/* ── Row actions ── */

.actions {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: var(--spacing--sm);
	white-space: nowrap;
}

.link {
	color: var(--text-color);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
	text-decoration: underline;
	text-decoration-color: var(--border-color--stronger);
	text-underline-offset: var(--spacing--5xs);
	border-radius: var(--radius--4xs);

	&:hover {
		text-decoration-color: currentColor;
	}

	@include focus.focus-visible-ring-offset;
}

/* ── No matches ── */

.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--2xl) var(--spacing--lg);
	text-align: center;

	p {
		margin: 0;
	}
}

.emptyAction {
	margin-block-start: var(--spacing--xs);
}

/* ── Pages ── */

.footer {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
}

/* ── Edit limits ── */

.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}
</style>
