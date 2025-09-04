<script lang="ts" setup>
import VariablesForm from '@/components/VariablesForm.vue';
import VariablesUsageBadge from '@/components/VariablesUsageBadge.vue';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useI18n } from '@n8n/i18n';
import { useMessage } from '@/composables/useMessage';
import { useTelemetry } from '@/composables/useTelemetry';
import { useToast } from '@/composables/useToast';
import { useEnvironmentsStore } from '@/stores/environments.ee.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';
import { computed, onMounted, ref, useTemplateRef } from 'vue';
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router';

import ResourcesListLayout from '@/components/layouts/ResourcesListLayout.vue';
import type {
	BaseFilters,
	Resource,
	VariableResource,
	DatatableColumn,
	EnvironmentVariable,
} from '@/Interface';

import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';
import { EnterpriseEditionFeature, MODAL_CONFIRM } from '@/constants';
import { getResourcePermissions } from '@n8n/permissions';
import {
	N8nActionBox,
	N8nBadge,
	N8nButton,
	N8nCheckbox,
	N8nInputLabel,
	N8nTooltip,
} from '@n8n/design-system';
import { uid } from '@n8n/design-system/utils';
import { useAsyncState } from '@vueuse/core';
import pickBy from 'lodash/pickBy';
import type { ComponentExposed } from 'vue-component-type-helpers';

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

const layoutRef = useTemplateRef<ComponentExposed<typeof ResourcesListLayout>>('layoutRef');

const { showError } = useToast();

const TEMPORARY_VARIABLE_UID_BASE = '@tmpvar';

const permissions = computed(
	() => getResourcePermissions(usersStore.currentUser?.globalScopes).variable,
);

const { isLoading, execute } = useAsyncState(environmentsStore.fetchAllVariables, [], {
	immediate: true,
});

const isFeatureEnabled = computed(
	() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Variables],
);

const variableForms = ref<Map<string, EnvironmentVariable>>(new Map());
const editableVariables = ref<string[]>([]);
const addToEditableVariables = (variableId: string) => editableVariables.value.push(variableId);
const removeEditableVariable = (variableId: string) => {
	editableVariables.value = editableVariables.value.filter((id) => id !== variableId);
	variableForms.value.delete(variableId);
};

const addEmptyVariableForm = () => {
	const variable = { id: uid(TEMPORARY_VARIABLE_UID_BASE), key: '', value: '' };
	variableForms.value.set(variable.id, variable);

	// Reset pagination
	if (layoutRef.value?.currentPage !== 1) {
		layoutRef.value?.setCurrentPage(1);
	}

	addToEditableVariables(variable.id);
	telemetry.track('User clicked add variable button');
};

const variables = computed<VariableResource[]>(() =>
	[...variableForms.value.values(), ...environmentsStore.variables].map(
		(variable) =>
			({
				resourceType: 'variable',
				id: variable.id,
				name: variable.key,
				key: variable.key,
				value: variable.value,
			}) as VariableResource,
	),
);

const canCreateVariables = computed(() => isFeatureEnabled.value && permissions.value.create);

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

	if (!isFeatureEnabled.value) return cols;

	return cols.concat({ id: 3, path: 'actions', label: '', classes: ['variables-actions-column'] });
});

const handleSubmit = async (variable: EnvironmentVariable) => {
	try {
		const { id } = variable;
		if (id.startsWith(TEMPORARY_VARIABLE_UID_BASE)) {
			await environmentsStore.createVariable({
				value: variable.value,
				key: variable.key,
			});
		} else {
			await environmentsStore.updateVariable({
				id: variable.id,
				value: variable.value,
				key: variable.key,
			});
		}
		removeEditableVariable(id);
	} catch (error) {
		showError(error, i18n.baseText('variables.errors.save'));
	}
};

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
		removeEditableVariable(variable.id);
	} catch (error) {
		showError(error, i18n.baseText('variables.errors.delete'));
	}
};

