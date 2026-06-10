<script setup lang="ts">
import { computed, onMounted, ref, useCssModule } from 'vue';
import type { SourceControlledFile } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nDataTableServer,
	N8nHeading,
	N8nIcon,
	N8nText,
} from '@n8n/design-system';
import type { TableHeader } from '@n8n/design-system/components/N8nDataTableServer';
import { useI18n } from '@n8n/i18n';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@/app/composables/useToast';
import { sourceControlEventBus } from '@/features/integrations/sourceControl.ee/sourceControl.eventBus';
import {
	fetchImportableChanges,
	importProjectChanges,
	type N8nPackagesRegistryProjectGroup,
} from '../n8nPackagesRegistry.api';

const SUPPORTED_IMPORT_TYPES = new Set<SourceControlledFile['type']>([
	'project',
	'workflow',
	'credential',
	'datatable',
	'folders',
]);

const RESOURCE_TYPES: Array<SourceControlledFile['type']> = [
	'project',
	'workflow',
	'credential',
	'datatable',
	'tags',
	'variables',
	'folders',
	'file',
];

type ProjectGroupTableRow = N8nPackagesRegistryProjectGroup & {
	rowId: string;
};

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const rootStore = useRootStore();
const documentTitle = useDocumentTitle();
const $style = useCssModule();

const projectGroups = ref<N8nPackagesRegistryProjectGroup[]>([]);
const isLoading = ref(false);
const hasLoadError = ref(false);
const importingProjectId = ref<string | null>(null);

const hasProjectGroups = computed(() => projectGroups.value.length > 0);
const tableRows = computed<ProjectGroupTableRow[]>(() =>
	projectGroups.value.map((group) => ({
		...group,
		rowId: group.project.id ?? 'global',
	})),
);
const pageSize = computed(() => Math.max(tableRows.value.length, 1));

const tableHeaders = ref<Array<TableHeader<ProjectGroupTableRow>>>([
	{
		title: i18n.baseText('settings.n8nPackagesRegistry.table.project'),
		key: 'project',
		width: 380,
		disableSort: true,
		resize: false,
	},
	{
		title: i18n.baseText('settings.n8nPackagesRegistry.table.type'),
		key: 'projectType',
		value: (item: ProjectGroupTableRow) => item.project.type,
		width: 160,
		disableSort: true,
		resize: false,
	},
	{
		title: i18n.baseText('settings.n8nPackagesRegistry.table.changes'),
		key: 'changeCount',
		value: (item: ProjectGroupTableRow) => item.changes.length,
		width: 120,
		align: 'end',
		disableSort: true,
		resize: false,
	},
	{
		title: i18n.baseText('settings.n8nPackagesRegistry.table.resources'),
		key: 'resources',
		value: () => '',
		disableSort: true,
		resize: false,
	},
	{
		title: '',
		key: 'actions',
		value: () => '',
		width: 150,
		align: 'end',
		disableSort: true,
		resize: false,
	},
]);

onMounted(() => {
	documentTitle.set(i18n.baseText('settings.n8nPackagesRegistry.title'));
	void loadImportableChanges();
});

async function loadImportableChanges() {
	isLoading.value = true;
	hasLoadError.value = false;

	try {
		projectGroups.value = await fetchImportableChanges(rootStore.restApiContext);
	} catch (error) {
		hasLoadError.value = true;
		toast.showError(error, i18n.baseText('settings.n8nPackagesRegistry.fetchError'));
	} finally {
		isLoading.value = false;
	}
}

function getProjectTypeLabel(type: N8nPackagesRegistryProjectGroup['project']['type']) {
	if (type === 'team') return i18n.baseText('settings.n8nPackagesRegistry.projectType.team');
	if (type === 'personal')
		return i18n.baseText('settings.n8nPackagesRegistry.projectType.personal');
	return i18n.baseText('settings.n8nPackagesRegistry.projectType.global');
}

