<script lang="ts" setup>
import { computed, ref, onBeforeMount, onBeforeUnmount } from 'vue';
import { useEnvironmentsStore } from '@/stores/environments.ee.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';
import { useI18n } from '@/composables/useI18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { useToast } from '@/composables/useToast';
import { useMessage } from '@/composables/useMessage';

import type { IResource } from '@/components/layouts/ResourcesListLayout.vue';
import ResourcesListLayout from '@/components/layouts/ResourcesListLayout.vue';
import VariablesRow from '@/components/VariablesRow.vue';

import { EnterpriseEditionFeature, MODAL_CONFIRM } from '@/constants';
import type { DatatableColumn, EnvironmentVariable } from '@/Interface';
import { uid } from 'n8n-design-system/utils';
import { getVariablesPermissions } from '@/permissions';
import type { BaseTextKey } from '@/plugins/i18n';

const settingsStore = useSettingsStore();
const environmentsStore = useEnvironmentsStore();
const usersStore = useUsersStore();
const uiStore = useUIStore();
const telemetry = useTelemetry();
const i18n = useI18n();
const message = useMessage();
const sourceControlStore = useSourceControlStore();
let sourceControlStoreUnsubscribe = () => {};

const layoutRef = ref<InstanceType<typeof ResourcesListLayout> | null>(null);

const { showError } = useToast();

const TEMPORARY_VARIABLE_UID_BASE = '@tmpvar';

const allVariables = ref<EnvironmentVariable[]>([]);
const editMode = ref<Record<string, boolean>>({});

const permissions = getVariablesPermissions(usersStore.currentUser);

const isFeatureEnabled = computed(() =>
	settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Variables),
);

