<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useDebounceFn } from '@vueuse/core';
import type { WorkflowReviewInstanceSettingsProject } from '@n8n/api-types';
import {
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nNotice,
	N8nSelect2,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nText,
} from '@n8n/design-system';
import type { SelectOptionBase, TableOptions } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
import { DEBOUNCE_TIME } from '@n8n/frontend-constants/durations';
import { useRootStore } from '@n8n/stores/useRootStore';

import ResourceFiltersDropdown from '@/app/components/forms/ResourceFiltersDropdown.vue';
import { VIEWS } from '@/app/constants';
import { useWorkflowReviewsFeature } from '@/features/workflow-reviews/composables/useWorkflowReviewsFeature';
import {
	getWorkflowReviewInstanceSettings,
	updateWorkflowReviewInstanceSettings,
} from '@/features/workflow-reviews/workflowReviews.api';
import ReviewPolicyProjectsTable from './ReviewPolicyProjectsTable.vue';

/** Empty means no filter, so the filters dropdown counts only a set one. */
type ApprovalFilter = '' | 'required' | 'notRequired';

const FILTER_KEYS = ['approval'];
const PAGE_SIZE = 10;

const i18n = useI18n();
const router = useRouter();
const rootStore = useRootStore();
const { showToast, showError } = useToast();
const { isInstanceApprovalRequired } = useWorkflowReviewsFeature();

const projects = ref<WorkflowReviewInstanceSettingsProject[]>([]);
const count = ref(0);
const managedByEnv = ref(false);
const loading = ref(true);
const loadFailed = ref(false);
const savingIds = ref<ReadonlySet<string>>(new Set());

const search = ref('');
const filters = ref<{ approval: ApprovalFilter }>({ approval: '' });
const tableOptions = ref<TableOptions>({ page: 0, itemsPerPage: PAGE_SIZE, sortBy: [] });
/** Whether the shown page was loaded with a search term or a filter. */
const loadedFiltered = ref(false);

const approvalFilterOptions = computed<Array<SelectOptionBase<ApprovalFilter>>>(() => [
	{
		value: 'notRequired',
		label: i18n.baseText('settings.reviewPolicy.projects.option.notRequired'),
		icon: 'lock-unlocked',
	},
	{
		value: 'required',
		label: i18n.baseText('settings.reviewPolicy.projects.option.required'),
		icon: 'lock',
	},
]);

const lockedReason = computed(() =>
	isInstanceApprovalRequired.value
		? i18n.baseText('settings.security.workflowReviews.instanceSettings.lockedByAlwaysRequired', {
				interpolate: {
					option: i18n.baseText('settings.security.workflowReviews.requireApproval.option.always'),
				},
			})
		: undefined,
);

function requiredByInstanceQuery(approval: ApprovalFilter): { requiredByInstance?: boolean } {
	return approval === '' ? {} : { requiredByInstance: approval === 'required' };
}

// Only the newest load updates the page, so a slow earlier search cannot win.
const { next: nextLoad } = useLatestFetch();

/**
 * `keepRowsOnError` is only for a reload with the query of the rows on screen (after a save).
 * A failed page, search or filter change must not keep rows of another query.
 */
async function load({ keepRowsOnError = false } = {}) {
	const isLatest = nextLoad();
	const { page = 0, itemsPerPage = PAGE_SIZE } = tableOptions.value;
	const term = search.value.trim();
	loading.value = true;
	try {
		const result = await getWorkflowReviewInstanceSettings(rootStore.restApiContext, {
			skip: page * itemsPerPage,
			take: itemsPerPage,
			...(term ? { search: term } : {}),
			...requiredByInstanceQuery(filters.value.approval),
		});
		if (!isLatest()) return;
		// A save under a filter can leave the page past the end.
		const lastPage = Math.max(0, Math.ceil(result.count / itemsPerPage) - 1);
		if (page > lastPage) {
			tableOptions.value = { ...tableOptions.value, page: lastPage };
			await load();
			return;
		}
		projects.value = result.data;
		count.value = result.count;
		managedByEnv.value = result.managedByEnv;
		loadedFiltered.value = term !== '' || filters.value.approval !== '';
		loadFailed.value = false;
	} catch (error) {
		if (!isLatest()) return;
		if (keepRowsOnError) {
			showError(
				error,
				i18n.baseText('settings.security.workflowReviews.instanceSettings.loadError'),
			);
		} else {
			loadFailed.value = true;
		}
	} finally {
		if (isLatest()) loading.value = false;
	}
}

async function onOptionsUpdate(options: TableOptions) {
	tableOptions.value = options;
	await load();
}

/** A new search or filter starts at the first page. */
async function resetPage() {
	tableOptions.value = { ...tableOptions.value, page: 0 };
	await load();
}

const onSearch = useDebounceFn(resetPage, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));

async function onApprovalFilter(value: unknown) {
	filters.value = {
		approval: value === 'required' || value === 'notRequired' ? value : '',
	};
	await resetPage();
}

