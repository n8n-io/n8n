<script lang="ts" setup>
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useI18n } from '@n8n/i18n';
import { useMessage } from '@/composables/useMessage';
import { useTelemetry } from '@/composables/useTelemetry';
import { useToast } from '@/composables/useToast';
import { useSettingsStore } from '@/stores/settings.store';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { computed, onMounted, ref, useTemplateRef } from 'vue';
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router';

import ResourcesListLayout from '@/components/layouts/ResourcesListLayout.vue';
import type { BaseFilters, Resource, VariableResource, DatatableColumn } from '@/Interface';

import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';
import { EnterpriseEditionFeature, MODAL_CONFIRM } from '@/constants';
import { VARIABLE_MODAL_KEY } from '@/features/settings/environments.ee/environments.constants';
import { getResourcePermissions } from '@n8n/permissions';
import {
	N8nActionBox,
	N8nBadge,
	N8nButton,
	N8nCheckbox,
	N8nIcon,
	N8nInputLabel,
	N8nLink,
	N8nOption,
	N8nSelect,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useAsyncState } from '@vueuse/core';
import pickBy from 'lodash/pickBy';
import type { ComponentExposed } from 'vue-component-type-helpers';
import { useInsightsStore } from '@/features/execution/insights/insights.store';
import InsightsSummary from '@/features/execution/insights/components/InsightsSummary.vue';
import { useEnvironmentsStore } from '@/features/settings/environments.ee/environments.store';
import type { EnvironmentVariable } from '@/features/settings/environments.ee/environments.types';
import VariablesUsageBadge from '@/features/settings/environments.ee/components/VariablesUsageBadge.vue';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useProjectPages } from '@/features/collaboration/projects/composables/useProjectPages';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import ProjectHeader from '@/features/collaboration/projects/components/ProjectHeader.vue';
import { isVariableResource } from '@/utils/typeGuards';
import type { IconOrEmoji } from '@n8n/design-system/components/N8nIconPicker/types';

const settingsStore = useSettingsStore();
const environmentsStore = useEnvironmentsStore();
const usersStore = useUsersStore();
const uiStore = useUIStore();
const telemetry = useTelemetry();
const i18n = useI18n();
const message = useMessage();
const sourceControlStore = useSourceControlStore();
const route = useRoute();
const router = useRouter();
const insightsStore = useInsightsStore();
const overview = useProjectPages();
const projectsStore = useProjectsStore();

const layoutRef = useTemplateRef<ComponentExposed<typeof ResourcesListLayout>>('layoutRef');

const { showError, showMessage } = useToast();

const projectId = route.params.projectId;

const globalPermissions = computed(
	() => getResourcePermissions(usersStore.currentUser?.globalScopes).variable,
);
const projectPermissions = computed(
	() => getResourcePermissions(projectsStore.currentProject?.scopes).projectVariable,
);

const { isLoading, execute } = useAsyncState(environmentsStore.fetchAllVariables, [], {
	immediate: true,
});

const isFeatureEnabled = computed(
	() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Variables],
);

const openCreateVariableModal = () => {
	uiStore.openModalWithData({ name: VARIABLE_MODAL_KEY, data: { mode: 'new' } });
	telemetry.track('User clicked add variable button');
};

const openEditVariableModal = (variable: EnvironmentVariable) => {
	uiStore.openModalWithData({ name: VARIABLE_MODAL_KEY, data: { mode: 'edit', variable } });
};

const variables = computed<VariableResource[]>(() =>
	environmentsStore.variables
		.filter((v) => !projectId || v.project?.id === projectId)
		.map(
			(variable) =>
				({
					resourceType: 'variable',
					id: variable.id,
					name: variable.key,
					key: variable.key,
					value: variable.value,
					project: variable.project,
				}) as VariableResource,
		),
);

const globalVariables = computed(() => environmentsStore.variables.filter((v) => !v.project));

const canCreateVariables = computed(
	() =>
		isFeatureEnabled.value && (globalPermissions.value.create ?? projectPermissions.value.create),
);

