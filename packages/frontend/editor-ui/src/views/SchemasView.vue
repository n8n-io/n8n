<script lang="ts" setup>
import VariablesForm from '@/components/VariablesForm.vue';
import VariablesUsageBadge from '@/components/VariablesUsageBadge.vue';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useI18n } from '@/composables/useI18n';
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

import ResourcesListLayout, {
	SchemaResource,
	type BaseFilters,
	type Resource,
	type VariableResource,
} from '@/components/layouts/ResourcesListLayout.vue';

import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';
import {
	EnterpriseEditionFeature,
	MODAL_CONFIRM,
	SCHEMA_CREATE_OR_EDIT_MODAL_KEY,
} from '@/constants';
import type { DatatableColumn, EnvironmentVariable } from '@/Interface';
import { getResourcePermissions } from '@/permissions';
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
import { pickBy } from 'lodash-es';
import { useSchemaStore } from '@/stores/schemas.store';
import { Schema } from '@n8n/api-types';

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
const schemaStore = useSchemaStore();
const schemas = ref<Schema[]>([]);

const schemaResources = computed<Resource[]>(() =>
	schemas.value.map((schema) => ({
		...schema,
		type: 'schema',
		resourceType: 'schema',
		updatedAt: schema.updatedAt || '',
		createdAt: schema.createdAt || '',
	})),
);

const layoutRef = useTemplateRef<InstanceType<typeof ResourcesListLayout>>('layoutRef');

const { showError } = useToast();

const TEMPORARY_VARIABLE_UID_BASE = '@tmpvar';

const permissions = computed(
	() => getResourcePermissions(usersStore.currentUser?.globalScopes).variable,
);

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
	uiStore.openModalWithData({
		name: SCHEMA_CREATE_OR_EDIT_MODAL_KEY,
		data: {
			mode: 'new',
		},
	});
};

const variables = computed<SchemaResource[]>(() => []);

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

onMounted(() => {
	// useDocumentTitle().set(i18n.baseText('variables.heading'));
});

const initialize = async () => {
	schemas.value = await schemaStore.getAndCacheApiKeys();
};
</script>

<template>
	<ResourcesListLayout
		v-model:filters="filters"
		resource-key="schemas"
		:disabled="false"
		:resources="schemaResources"
		:additional-filters-handler="handleFilter"
		:shareable="false"
		:initialize="initialize"
		:display-name="displayName"
		:sort-fns="sortFns"
		type="list-paginated"
		:type-props="{ itemSize: 50 }"
		:loading="false"
		@update:filters="updateFilter"
		@update:search="onSearchUpdated"
		@click:add="addEmptyVariableForm"
	>
		<template #header>
			<n8n-heading size="2xlarge" class="mb-m"> Schemas </n8n-heading>
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
						Create Schema
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

		<!-- <template v-if="!isFeatureEnabled" #preamble>
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
		</template> -->
		<template #item="{ item: data }">
			<SchemaCard :schema="data" />
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

.cardLink {
	transition: box-shadow 0.3s ease;
	cursor: pointer;
	padding: 0 0 0 var(--spacing-s);
	align-items: stretch;

	&:hover {
		box-shadow: 0 2px 8px rgba(#441c17, 0.1);
	}
}

.cardHeading {
	font-size: var(--font-size-s);
	word-break: word-break;
	padding: var(--spacing-s) 0 0 var(--spacing-s);
	width: 200px;
}
</style>