function getResourceLabel(type: SourceControlledFile['type'], count: number) {
	if (type === 'project') {
		return i18n.baseText('settings.n8nPackagesRegistry.resource.project', {
			adjustToNumber: count,
			interpolate: { count: String(count) },
		});
	}
	if (type === 'workflow') {
		return i18n.baseText('settings.n8nPackagesRegistry.resource.workflow', {
			adjustToNumber: count,
			interpolate: { count: String(count) },
		});
	}
	if (type === 'credential') {
		return i18n.baseText('settings.n8nPackagesRegistry.resource.credential', {
			adjustToNumber: count,
			interpolate: { count: String(count) },
		});
	}
	if (type === 'datatable') {
		return i18n.baseText('settings.n8nPackagesRegistry.resource.datatable', {
			adjustToNumber: count,
			interpolate: { count: String(count) },
		});
	}
	if (type === 'tags') {
		return i18n.baseText('settings.n8nPackagesRegistry.resource.tags', {
			adjustToNumber: count,
			interpolate: { count: String(count) },
		});
	}
	if (type === 'variables') {
		return i18n.baseText('settings.n8nPackagesRegistry.resource.variables', {
			adjustToNumber: count,
			interpolate: { count: String(count) },
		});
	}
	if (type === 'folders') {
		return i18n.baseText('settings.n8nPackagesRegistry.resource.folders', {
			adjustToNumber: count,
			interpolate: { count: String(count) },
		});
	}
	return i18n.baseText('settings.n8nPackagesRegistry.resource.file', {
		adjustToNumber: count,
		interpolate: { count: String(count) },
	});
}

function getChangeCountLabel(count: number) {
	return i18n.baseText('settings.n8nPackagesRegistry.changeCount', {
		adjustToNumber: count,
		interpolate: { count: String(count) },
	});
}

function getResourceSummary(changes: SourceControlledFile[]) {
	return RESOURCE_TYPES.map((type) => {
		const count = changes.filter((change) => change.type === type).length;
		if (count === 0) return null;
		return getResourceLabel(type, count);
	}).filter((item): item is string => Boolean(item));
}

function getResourceSummaryText(changes: SourceControlledFile[]) {
	return getResourceSummary(changes).join(' | ');
}

function hasSupportedChanges(group: N8nPackagesRegistryProjectGroup) {
	return group.changes.some((change) => SUPPORTED_IMPORT_TYPES.has(change.type));
}

function getDisabledReason(group: N8nPackagesRegistryProjectGroup) {
	if (group.project.id === null) {
		return i18n.baseText('settings.n8nPackagesRegistry.globalChangesDisabled');
	}
	if (!hasSupportedChanges(group)) {
		return i18n.baseText('settings.n8nPackagesRegistry.noSupportedChanges');
	}
	return '';
}

function canImport(group: N8nPackagesRegistryProjectGroup) {
	return group.project.id !== null && hasSupportedChanges(group);
}

function getRowId(group: ProjectGroupTableRow) {
	return group.rowId;
}

function rowProps(group: ProjectGroupTableRow) {
	return {
		class: canImport(group) ? undefined : $style.disabledRow,
	};
}