const columns = computed(() => {
	const cols: DatatableColumn[] = [
		{
			id: 0,
			path: 'name',
			label: i18n.baseText('variables.table.key'),
			classes: ['variables-key-column'],
		},
		{
			id: 1,
			path: 'value',
			label: i18n.baseText('variables.table.value'),
			classes: ['variables-value-column'],
		},
		{
			id: 2,
			path: 'usage',
			label: i18n.baseText('variables.table.usage'),
			classes: ['variables-usage-column'],
		},
	];

	if (!projectId) {
		cols.push({
			id: 3,
			path: 'project',
			label: i18n.baseText('variables.table.scope'),
			classes: ['variables-scope-column'],
		});
	}

	if (!isFeatureEnabled.value) return cols;

	return cols.concat({ id: 4, path: 'actions', label: '', classes: ['variables-actions-column'] });
});

const handleDeleteVariable = async (variable: EnvironmentVariable) => {
	try {
		const confirmed = await message.confirm(
			i18n.baseText('variables.modals.deleteConfirm.message', {
				interpolate: { name: variable.key },
			}),
			i18n.baseText('variables.modals.deleteConfirm.title'),
			{
				confirmButtonText: i18n.baseText('variables.modals.deleteConfirm.confirmButton'),
				cancelButtonText: i18n.baseText('variables.modals.deleteConfirm.cancelButton'),
			},
		);

		if (confirmed !== MODAL_CONFIRM) {
			return;
		}

		await environmentsStore.deleteVariable({
			id: variable.id,
			value: variable.value,
			key: variable.key,
		});
		showMessage({
			title: i18n.baseText('variables.delete.successful.message', {
				interpolate: { variableName: variable.key },
			}),
			type: 'success',
		});
	} catch (error) {
		showError(error, i18n.baseText('variables.errors.delete'));
	}
};

type Filters = BaseFilters & { incomplete?: boolean; projectId: string };
const updateFilter = (state: BaseFilters) => {
	void router.replace({ query: pickBy(state) as LocationQueryRaw });
};
const filters = ref<Filters>({
	...route.query,
	incomplete: route.query.incomplete?.toString() === 'true',
	projectId: route.query.projectId?.toString() || '',
} as Filters);

const onSearchUpdated = (search: string) => {
	updateFilter({ ...filters.value, search });
};

const handleFilter = (resource: Resource, newFilters: BaseFilters, matches: boolean): boolean => {
	if (!isVariableResource(resource)) return false;
	const filtersToApply = newFilters as Filters;

	if (filtersToApply.incomplete) {
		matches = matches && !resource.value;
	}

	if (filtersToApply.projectId) {
		if (filtersToApply.projectId === 'global') {
			matches = matches && !resource.project;
		} else {
			matches = matches && resource.project?.id === filtersToApply.projectId;
		}
	}

	return matches;
};

const nameSortFn = (a: Resource, b: Resource, direction: 'asc' | 'desc') => {
	return direction === 'asc'
		? displayName(a).trim().localeCompare(displayName(b).trim())
		: displayName(b).trim().localeCompare(displayName(a).trim());
};
const sortFns = {
	nameAsc: (a: Resource, b: Resource) => nameSortFn(a, b, 'asc'),
	nameDesc: (a: Resource, b: Resource) => nameSortFn(a, b, 'desc'),
};

const projectOptions = computed<Array<{ value: string; label: string; icon: IconOrEmoji }>>(() => {
	const options: Array<{
		value: string;
		label: string;
		icon: IconOrEmoji;
	}> = [
		{
			value: 'global',
			label: i18n.baseText('variables.modal.scope.global'),
			icon: { type: 'icon', value: 'database' },
		},
	];

	options.push(
		...projectsStore.availableProjects
			.filter((project) => project.type !== 'personal')
			.map((project) => {
				const icon = (project.icon ?? {
					type: 'icon' as const,
					value: 'layer-group',
				}) as IconOrEmoji;
				return {
					value: project.id,
					label: project.name ?? project.id,
					icon,
				};
			}),
	);

	return options;
});

const selectedProjectIcon = computed<IconOrEmoji>(() => {
	const selectedOption = projectOptions.value.find(
		(option) => option.value === filters.value.projectId,
	);
	return selectedOption?.icon ?? { type: 'icon' as const, value: 'database' };
});