type Filters = BaseFilters & { incomplete?: boolean };
const updateFilter = (state: Filters) => {
	void router.replace({ query: pickBy(state) as LocationQueryRaw });
};
const onSearchUpdated = (search: string) => {
	updateFilter({ ...filters.value, search });
};
const filters = ref<Filters>({
	...route.query,
	incomplete: route.query.incomplete?.toString() === 'true',
} as Filters);

const handleFilter = (resource: Resource, newFilters: BaseFilters, matches: boolean): boolean => {
	const Resource = resource as EnvironmentVariable;
	const filtersToApply = newFilters as Filters;

	if (filtersToApply.incomplete) {
		matches = matches && !Resource.value;
	}

	return matches;
};

const nameSortFn = (a: Resource, b: Resource, direction: 'asc' | 'desc') => {
	if (`${a.id}`.startsWith(TEMPORARY_VARIABLE_UID_BASE)) {
		return -1;
	} else if (`${b.id}`.startsWith(TEMPORARY_VARIABLE_UID_BASE)) {
		return 1;
	}

	return direction === 'asc'
		? displayName(a).trim().localeCompare(displayName(b).trim())
		: displayName(b).trim().localeCompare(displayName(a).trim());
};
const sortFns = {
	nameAsc: (a: Resource, b: Resource) => nameSortFn(a, b, 'asc'),
	nameDesc: (a: Resource, b: Resource) => nameSortFn(a, b, 'desc'),
};

const unavailableNoticeProps = computed(() => ({
	emoji: '👋',
	heading: i18n.baseText(uiStore.contextBasedTranslationKeys.variables.unavailable.title),
	description: i18n.baseText(uiStore.contextBasedTranslationKeys.variables.unavailable.description),
	buttonText: i18n.baseText(uiStore.contextBasedTranslationKeys.variables.unavailable.button),
	buttonType: 'secondary' as const,
	'onClick:button': goToUpgrade,
	'data-test-id': 'unavailable-resources-list',
}));

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
		@click:add="addEmptyVariableForm"
	>
		<template #header>
			<n8n-heading size="2xlarge" class="mb-m">
				{{ i18n.baseText('variables.heading') }}
			</n8n-heading>
		</template>
		<template #add-button>
			<N8nTooltip placement="top" :disabled="canCreateVariables">
				<div>
					<N8nButton
						size="medium"
						block
						:disabled="!canCreateVariables"
						data-test-id="resources-list-add"
						@click="addEmptyVariableForm"
					>
						{{ i18n.baseText(`variables.add`) }}
					</N8nButton>
				</div>
				<template #content>
					<span v-if="!isFeatureEnabled">{{
						i18n.baseText(`variables.add.unavailable${variables.length === 0 ? '.empty' : ''}`)
					}}</span>
					<span v-else>{{ i18n.baseText('variables.add.onlyOwnerCanCreate') }}</span>
				</template>
			</N8nTooltip>
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
				@click="goToUpgrade"
			/>
		</template>
		<template #default="{ data }">
			<VariablesForm
				v-if="editableVariables.includes(data.id)"
				:key="data.id"
				data-test-id="variables-row"
				:variable="data"
				@submit="handleSubmit"
				@cancel="removeEditableVariable(data.id)"
			/>

			<tr v-else data-test-id="variables-row">
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
				<td v-if="isFeatureEnabled" align="right">
					<div class="action-buttons">
						<N8nTooltip :disabled="permissions.update" placement="top">
							<N8nButton
								data-test-id="variable-row-edit-button"
								type="tertiary"
								class="mr-xs"
								:disabled="!permissions.update"
								@click="addToEditableVariables(data.id)"
							>
								{{ i18n.baseText('variables.row.button.edit') }}
							</N8nButton>
							<template #content>
								{{ i18n.baseText('variables.row.button.edit.onlyRoleCanEdit') }}
							</template>
						</N8nTooltip>
						<N8nTooltip :disabled="permissions.delete" placement="top">
							<N8nButton
								data-test-id="variable-row-delete-button"
								type="tertiary"
								:disabled="!permissions.delete"
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
	</ResourcesListLayout>
</template>

<style lang="scss" scoped>
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
