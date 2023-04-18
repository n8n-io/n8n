<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useEnvironmentsStore, useUIStore, useSettingsStore, useUsersStore } from '@/stores';
import { useI18n, useTelemetry, useToast, useUpgradeLink, useMessage } from '@/composables';

import ResourcesListLayout from '@/components/layouts/ResourcesListLayout.vue';
import VariablesRow from '@/components/VariablesRow.vue';

import { EnterpriseEditionFeature } from '@/constants';
import { DatatableColumn, EnvironmentVariable, TemporaryEnvironmentVariable } from '@/Interface';
import { uid } from 'n8n-design-system/utils';
import { getVariablesPermissions } from '@/permissions';

const settingsStore = useSettingsStore();
const environmentsStore = useEnvironmentsStore();
const usersStore = useUsersStore();
const uiStore = useUIStore();
const telemetry = useTelemetry();
const i18n = useI18n();
const message = useMessage();

const layoutRef = ref<InstanceType<typeof ResourcesListLayout> | null>(null);

const { showError } = useToast();

const TEMPORARY_VARIABLE_UID_BASE = '@tmpvar';

const allVariables = ref<Array<EnvironmentVariable | TemporaryEnvironmentVariable>>([]);
const editMode = ref<Record<string, boolean>>({});

const permissions = getVariablesPermissions(usersStore.currentUser);

const isFeatureEnabled = computed(() =>
	settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Variables),
);
const canCreateVariables = computed(() => isFeatureEnabled.value && permissions.create);

const datatableColumns = computed<DatatableColumn[]>(() => [
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
	...(isFeatureEnabled.value
		? [
				{
					id: 3,
					path: 'actions',
					label: '',
				},
		  ]
		: []),
]);

const contextBasedTranslationKeys = computed(() => uiStore.contextBasedTranslationKeys);
const { upgradeLinkUrl } = useUpgradeLink({
	default: '&source=variables',
	desktop: '&utm_campaign=upgrade-variables',
});

const newlyAddedVariableIds = ref<number[]>([]);

const nameSortFn = (a: EnvironmentVariable, b: EnvironmentVariable, direction: 'asc' | 'desc') => {
	if (`${a.id}`.startsWith(TEMPORARY_VARIABLE_UID_BASE)) {
		return -1;
	} else if (`${b.id}`.startsWith(TEMPORARY_VARIABLE_UID_BASE)) {
		return 1;
	} else if (
		newlyAddedVariableIds.value.includes(a.id) &&
		newlyAddedVariableIds.value.includes(b.id)
	) {
		return newlyAddedVariableIds.value.indexOf(a.id) - newlyAddedVariableIds.value.indexOf(b.id);
	} else if (newlyAddedVariableIds.value.includes(a.id)) {
		return -1;
	} else if (newlyAddedVariableIds.value.includes(b.id)) {
		return 1;
	}

	return direction === 'asc'
		? displayName(a).trim().localeCompare(displayName(b).trim())
		: displayName(b).trim().localeCompare(displayName(a).trim());
};
const sortFns = {
	nameAsc: (a: EnvironmentVariable, b: EnvironmentVariable) => {
		return nameSortFn(a, b, 'asc');
	},
	nameDesc: (a: EnvironmentVariable, b: EnvironmentVariable) => {
		return nameSortFn(a, b, 'desc');
	},
};

function resetNewVariablesList() {
	newlyAddedVariableIds.value = [];
}

async function initialize() {
	await environmentsStore.fetchAllVariables();

	allVariables.value = [...environmentsStore.variables];
}

function addTemporaryVariable() {
	const temporaryVariable: TemporaryEnvironmentVariable = {
		id: uid(TEMPORARY_VARIABLE_UID_BASE),
		key: '',
		value: '',
	};

	if (layoutRef.value) {
		// Reset scroll position
		if (layoutRef.value.$refs.listWrapperRef) {
			layoutRef.value.$refs.listWrapperRef.scrollTop = 0;
		}

		// Reset pagination
		if (layoutRef.value.currentPage !== 1) {
			layoutRef.value.setCurrentPage(1);
		}
	}

	allVariables.value.unshift(temporaryVariable);
	editMode.value[temporaryVariable.id] = true;

	telemetry.track('User clicked add variable button');
}

async function saveVariable(data: EnvironmentVariable | TemporaryEnvironmentVariable) {
	let updatedVariable: EnvironmentVariable;

	try {
		if (typeof data.id === 'string' && data.id.startsWith(TEMPORARY_VARIABLE_UID_BASE)) {
			const { id, ...rest } = data;
			updatedVariable = await environmentsStore.createVariable(rest);
			allVariables.value.unshift(updatedVariable);
			allVariables.value = allVariables.value.filter((variable) => variable.id !== data.id);
			newlyAddedVariableIds.value.unshift(updatedVariable.id);
		} else {
			updatedVariable = await environmentsStore.updateVariable(data as EnvironmentVariable);
			allVariables.value = allVariables.value.map((variable) =>
				variable.id === data.id ? updatedVariable : variable,
			);
			toggleEditing(updatedVariable);
		}
	} catch (error) {
		showError(error, i18n.baseText('variables.errors.save'));
	}
}