async function resetFilters() {
	filters.value = { approval: '' };
	await resetPage();
}

function setRequiredByInstance(projectId: string, requiredByInstance: boolean) {
	projects.value = projects.value.map((project) =>
		project.id === projectId ? { ...project, requiredByInstance } : project,
	);
}

function setSaving(projectId: string, saving: boolean) {
	const next = new Set(savingIds.value);
	if (saving) next.add(projectId);
	else next.delete(projectId);
	savingIds.value = next;
}

async function onRequired(projectId: string, required: boolean) {
	const previous = projects.value.find((project) => project.id === projectId)?.requiredByInstance;
	if (previous === undefined) return;

	setRequiredByInstance(projectId, required);
	setSaving(projectId, true);
	try {
		const response = await updateWorkflowReviewInstanceSettings(
			rootStore.restApiContext,
			projectId,
			{
				requiredByInstance: required,
			},
		);
		setRequiredByInstance(projectId, response.requiredByInstance);
		// The reload drops an older list request, and the saved row can leave the filter.
		void load({ keepRowsOnError: true });
		showToast({
			type: 'success',
			title: i18n.baseText('settings.security.workflowReviews.requireApproval.success'),
			message: '',
		});
	} catch (error) {
		setRequiredByInstance(projectId, previous);
		showError(error, i18n.baseText('settings.security.workflowReviews.error'));
	} finally {
		setSaving(projectId, false);
	}
}

function goBack() {
	void router.push({ name: VIEWS.SECURITY_SETTINGS });
}

onMounted(load);
</script>

<template>
	<N8nSettingsLayout
		:class="$style.layout"
		full-width
		show-back
		:back-label="i18n.baseText('settings.security')"
		data-test-id="workflow-review-instance-settings-view"
		@back="goBack"
	>
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.security.workflowReviews.instanceSettings.page.title')"
			:description="
				i18n.baseText('settings.security.workflowReviews.instanceSettings.page.description')
			"
			:show-docs-link="false"
		/>

		<N8nNotice
			v-if="managedByEnv"
			:content="i18n.baseText('settings.security.managedByEnv')"
			data-test-id="workflow-review-instance-settings-managed-by-env-notice"
		/>

		<div :class="$style.toolbar">
			<N8nInput
				v-model="search"
				:class="$style.search"
				:placeholder="i18n.baseText('settings.security.workflowReviews.instanceSettings.search')"
				clearable
				data-test-id="workflow-review-instance-settings-search"
				@update:model-value="onSearch"
			>
				<template #prefix>
					<N8nIcon icon="search" />
				</template>
			</N8nInput>
			<ResourceFiltersDropdown
				:model-value="filters"
				:keys="FILTER_KEYS"
				:reset="resetFilters"
				:shareable="false"
				just-icon
			>
				<div :class="$style.filter">
					<N8nInputLabel
						:label="i18n.baseText('settings.reviewPolicy.projects.column.approval')"
						:bold="false"
						size="small"
						color="text-base"
					/>
					<N8nSelect2
						:model-value="filters.approval || undefined"
						:items="approvalFilterOptions"
						size="medium"
						clearable
						:placeholder="
							i18n.baseText('settings.security.workflowReviews.instanceSettings.filter.all')
						"
						data-test-id="workflow-review-instance-settings-filter-approval"
						@update:model-value="onApprovalFilter"
					/>
				</div>
			</ResourceFiltersDropdown>
		</div>

		<N8nText
			v-if="loadFailed"
			color="text-light"
			data-test-id="workflow-review-instance-settings-load-error"
		>
			{{ i18n.baseText('settings.security.workflowReviews.instanceSettings.loadError') }}
		</N8nText>
		<template v-else>
			<ReviewPolicyProjectsTable
				v-model:table-options="tableOptions"
				:projects="projects"
				:items-length="count"
				:loading="loading"
				:read-only="managedByEnv"
				:locked-reason="lockedReason"
				:saving-ids="savingIds"
				@update:options="onOptionsUpdate"
				@update:required="onRequired"
			>
				<template v-if="!loading && count === 0" #empty>
					<N8nText color="text-light" data-test-id="workflow-review-instance-settings-empty">
						{{
							i18n.baseText(
								loadedFiltered
									? 'settings.security.workflowReviews.instanceSettings.noMatch'
									: 'settings.security.workflowReviews.instanceSettings.empty',
							)
						}}
					</N8nText>
				</template>
			</ReviewPolicyProjectsTable>
		</template>
	</N8nSettingsLayout>
</template>

<style module>
.layout {
	padding: 0;

	header {
		margin-inline: 0 auto;
	}
}

.toolbar {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	width: 100%;
	min-width: 0;
}

/* Same width as the other settings search fields. No width token exists for it.
   It shrinks on narrow pages, so the filter button stays inside the toolbar. */
.search {
	flex: 1 1 auto;
	min-width: 0;
	max-width: 20rem;
}

.filter {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}
</style>
