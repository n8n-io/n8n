<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';
import type { DataStore } from '@/features/dataStore/datastore.types';
import { useI18n } from '@n8n/i18n';
import type { PathItem } from '@n8n/design-system/components/N8nBreadcrumbs/Breadcrumbs.vue';
import { useRouter } from 'vue-router';
import DataStoreActions from '@/features/dataStore/components/DataStoreActions.vue';
import { PROJECT_DATA_STORES } from '@/features/dataStore/constants';
import { useDataStoreStore } from '@/features/dataStore/dataStore.store';
import { useToast } from '@/composables/useToast';

const BREADCRUMBS_SEPARATOR = '›';

type Props = {
	dataStore: DataStore;
};

const props = defineProps<Props>();

const renameInput = useTemplateRef<{ forceFocus: () => void }>('renameInput');

const dataStoreStore = useDataStoreStore();

const i18n = useI18n();
const router = useRouter();
const toast = useToast();

const editableName = ref(props.dataStore.name);

const project = computed(() => {
	return props.dataStore.project ?? null;
});

const breadcrumbs = computed<PathItem[]>(() => {
	if (!project.value) {
		return [];
	}
	return [
		{
			id: 'datastores',
			label: i18n.baseText('dataStore.dataStores'),
			href: `/projects/${project.value.id}/datastores`,
		},
	];
});

const onItemClicked = async (item: PathItem) => {
	if (item.href) {
		await router.push(item.href);
	}
};

const onDelete = async () => {
	await router.push({
		name: PROJECT_DATA_STORES,
		params: { projectId: props.dataStore.projectId },
	});
};

const onRename = async () => {
	// Focus rename input if the action is rename
	// We need this timeout to ensure action toggle is closed before focusing
	await nextTick();
	if (renameInput.value && typeof renameInput.value.forceFocus === 'function') {
		renameInput.value.forceFocus();
	}
};

const onNameSubmit = async (name: string) => {
	try {
		const updated = await dataStoreStore.updateDataStore(
			props.dataStore.id,
			name,
			props.dataStore.projectId,
		);
		if (!updated) {
			throw new Error(i18n.baseText('generic.unknownError'));
		}
		editableName.value = name;
	} catch (error) {
		// Revert to original name if rename fails
		editableName.value = props.dataStore.name;
		toast.showError(error, i18n.baseText('dataStore.rename.error'));
	}
};

watch(
	() => props.dataStore.name,
	(newName) => {
		editableName.value = newName;
	},
);
</script>

<template>
	<div :class="$style['data-store-breadcrumbs']">
		<n8n-breadcrumbs
			:items="breadcrumbs"
			:separator="BREADCRUMBS_SEPARATOR"
			@item-selected="onItemClicked"
		>
			<template #prepend>
				<ProjectBreadcrumb v-if="project" :current-project="project" />
			</template>
			<template #append>
				<span :class="$style.separator">{{ BREADCRUMBS_SEPARATOR }}</span>
				<N8nInlineTextEdit
					ref="renameInput"
					v-model="editableName"
					data-test-id="datastore-header-name-input"
					:placeholder="i18n.baseText('dataStore.add.input.name.label')"
					:class="$style['breadcrumb-current']"
					:max-length="30"
					:read-only="false"
					:disabled="false"
					@update:model-value="onNameSubmit"
				/>
			</template>
		</n8n-breadcrumbs>
		<div :class="$style['data-store-actions']">
			<DataStoreActions :data-store="props.dataStore" @rename="onRename" @on-deleted="onDelete" />
		</div>
	</div>
</template>

<style lang="scss" module>
.data-store-breadcrumbs {
	display: flex;
	align-items: end;
}

.data-store-actions {
	position: relative;
}

.separator {
	font-size: var(--font-size-xl);
	color: var(--color-foreground-base);
	padding: var(--spacing-3xs) var(--spacing-4xs) var(--spacing-4xs);
}

.breadcrumb-current {
	color: $custom-font-dark;
	font-size: var(--font-size-s);
	padding: var(--spacing-3xs) var(--spacing-4xs) var(--spacing-4xs);
}
</style>