async function importProject(group: N8nPackagesRegistryProjectGroup) {
	if (!canImport(group) || group.project.id === null) return;

	const confirmation = await message.confirm(
		i18n.baseText('settings.n8nPackagesRegistry.confirm.description', {
			interpolate: {
				projectName: group.project.name,
				count: String(group.changes.length),
			},
			adjustToNumber: group.changes.length,
		}),
		i18n.baseText('settings.n8nPackagesRegistry.confirm.title'),
		{
			confirmButtonText: i18n.baseText('settings.n8nPackagesRegistry.importProject'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		},
	);

	if (confirmation !== 'confirm') return;

	importingProjectId.value = group.project.id;

	try {
		const importedChanges = await importProjectChanges(rootStore.restApiContext, group.project.id);
		toast.showMessage({
			title: i18n.baseText('settings.n8nPackagesRegistry.importSuccess.title'),
			message: i18n.baseText('settings.n8nPackagesRegistry.importSuccess.message', {
				adjustToNumber: importedChanges.length,
				interpolate: {
					projectName: group.project.name,
					count: String(importedChanges.length),
				},
			}),
			type: 'success',
		});
		sourceControlEventBus.emit('pull');
		await loadImportableChanges();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.n8nPackagesRegistry.importError'));
	} finally {
		importingProjectId.value = null;
	}
}
</script>

<template>
	<div class="pb-xl" data-test-id="n8n-packages-registry-settings">
		<header class="mb-xl" :class="$style.header">
			<div :class="$style.titleBlock">
				<N8nHeading size="2xlarge" tag="h1">
					{{ i18n.baseText('settings.n8nPackagesRegistry.title') }}
				</N8nHeading>
				<N8nText tag="p" color="text-light" size="medium">
					{{ i18n.baseText('settings.n8nPackagesRegistry.description') }}
				</N8nText>
			</div>
			<N8nButton
				variant="subtle"
				icon="refresh-cw"
				:disabled="isLoading"
				data-test-id="n8n-packages-registry-refresh"
				@click="loadImportableChanges"
			>
				{{ i18n.baseText('settings.n8nPackagesRegistry.refresh') }}
			</N8nButton>
		</header>

		<N8nCallout
			v-if="hasLoadError"
			theme="danger"
			icon="triangle-alert"
			class="mb-l"
			data-test-id="n8n-packages-registry-error"
		>
			{{ i18n.baseText('settings.n8nPackagesRegistry.loadError') }}
		</N8nCallout>

		<div
			v-else-if="!isLoading && !hasProjectGroups"
			:class="$style.emptyState"
			data-test-id="n8n-packages-registry-empty"
		>
			<N8nIcon icon="inbox" size="xlarge" color="text-light" />
			<div :class="$style.emptyText">
				<N8nText tag="p" size="medium" :bold="true">
					{{ i18n.baseText('settings.n8nPackagesRegistry.empty.title') }}
				</N8nText>
				<N8nText tag="p" color="text-light">
					{{ i18n.baseText('settings.n8nPackagesRegistry.empty.description') }}
				</N8nText>
			</div>
		</div>

		<N8nDataTableServer
			v-else
			:items="tableRows"
			:headers="tableHeaders"
			:items-length="tableRows.length"
			:items-per-page="pageSize"
			:page-sizes="[pageSize]"
			:item-value="getRowId"
			:row-props="rowProps"
			:loading="isLoading"
			data-test-id="n8n-packages-registry-table"
		>
			<template #[`item.project`]="{ item }">
				<N8nText tag="div" class="mb-4xs">{{ item.project.name }}</N8nText>
				<N8nText v-if="getDisabledReason(item)" tag="div" size="small" color="text-light">
					{{ getDisabledReason(item) }}
				</N8nText>
			</template>

			<template #[`item.projectType`]="{ item }">
				<N8nBadge theme="tertiary" bold>{{ getProjectTypeLabel(item.project.type) }}</N8nBadge>
			</template>

			<template #[`item.changeCount`]="{ item }">
				{{ getChangeCountLabel(item.changes.length) }}
			</template>

			<template #[`item.resources`]="{ item }">
				<N8nText color="text-light" size="small">
					{{ getResourceSummaryText(item.changes) }}
				</N8nText>
			</template>

			<template #[`item.actions`]="{ item }">
				<N8nButton
					variant="subtle"
					size="small"
					:disabled="!canImport(item) || importingProjectId !== null"
					:loading="item.project.id !== null && importingProjectId === item.project.id"
					data-test-id="n8n-packages-registry-import-project"
					@click.stop="importProject(item)"
				>
					{{ i18n.baseText('settings.n8nPackagesRegistry.importProject') }}
				</N8nButton>
			</template>
		</N8nDataTableServer>
	</div>
</template>

<style module lang="scss">
.header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--lg);
}

.titleBlock {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	max-width: 760px;
}

.emptyState {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--3xl);
	border: 1px solid var(--color--foreground--base);
	border-radius: var(--radius);
	background: var(--color--background--light);
	text-align: center;
}

.emptyText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.disabledRow {
	background: var(--color--background--light-2);
}

@media (max-width: 820px) {
	.header {
		flex-direction: column;
		align-items: stretch;
	}
}
</style>