const variablesToResources = computed((): IResource[] =>
	allVariables.value.map((v) => ({ id: v.id, name: v.key, value: v.value })),
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

const newlyAddedVariableIds = ref<string[]>([]);

const nameSortFn = (a: IResource, b: IResource, direction: 'asc' | 'desc') => {
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
	nameAsc: (a: IResource, b: IResource) => {
		return nameSortFn(a, b, 'asc');
	},
	nameDesc: (a: IResource, b: IResource) => {
		return nameSortFn(a, b, 'desc');
	},
};

function resetNewVariablesList() {
	newlyAddedVariableIds.value = [];
}

const resourceToEnvironmentVariable = (data: IResource): EnvironmentVariable => {
	return {
		id: data.id,
		key: data.name,
		value: data.value,
	};
};

async function initialize() {
	if (!isFeatureEnabled.value) return;
	await environmentsStore.fetchAllVariables();

	allVariables.value = [...environmentsStore.variables];
}

function addTemporaryVariable() {
	const temporaryVariable: EnvironmentVariable = {
		id: uid(TEMPORARY_VARIABLE_UID_BASE),
		key: '',
		value: '',
	};

	if (layoutRef.value) {
		// Reset scroll position
		if (layoutRef.value.$refs.listWrapperRef) {
			(layoutRef.value.$refs.listWrapperRef as HTMLDivElement).scrollTop = 0;
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

async function saveVariable(data: IResource) {
	let updatedVariable: EnvironmentVariable;
	const variable = resourceToEnvironmentVariable(data);

	try {
		if (typeof data.id === 'string' && data.id.startsWith(TEMPORARY_VARIABLE_UID_BASE)) {
			const { id, ...rest } = variable;
			updatedVariable = await environmentsStore.createVariable(rest);
			allVariables.value.unshift(updatedVariable);
			allVariables.value = allVariables.value.filter((variable) => variable.id !== data.id);
			newlyAddedVariableIds.value.unshift(updatedVariable.id);
		} else {
			updatedVariable = await environmentsStore.updateVariable(variable);
			allVariables.value = allVariables.value.filter((variable) => variable.id !== data.id);
			allVariables.value.push(updatedVariable);
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

function cancelEditing(data: EnvironmentVariable) {
	if (typeof data.id === 'string' && data.id.startsWith(TEMPORARY_VARIABLE_UID_BASE)) {
		allVariables.value = allVariables.value.filter((variable) => variable.id !== data.id);
	} else {
		toggleEditing(data);
	}
}

async function deleteVariable(data: EnvironmentVariable) {
	try {
		const confirmed = await message.confirm(
			i18n.baseText('variables.modals.deleteConfirm.message', { interpolate: { name: data.key } }),
			i18n.baseText('variables.modals.deleteConfirm.title'),
			{
				confirmButtonText: i18n.baseText('variables.modals.deleteConfirm.confirmButton'),
				cancelButtonText: i18n.baseText('variables.modals.deleteConfirm.cancelButton'),
			},
		);

		if (confirmed !== MODAL_CONFIRM) {
			return;
		}

		await environmentsStore.deleteVariable(data);
		allVariables.value = allVariables.value.filter((variable) => variable.id !== data.id);
	} catch (error) {
		showError(error, i18n.baseText('variables.errors.delete'));
	}
}

function goToUpgrade() {
	void uiStore.goToUpgrade('variables', 'upgrade-variables');
}

function displayName(resource: IResource) {
	return resource.name;
}

onBeforeMount(() => {
	sourceControlStoreUnsubscribe = sourceControlStore.$onAction(({ name, after }) => {
		if (name === 'pullWorkfolder' && after) {
			after(() => {
				void initialize();
			});
		}
	});
});

onBeforeUnmount(() => {
	sourceControlStoreUnsubscribe();
});
</script>

<template>
	<ResourcesListLayout
		ref="layoutRef"
		class="variables-view"
		resource-key="variables"
		:disabled="!isFeatureEnabled"
		:resources="variablesToResources"
		:initialize="initialize"
		:shareable="false"
		:display-name="displayName"
		:sort-fns="sortFns"
		:sort-options="['nameAsc', 'nameDesc']"
		:show-filters-dropdown="false"
		type="datatable"
		:type-props="{ columns: datatableColumns }"
		@sort="resetNewVariablesList"
		@click:add="addTemporaryVariable"
	>
		<template #header>
			<n8n-heading size="2xlarge" class="mb-m">
				{{ i18n.baseText('variables.heading') }}
			</n8n-heading>
		</template>
		<template #add-button>
			<n8n-tooltip placement="top" :disabled="canCreateVariables">
				<div>
					<n8n-button
						size="large"
						block
						:disabled="!canCreateVariables"
						data-test-id="resources-list-add"
						@click="addTemporaryVariable"
					>
						{{ $locale.baseText(`variables.add`) }}
					</n8n-button>
				</div>
				<template #content>
					<span v-if="!isFeatureEnabled">{{
						i18n.baseText(`variables.add.unavailable${allVariables.length === 0 ? '.empty' : ''}`)
					}}</span>
					<span v-else>{{ i18n.baseText('variables.add.onlyOwnerCanCreate') }}</span>
				</template>
			</n8n-tooltip>
		</template>
		<template v-if="!isFeatureEnabled" #preamble>
			<n8n-action-box
				class="mb-m"
				data-test-id="unavailable-resources-list"
				emoji="👋"
				:heading="
					$locale.baseText(contextBasedTranslationKeys.variables.unavailable.title as BaseTextKey)
				"
				:description="
					$locale.baseText(
						contextBasedTranslationKeys.variables.unavailable.description as BaseTextKey,
					)
				"
				:button-text="
					$locale.baseText(contextBasedTranslationKeys.variables.unavailable.button as BaseTextKey)
				"
				button-type="secondary"
				@click:button="goToUpgrade"
			/>
		</template>
		<template v-if="!isFeatureEnabled || (isFeatureEnabled && !canCreateVariables)" #empty>
			<n8n-action-box
				v-if="!isFeatureEnabled"
				data-test-id="unavailable-resources-list"
				emoji="👋"
				:heading="
					$locale.baseText(contextBasedTranslationKeys.variables.unavailable.title as BaseTextKey)
				"
				:description="
					$locale.baseText(
						contextBasedTranslationKeys.variables.unavailable.description as BaseTextKey,
					)
				"
				:button-text="
					$locale.baseText(contextBasedTranslationKeys.variables.unavailable.button as BaseTextKey)
				"
				button-type="secondary"
				@click:button="goToUpgrade"
			/>
			<n8n-action-box
				v-else-if="!canCreateVariables"
				data-test-id="cannot-create-variables"
				emoji="👋"
				:heading="
					$locale.baseText('variables.empty.notAllowedToCreate.heading', {
						interpolate: { name: usersStore.currentUser?.firstName ?? '' },
					})
				"
				:description="$locale.baseText('variables.empty.notAllowedToCreate.description')"
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

.variables-view {
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
}
</style>
