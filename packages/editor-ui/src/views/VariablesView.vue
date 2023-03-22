<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useEnvironmentsStore, useUIStore, useSettingsStore } from '@/stores';
import { useI18n, useTelemetry, useToast, useUpgradeLink, useMessage } from '@/composables';

import ResourcesListLayout from '@/components/layouts/ResourcesListLayout.vue';
import VariablesRow from '@/components/VariablesRow.vue';

import { EnterpriseEditionFeature } from '@/constants';
import { DatatableColumn, EnvironmentVariable, TemporaryEnvironmentVariable } from '@/Interface';
import { uid } from 'n8n-design-system/utils';

const settingsStore = useSettingsStore();
const environmentsStore = useEnvironmentsStore();
const uiStore = useUIStore();
const telemetry = useTelemetry();
const i18n = useI18n();
const message = useMessage();

const { showError } = useToast();

const TEMPORARY_VARIABLE_UID_BASE = '@tmpvar';

const allVariables = ref<(EnvironmentVariable | TemporaryEnvironmentVariable)[]>([]);
const editMode = ref<Record<string, boolean>>({});

const datatableColumns = ref<DatatableColumn[]>([
	{
		id: 0,
		path: 'name',
		label: 'Name',
	},
	{
		id: 1,
		path: 'value',
		label: 'Value',
	},
	{
		id: 2,
		path: 'actions',
		label: '',
	},
]);

const isFeatureEnabled = computed(() =>
	settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Variables),
);
const contextBasedTranslationKeys = computed(() => uiStore.contextBasedTranslationKeys);
const { upgradeLinkUrl } = useUpgradeLink({
	default: '&source=variables',
	desktop: '&utm_campaign=upgrade-variables',
});

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
		} else {
			updatedVariable = await environmentsStore.updateVariable(data as EnvironmentVariable);
			allVariables.value = allVariables.value.map((variable) =>
				variable.id === data.id ? updatedVariable : variable,
			);
			toggleEditingVariable(updatedVariable);
		}
	} catch (error) {
		showError(error, i18n.baseText('variables.errors.save'));
	}
}

function toggleEditingVariable(data: EnvironmentVariable) {
	editMode.value = {
		...editMode.value,
		[data.id]: !editMode.value[data.id],
	};
}

async function deleteVariable(data: EnvironmentVariable) {
	const confirmed = await message.confirm(
		i18n.baseText('variables.modals.deleteConfirm.message'),
		i18n.baseText('variables.modals.deleteConfirm.title'),
		{
			confirmButtonText: i18n.baseText('variables.modals.deleteConfirm.confirmButton'),
			cancelButtonText: i18n.baseText('variables.modals.deleteConfirm.cancelButton'),
		},
	);

	if (!confirmed) {
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
		ref="layout"
		resource-key="variables"
		:disabled="!isFeatureEnabled"
		:resources="allVariables"
		:initialize="initialize"
		:shareable="false"
		:displayName="displayName"
		:sortOptions="['nameAsc', 'nameDesc']"
		:showFiltersDropdown="false"
		type="datatable"
		:type-props="{ columns: datatableColumns }"
		@click:add="addTemporaryVariable"
	>
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
				@edit="toggleEditingVariable"
				@cancel="toggleEditingVariable"
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