function toggleEditing(data: EnvironmentVariable) {
	editMode.value = {
		...editMode.value,
		[data.id]: !editMode.value[data.id],
	};
}

function cancelEditing(data: EnvironmentVariable | TemporaryEnvironmentVariable) {
	if (typeof data.id === 'string' && data.id.startsWith(TEMPORARY_VARIABLE_UID_BASE)) {
		allVariables.value = allVariables.value.filter((variable) => variable.id !== data.id);
	} else {
		toggleEditing(data as EnvironmentVariable);
	}
}

async function deleteVariable(data: EnvironmentVariable) {
	try {
		await message.confirm(
			i18n.baseText('variables.modals.deleteConfirm.message', { interpolate: { name: data.key } }),
			i18n.baseText('variables.modals.deleteConfirm.title'),
			{
				confirmButtonText: i18n.baseText('variables.modals.deleteConfirm.confirmButton'),
				cancelButtonText: i18n.baseText('variables.modals.deleteConfirm.cancelButton'),
			},
		);
	} catch (e) {
		return;
	}

	try {
		await environmentsStore.deleteVariable(data);
		allVariables.value = allVariables.value.filter((variable) => variable.id !== data.id);
	} catch (error) {
		showError(error, i18n.baseText('variables.errors.delete'));
	}
}

function goToUpgrade() {
	window.open(upgradeLinkUrl.value, '_blank');
}

function displayName(resource: EnvironmentVariable) {
	return resource.key;
}
</script>

<template>
	<ResourcesListLayout
		ref="layoutRef"
		resource-key="variables"
		:disabled="!isFeatureEnabled"
		:resources="allVariables"
		:initialize="initialize"
		:shareable="false"
		:displayName="displayName"
		:sortFns="sortFns"
		:sortOptions="['nameAsc', 'nameDesc']"
		:showFiltersDropdown="false"
		type="datatable"
		:type-props="{ columns: datatableColumns }"
		@sort="resetNewVariablesList"
		@click:add="addTemporaryVariable"
	>
		<template #add-button>
			<n8n-tooltip placement="top" :disabled="canCreateVariables">
				<div>
					<n8n-button
						size="large"
						block
						:disabled="!canCreateVariables"
						@click="addTemporaryVariable"
						data-test-id="resources-list-add"
					>
						{{ $locale.baseText(`variables.add`) }}
					</n8n-button>
				</div>
				<template #content>
					<span v-if="!isFeatureEnabled">{{ i18n.baseText('variables.add.unavailable') }}</span>
					<span v-else>{{ i18n.baseText('variables.add.onlyOwnerCanCreate') }}</span>
				</template>
			</n8n-tooltip>
		</template>
		<template v-if="!isFeatureEnabled" #preamble>
			<n8n-action-box
				class="mb-m"
				data-test-id="unavailable-resources-list"
				emoji="👋"
				:heading="$locale.baseText(contextBasedTranslationKeys.variables.unavailable.title)"
				:description="
					$locale.baseText(contextBasedTranslationKeys.variables.unavailable.description)
				"
				:buttonText="$locale.baseText(contextBasedTranslationKeys.variables.unavailable.button)"
				buttonType="secondary"
				@click="goToUpgrade"
			/>
		</template>
		<template v-if="!isFeatureEnabled" #empty>
			<n8n-action-box
				data-test-id="empty-resources-list"
				emoji="👋"
				:heading="$locale.baseText(contextBasedTranslationKeys.variables.unavailable.title)"
				:description="
					$locale.baseText(contextBasedTranslationKeys.variables.unavailable.description)
				"
				:buttonText="$locale.baseText(contextBasedTranslationKeys.variables.unavailable.button)"
				buttonType="secondary"
				@click="goToUpgrade"
			/>
		</template>
		<template #default="{ data }">
			<VariablesRow
				:key="data.id"
				:editing="editMode[data.id]"
				:data="data"
				@save="saveVariable"
				@edit="toggleEditing"
				@cancel="cancelEditing"
				@delete="deleteVariable"
			/>
		</template>
	</ResourcesListLayout>
</template>

<style lang="scss" module>
.type-input {
	--max-width: 265px;
}

.sidebarContainer ul {
	padding: 0 !important;
}
</style>

<style lang="scss" scoped>
@use 'n8n-design-system/css/common/var.scss';

:deep(.datatable) {
	table {
		table-layout: fixed;
	}

	th,
	td {
		width: 25%;

		@media screen and (max-width: var.$md) {
			width: 33.33%;
		}

		&.variables-value-column,
		&.variables-key-column,
		&.variables-usage-column {
			> div {
				width: 100%;

				> span {
					max-width: 100%;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
					height: 18px;
				}

				> div {
					width: 100%;
				}
			}
		}
	}

	.variables-usage-column {
		@media screen and (max-width: var.$md) {
			display: none;
		}
	}
}
</style>