function goToUpgrade() {
	void usePageRedirectionHelper().goToUpgrade('variables', 'upgrade-variables');
}

function displayName(resource: Resource) {
	return (resource as EnvironmentVariable).key;
}

sourceControlStore.$onAction(({ name, after }) => {
	if (name === 'pullWorkfolder' && after) {
		after(() => {
			void execute();
		});
	}
});

const unavailableNoticeProps = computed(() => ({
	emoji: '👋',
	heading: i18n.baseText(uiStore.contextBasedTranslationKeys.variables.unavailable.title),
	description: i18n.baseText(uiStore.contextBasedTranslationKeys.variables.unavailable.description),
	buttonText: i18n.baseText(uiStore.contextBasedTranslationKeys.variables.unavailable.button),
	buttonType: 'secondary' as const,
	'onClick:button': goToUpgrade,
	'data-test-id': 'unavailable-resources-list',
}));

onMounted(() => {
	useDocumentTitle().set(i18n.baseText('variables.heading'));
});
</script>

<template>
	<ResourcesListLayout
		ref="layoutRef"
		v-model:filters="filters"
		resource-key="variables"
		:disabled="!isFeatureEnabled"
		:resources="variables"
		:additional-filters-handler="handleFilter"
		:shareable="false"
		:display-name="displayName"
		:sort-fns="sortFns"
		:sort-options="['nameAsc', 'nameDesc']"
		type="datatable"
		:type-props="{ columns }"
		:loading="isLoading"
		@update:filters="updateFilter"
		@update:search="onSearchUpdated"
		@click:add="openCreateVariableModal"
	>
		<template #header>
			<ProjectHeader main-button="variable">
				<InsightsSummary
					v-if="overview.isOverviewSubPage && insightsStore.isSummaryEnabled"
					:loading="insightsStore.weeklySummary.isLoading"
					:summary="insightsStore.weeklySummary.state"
					time-range="week"
				/>
			</ProjectHeader>
		</template>
		<template #filters="{ setKeyValue }">
			<div class="mb-s">
				<N8nInputLabel
					:label="i18n.baseText('credentials.filters.status')"
					:bold="false"
					size="small"
					color="text-base"
					class="mb-3xs"
				/>

				<N8nCheckbox
					label="Value missing"
					data-test-id="variable-filter-incomplete"
					:model-value="filters.incomplete"
					@update:model-value="setKeyValue('incomplete', $event)"
				/>
			</div>
			<div v-if="!projectId" class="mb-s">
				<N8nInputLabel
					:label="i18n.baseText('forms.resourceFiltersDropdown.owner')"
					:bold="false"
					size="small"
					color="text-base"
					class="mb-3xs"
				/>

				<N8nSelect
					v-model="filters.projectId"
					size="large"
					filterable
					data-test-id="variable-modal-scope-select"
					@update:model-value="setKeyValue('projectId', $event)"
				>
					<template #prefix>
						<N8nText v-if="selectedProjectIcon?.type === 'emoji'" :class="$style.menuItemEmoji">{{
							selectedProjectIcon?.value
						}}</N8nText>
						<N8nIcon v-else-if="selectedProjectIcon?.value" :icon="selectedProjectIcon.value" />
					</template>
					<N8nOption
						v-for="option in projectOptions"
						:key="option.value || 'global'"
						:value="option.value"
						:label="option.label"
						:class="{ [$style.globalOption]: option.value === 'global' }"
					>
						<div :class="$style.optionContent">
							<N8nText
								v-if="option.icon && option.icon?.type === 'emoji'"
								:class="$style.menuItemEmoji"
							>
								{{ option.icon.value }}
							</N8nText>
							<N8nIcon v-else-if="option.icon?.value" :icon="option.icon.value" />
							<span>{{ option.label }}</span>
						</div>
					</N8nOption>
				</N8nSelect>
			</div>
		</template>
		<template v-if="!isFeatureEnabled" #preamble>
			<N8nActionBox class="mb-m" v-bind="unavailableNoticeProps" />
		</template>
		<template v-if="!isFeatureEnabled || (isFeatureEnabled && !canCreateVariables)" #empty>
			<N8nActionBox v-if="!isFeatureEnabled" v-bind="unavailableNoticeProps" />
			<N8nActionBox
				v-else-if="!canCreateVariables"
				data-test-id="cannot-create-variables"
				emoji="👋"
				:heading="
					i18n.baseText('variables.empty.notAllowedToCreate.heading', {
						interpolate: { name: usersStore.currentUser?.firstName ?? '' },
					})
				"
				:description="i18n.baseText('variables.empty.notAllowedToCreate.description')"
			/>
		</template>
		<template #default="{ data }">
			<tr data-test-id="variables-row">
				<td>
					{{ data.key }}
				</td>
				<td>
					<template v-if="data.value">
						<span v-n8n-truncate:20="data.value" />
					</template>
					<N8nBadge v-else theme="warning"> Value missing </N8nBadge>
				</td>
				<td>
					<VariablesUsageBadge v-if="data.key" :name="data.key" />
				</td>
				<td v-if="!projectId">
					<N8nBadge>
						<div class="scope-badge" style="display: flex; align-items: center; gap: 4px">
							<N8nIcon v-if="data.project" icon="layers" />
							{{ data.project?.name ?? i18n.baseText('variables.table.scope.global') }}
						</div>
					</N8nBadge>
				</td>
				<td v-if="isFeatureEnabled" align="right">
					<div class="action-buttons">
						<N8nTooltip :disabled="globalPermissions.update" placement="top">
							<N8nButton
								data-test-id="variable-row-edit-button"
								type="tertiary"
								class="mr-xs"
								:disabled="!globalPermissions.update"
								@click="openEditVariableModal(data)"
							>
								{{ i18n.baseText('variables.row.button.edit') }}
							</N8nButton>
							<template #content>
								{{ i18n.baseText('variables.row.button.edit.onlyRoleCanEdit') }}
							</template>
						</N8nTooltip>
						<N8nTooltip :disabled="globalPermissions.delete" placement="top">
							<N8nButton
								data-test-id="variable-row-delete-button"
								type="tertiary"
								:disabled="!globalPermissions.delete"
								@click="handleDeleteVariable(data)"
							>
								{{ i18n.baseText('variables.row.button.delete') }}
							</N8nButton>
							<template #content>
								{{ i18n.baseText('variables.row.button.delete.onlyRoleCanDelete') }}
							</template>
						</N8nTooltip>
					</div>
				</td>
			</tr>
		</template>
		<template #postdata>
			<div v-if="projectId && globalVariables.length" class="mt-xs">
				<N8nText v-if="projectId" size="small">
					<N8nLink href="/home/variables" theme="text" size="small">
						{{ globalVariables.length }} global variables
					</N8nLink>
					available in this project
				</N8nText>
			</div>
		</template>
	</ResourcesListLayout>
</template>

<style lang="scss" scoped>
.scope-badge {
	text-transform: none;
	display: flex;
	align-items: center;
	padding: 2px;
}
.action-buttons {
	opacity: 0;
	transition: opacity 0.2s ease;
}

:deep(.datatable) {
	white-space: nowrap;

	table tr {
		&:hover {
			.action-buttons {
				opacity: 1;
			}
		}

		td:nth-child(2) {
			white-space: normal;
		}
	}

	@media screen and (max-width: $breakpoint-sm) {
		table tr th:nth-child(3),
		table tr td:nth-child(3) {
			display: none;
		}
	}

	.variables-actions-column {
		width: 170px;
	}
}
</style>

<style lang="scss" module>
.optionContent {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.menuItemEmoji {
	font-size: var(--font-size--sm);
	line-height: 1;
}

.globalOption {
	position: relative;
	margin-bottom: var(--spacing--sm);
	overflow: visible;

	&::after {
		content: '';
		position: absolute;
		bottom: calc(var(--spacing--sm) / -2);
		left: var(--spacing--xs);
		right: var(--spacing--xs);
		height: 1px;
		background-color: var(--color--foreground);
	}
}
</style>
