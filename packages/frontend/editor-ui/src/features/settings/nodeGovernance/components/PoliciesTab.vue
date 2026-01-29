<script lang="ts" setup>
import { ref, computed, onBeforeMount, watch, nextTick } from 'vue';
import { useToast } from '@/app/composables/useToast';
import { useMessage } from '@/app/composables/useMessage';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { storeToRefs } from 'pinia';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { ProjectSharingData } from '@/features/collaboration/projects/projects.types';
import ProjectSharing from '@/features/collaboration/projects/components/ProjectSharing.vue';

import {
	N8nActionBox,
	N8nBadge,
	N8nButton,
	N8nDataTableServer,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nLink,
	N8nOption,
	N8nPopover,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import type { TableHeader } from '@n8n/design-system/components/N8nDataTableServer';
import { useNodeGovernanceStore } from '../nodeGovernance.store';
import type { NodeGovernancePolicy } from '../nodeGovernance.api';
import { POLICY_FORM_MODAL_KEY } from '../nodeGovernance.constants';

const { showError, showMessage } = useToast();
const { confirm } = useMessage();
const i18n = useI18n();
const uiStore = useUIStore();
const nodeGovernanceStore = useNodeGovernanceStore();
const projectsStore = useProjectsStore();

const { policies, categories } = storeToRefs(nodeGovernanceStore);

const searchQuery = ref('');
const sortBy = ref<'status' | 'nameAsc' | 'nameDesc'>('status');
const filterProject = ref<string>('');
const filterStatus = ref<'all' | 'allow' | 'block'>('all');
const filterType = ref<'all' | 'node' | 'category'>('all');

// Pagination state (0-indexed for N8nDataTableServer)
const page = ref(0);
const itemsPerPage = ref(10);

// Ref for table container to enable scroll-to-top
const tableContainerRef = ref<HTMLElement | null>(null);

const headers = ref<Array<TableHeader<NodeGovernancePolicy>>>([
	{
		title: i18n.baseText('nodeGovernance.policies.table.status'),
		key: 'policyType',
		width: 100,
		disableSort: true,
		resize: false,
	},
	{
		title: i18n.baseText('nodeGovernance.policies.table.target'),
		key: 'targetValue',
		width: 300,
		disableSort: true,
		resize: false,
	},
	{
		title: i18n.baseText('nodeGovernance.policies.table.type'),
		key: 'targetType',
		width: 100,
		disableSort: true,
		resize: false,
	},
	{
		title: i18n.baseText('nodeGovernance.policies.table.scope'),
		key: 'scope',
		width: 150,
		disableSort: true,
		resize: false,
	},
	{
		title: i18n.baseText('nodeGovernance.policies.table.actions'),
		key: 'actions',
		value: () => '',
		width: 150,
		disableSort: true,
		align: 'center',
		resize: false,
	},
]);

const selectedProject = computed<ProjectSharingData | null>({
	get: () => {
		return (
			projectsStore.availableProjects.find((project) => project.id === filterProject.value) ?? null
		);
	},
	set: (value) => {
		filterProject.value = value?.id ?? '';
	},
});

const filterCount = computed(() => {
	let count = 0;
	if (filterProject.value) count++;
	if (filterStatus.value !== 'all') count++;
	if (filterType.value !== 'all') count++;
	return count;
});

const hasFilters = computed(() => filterCount.value > 0);

function getDisplayName(policy: NodeGovernancePolicy): string {
	if (policy.targetType === 'category') {
		const category = categories.value.find((c) => c.slug === policy.targetValue);
		return category?.displayName ?? policy.targetValue;
	}
	const parts = policy.targetValue.split('.');
	if (parts.length > 1) {
		const nodeName = parts[parts.length - 1];
		return (
			nodeName.charAt(0).toUpperCase() +
			nodeName
				.slice(1)
				.replace(/([A-Z])/g, ' $1')
				.trim()
		);
	}
	return policy.targetValue;
}

const filteredPolicies = computed(() => {
	let filtered = policies.value;

	// Apply search filter
	if (searchQuery.value.trim()) {
		const query = searchQuery.value.toLowerCase();
		filtered = filtered.filter(
			(p) =>
				p.targetValue.toLowerCase().includes(query) ||
				p.policyType.toLowerCase().includes(query) ||
				p.scope.toLowerCase().includes(query),
		);
	}

	// Apply project filter
	if (filterProject.value) {
		filtered = filtered.filter((p) => {
			if (p.scope === 'global') return false;
			return p.projectAssignments?.some(
				(assignment) => assignment.projectId === filterProject.value,
			);
		});
	}

	// Apply status filter
	if (filterStatus.value !== 'all') {
		filtered = filtered.filter((p) => p.policyType === filterStatus.value);
	}

	// Apply type filter
	if (filterType.value !== 'all') {
		filtered = filtered.filter((p) => p.targetType === filterType.value);
	}

	// Apply sorting
	const sorted = [...filtered].sort((a, b) => {
		switch (sortBy.value) {
			case 'status': {
				// Sort by policyType: 'block' comes before 'allow'
				if (a.policyType !== b.policyType) {
					return a.policyType === 'block' ? -1 : 1;
				}
				// Secondary sort by name for items with same status
				return getDisplayName(a).toLowerCase().localeCompare(getDisplayName(b).toLowerCase());
			}
			case 'nameAsc': {
				const nameA = getDisplayName(a).toLowerCase();
				const nameB = getDisplayName(b).toLowerCase();
				return nameA.localeCompare(nameB);
			}
			case 'nameDesc': {
				const nameA = getDisplayName(a).toLowerCase();
				const nameB = getDisplayName(b).toLowerCase();
				return nameB.localeCompare(nameA);
			}
			default:
				return 0;
		}
	});

	return sorted;
});

// Reset page to 0 when filters change
watch([searchQuery, filterProject, filterStatus, filterType], () => {
	page.value = 0;
});

// Auto-scroll to top when page changes
watch(page, () => {
	void nextTick(() => {
		const tableWrapper = tableContainerRef.value?.querySelector(
			'.n8n-data-table-server-wrapper',
		) as HTMLElement;
		if (tableWrapper) {
			tableWrapper.scrollTo({ top: 0, behavior: 'smooth' });
		}
	});
});

// Compute paginated items
const paginatedPolicies = computed(() => {
	const start = page.value * itemsPerPage.value;
	const end = start + itemsPerPage.value;
	return filteredPolicies.value.slice(start, end);
});

function resetFilters() {
	filterProject.value = '';
	filterStatus.value = 'all';
	filterType.value = 'all';
}

onBeforeMount(async () => {
	await projectsStore.getAvailableProjects();
});

function onCreatePolicy() {
	uiStore.openModalWithData({
		name: POLICY_FORM_MODAL_KEY,
		data: {},
	});
}

function onEditPolicy(policy: NodeGovernancePolicy) {
	uiStore.openModalWithData({
		name: POLICY_FORM_MODAL_KEY,
		data: { policy },
	});
}

async function onDeletePolicy(policy: NodeGovernancePolicy) {
	const confirmed = await confirm(
		i18n.baseText('nodeGovernance.policies.delete.description'),
		i18n.baseText('nodeGovernance.policies.delete.title'),
		{
			confirmButtonText: i18n.baseText('generic.delete'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		},
	);

	if (confirmed === 'confirm') {
		try {
			await nodeGovernanceStore.deletePolicy(policy.id);
			showMessage({
				title: i18n.baseText('nodeGovernance.policies.delete.success'),
				type: 'success',
			});
		} catch (e) {
			showError(e, i18n.baseText('nodeGovernance.policies.delete.error'));
		}
	}
}

function getNodeCount(policy: NodeGovernancePolicy): number {
	if (policy.targetType === 'category') {
		const category = categories.value.find((c) => c.slug === policy.targetValue);
		return category?.nodeAssignments?.length ?? 0;
	}
	return 0;
}
</script>

<template>
	<div :class="$style.policiesTab">
		<!-- Empty State -->
		<N8nActionBox
			v-if="policies.length === 0"
			:heading="i18n.baseText('nodeGovernance.policies.empty.title')"
			:description="i18n.baseText('nodeGovernance.policies.empty.description')"
			:button-text="i18n.baseText('nodeGovernance.policies.create')"
			@click:button="onCreatePolicy"
		/>

		<!-- Policies Table -->
		<template v-else>
			<div :class="$style.tableHeader">
				<div :class="$style.controls">
					<N8nInput
						v-model="searchQuery"
						:class="$style.searchInput"
						:placeholder="i18n.baseText('nodeGovernance.policies.search')"
						clearable
						data-test-id="policies-search"
					>
						<template #prefix>
							<N8nIcon icon="search" />
						</template>
					</N8nInput>
					<div :class="$style.sortAndFilter">
						<N8nSelect v-model="sortBy" :class="$style.sortSelect" data-test-id="policies-sort">
							<N8nOption
								value="status"
								:label="i18n.baseText('nodeGovernance.policies.sort.status')"
							/>
							<N8nOption
								value="nameAsc"
								:label="i18n.baseText('nodeGovernance.policies.sort.nameAsc')"
							/>
							<N8nOption
								value="nameDesc"
								:label="i18n.baseText('nodeGovernance.policies.sort.nameDesc')"
							/>
						</N8nSelect>
						<N8nPopover width="304px" :content-class="$style['popover-content']">
							<template #trigger>
								<N8nButton
									icon="funnel"
									type="tertiary"
									size="small"
									:active="hasFilters"
									:class="{
										[$style['filter-button']]: true,
										[$style['no-label']]: filterCount === 0,
									}"
									data-test-id="policies-filters-trigger"
								>
									<N8nBadge
										v-if="filterCount > 0"
										:class="$style['filter-button-count']"
										data-test-id="policies-filters-count"
										theme="primary"
									>
										{{ filterCount }}
									</N8nBadge>
								</N8nButton>
							</template>
							<template #content>
								<div :class="$style['filters-dropdown']" data-test-id="policies-filters-dropdown">
									<N8nInputLabel
										:label="i18n.baseText('nodeGovernance.policies.filters.project')"
										:bold="false"
										size="small"
										color="text-base"
										class="mb-3xs"
									/>
									<ProjectSharing
										v-model="selectedProject"
										:projects="projectsStore.availableProjects"
										:placeholder="
											i18n.baseText('nodeGovernance.policies.filters.project.placeholder')
										"
										:empty-options-text="i18n.baseText('projects.sharing.noMatchingProjects')"
									/>
									<N8nInputLabel
										:label="i18n.baseText('nodeGovernance.policies.filters.status')"
										:bold="false"
										size="small"
										color="text-base"
										class="mb-3xs mt-s"
									/>
									<N8nSelect
										v-model="filterStatus"
										size="small"
										data-test-id="policies-filter-status"
									>
										<N8nOption
											value="all"
											:label="i18n.baseText('nodeGovernance.policies.filters.status.all')"
										/>
										<N8nOption
											value="allow"
											:label="i18n.baseText('nodeGovernance.policies.filters.status.allow')"
										/>
										<N8nOption
											value="block"
											:label="i18n.baseText('nodeGovernance.policies.filters.status.block')"
										/>
									</N8nSelect>
									<N8nInputLabel
										:label="i18n.baseText('nodeGovernance.policies.filters.type')"
										:bold="false"
										size="small"
										color="text-base"
										class="mb-3xs mt-s"
									/>
									<N8nSelect v-model="filterType" size="small" data-test-id="policies-filter-type">
										<N8nOption
											value="all"
											:label="i18n.baseText('nodeGovernance.policies.filters.type.all')"
										/>
										<N8nOption
											value="node"
											:label="i18n.baseText('nodeGovernance.policies.filters.type.node')"
										/>
										<N8nOption
											value="category"
											:label="i18n.baseText('nodeGovernance.policies.filters.type.category')"
										/>
									</N8nSelect>
									<div v-if="hasFilters" :class="[$style['filters-dropdown-footer'], 'mt-s']">
										<N8nLink @click="resetFilters">
											{{ i18n.baseText('forms.resourceFiltersDropdown.reset') }}
										</N8nLink>
									</div>
								</div>
							</template>
						</N8nPopover>
					</div>
				</div>
				<N8nText size="small" color="text-light">
					{{
						i18n.baseText('nodeGovernance.policies.count', {
							interpolate: { count: filteredPolicies.length },
							adjustToNumber: filteredPolicies.length,
						})
					}}
				</N8nText>
			</div>

			<div ref="tableContainerRef">
				<N8nDataTableServer
					v-model:page="page"
					v-model:items-per-page="itemsPerPage"
					:items="paginatedPolicies"
					:headers="headers"
					:items-length="filteredPolicies.length"
					:page-sizes="[10, 25, 50]"
				>
					<template #[`item.policyType`]="{ item }">
						<N8nBadge :theme="item.policyType === 'block' ? 'danger' : 'success'">
							{{
								item.policyType === 'block'
									? i18n.baseText('nodeGovernance.policies.status.blocked')
									: i18n.baseText('nodeGovernance.policies.status.allowed')
							}}
						</N8nBadge>
					</template>
					<template #[`item.targetValue`]="{ item }">
						<div :class="$style.targetCell">
							<N8nText :bold="true">{{ getDisplayName(item) }}</N8nText>
							<N8nText size="small" color="text-light">
								<template v-if="item.targetType === 'category'">
									{{
										i18n.baseText('nodeGovernance.policies.nodeCount', {
											interpolate: { count: getNodeCount(item) },
											adjustToNumber: getNodeCount(item),
										})
									}}
								</template>
								<template v-else>
									{{ item.targetValue }}
								</template>
							</N8nText>
						</div>
					</template>
					<template #[`item.targetType`]="{ item }">
						<N8nText>
							{{
								item.targetType === 'node'
									? i18n.baseText('nodeGovernance.targetType.node')
									: i18n.baseText('nodeGovernance.targetType.category')
							}}
						</N8nText>
					</template>
					<template #[`item.scope`]="{ item }">
						<div :class="$style.scopeCell">
							<N8nBadge v-if="item.scope === 'global'" theme="primary">
								{{ i18n.baseText('nodeGovernance.scope.global') }}
							</N8nBadge>
							<template v-else>
								<N8nBadge v-for="assignment in item.projectAssignments" :key="assignment.projectId">
									{{ assignment.project?.name || assignment.projectId }}
								</N8nBadge>
							</template>
						</div>
					</template>
					<template #[`item.actions`]="{ item }">
						<div :class="$style.actions">
							<N8nButton
								type="tertiary"
								size="small"
								icon="pen"
								data-test-id="edit-policy-button"
								@click="onEditPolicy(item)"
							>
								{{ i18n.baseText('generic.edit') }}
							</N8nButton>
							<N8nButton
								type="tertiary"
								size="small"
								icon="trash"
								:class="$style.deleteBtn"
								data-test-id="delete-policy-button"
								@click="onDeletePolicy(item)"
							>
								{{ i18n.baseText('generic.delete') }}
							</N8nButton>
						</div>
					</template>
				</N8nDataTableServer>
			</div>
		</template>
	</div>
</template>

<style lang="scss" module>
.policiesTab {
	display: flex;
	flex-direction: column;
}

.tableHeader {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: var(--spacing--sm) 0;
	margin-bottom: var(--spacing--sm);
	border-bottom: 1px solid var(--color--foreground);
}

.controls {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex: 1;
}

.searchInput {
	max-width: 220px;
}

.sortAndFilter {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.sortSelect {
	width: 180px;
}

.filter-button {
	height: 30px;
	align-items: center;

	&.no-label {
		width: 30px;
		span + span {
			margin: 0;
		}
	}

	.filter-button-count {
		margin-right: var(--spacing--4xs);
	}
}

.filters-dropdown {
	width: 280px;
}

.filters-dropdown-footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.popover-content {
	padding: var(--spacing--sm);
}

.targetCell {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.scopeCell {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
}

.actions {
	display: flex;
	gap: 8px;
}

.deleteBtn {
	--button--font--color: var(--color--danger);

	&:hover {
		--button--background--color: var(--color--danger--tint-1);
	}
}
</style>
