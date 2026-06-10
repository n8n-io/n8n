<script setup lang="ts">
import { computed, onMounted, ref, useCssModule } from 'vue';
import type { SourceControlledFile } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nCard,
	N8nDataTableServer,
	N8nHeading,
	N8nIcon,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import type { TableHeader } from '@n8n/design-system/components/N8nDataTableServer';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import { isIconOrEmoji, type IconOrEmoji } from '@n8n/design-system/components/N8nIconPicker/types';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import Modal from '@/app/components/Modal.vue';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@/app/composables/useToast';
import { useUIStore } from '@/app/stores/ui.store';
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { ProjectListItem } from '@/features/collaboration/projects/projects.types';
import { sourceControlEventBus } from '@/features/integrations/sourceControl.ee/sourceControl.eventBus';
import {
	fetchRegistries,
	fetchImportableChanges,
	importProjectChanges,
	type N8nPackagesRegistryConnection,
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

const GIT_PLACEHOLDER_REGISTRY = {
	id: 'git-placeholder',
	type: 'git',
	name: 'Git registry',
	enabled: false,
	readonly: true,
} satisfies N8nPackagesRegistryConnection;

const S3_PLACEHOLDER_REGISTRY = {
	id: 's3-placeholder',
	type: 's3',
	name: 'S3 bucket',
	enabled: false,
	readonly: true,
} satisfies N8nPackagesRegistryConnection;
const IMPORT_MODAL_KEY = 'n8n-packages-registry-import-modal';

type ProjectGroupTableRow = N8nPackagesRegistryProjectGroup & {
	rowId: string;
};

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const rootStore = useRootStore();
const uiStore = useUIStore();
const projectsStore = useProjectsStore();
const documentTitle = useDocumentTitle();
const $style = useCssModule();

const projectGroups = ref<N8nPackagesRegistryProjectGroup[]>([]);
const registries = ref<N8nPackagesRegistryConnection[]>([]);
const selectedRegistryId = ref('source-control');
const isLoading = ref(false);
const hasLoadError = ref(false);
const importingProjectId = ref<string | null>(null);

const hasProjectGroups = computed(() => projectGroups.value.length > 0);
const registryCards = computed<N8nPackagesRegistryConnection[]>(() => {
	const configuredTypes = new Set(registries.value.map((registry) => registry.type));
	return [
		...registries.value,
		...(configuredTypes.has('git') ? [] : [GIT_PLACEHOLDER_REGISTRY]),
		...(configuredTypes.has('s3') ? [] : [S3_PLACEHOLDER_REGISTRY]),
	];
});
const hasRegistries = computed(() => registryCards.value.length > 0);
const selectedRegistry = computed(() =>
	registryCards.value.find((registry) => registry.id === selectedRegistryId.value),
);
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
	void initialize();
});

async function initialize() {
	await Promise.all([loadRegistries(), loadProjects()]);
}

async function loadRegistries() {
	try {
		registries.value = await fetchRegistries(rootStore.restApiContext);
		const firstEnabledRegistry = registries.value.find((registry) => registry.enabled);
		selectedRegistryId.value =
			firstEnabledRegistry?.id ?? registries.value[0]?.id ?? 'source-control';
	} catch (error) {
		hasLoadError.value = true;
		toast.showError(error, i18n.baseText('settings.n8nPackagesRegistry.fetchError'));
	}
}

async function loadProjects() {
	try {
		await projectsStore.getAllProjects();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.n8nPackagesRegistry.fetchError'));
	}
}

async function loadImportableChanges() {
	if (!selectedRegistry.value?.enabled) {
		projectGroups.value = [];
		return;
	}

	isLoading.value = true;
	hasLoadError.value = false;

	try {
		projectGroups.value = await fetchImportableChanges(
			rootStore.restApiContext,
			selectedRegistryId.value,
		);
	} catch (error) {
		hasLoadError.value = true;
		toast.showError(error, i18n.baseText('settings.n8nPackagesRegistry.fetchError'));
	} finally {
		isLoading.value = false;
	}
}

async function refresh() {
	if (!selectedRegistry.value?.enabled) return;
	uiStore.openModal(IMPORT_MODAL_KEY);
	await loadImportableChanges();
}

async function selectRegistry(registryId: string) {
	const registry = registryCards.value.find((item) => item.id === registryId);
	if (!registry?.enabled) return;

	selectedRegistryId.value = registryId;
	uiStore.openModal(IMPORT_MODAL_KEY);
	await loadImportableChanges();
}

function getRegistryTypeLabel(type: N8nPackagesRegistryConnection['type']) {
	if (type === 'source-control') {
		return i18n.baseText('settings.n8nPackagesRegistry.registryType.sourceControl' as BaseTextKey);
	}
	if (type === 's3') {
		return i18n.baseText('settings.n8nPackagesRegistry.registryType.s3' as BaseTextKey);
	}
	return i18n.baseText('settings.n8nPackagesRegistry.registryType.git' as BaseTextKey);
}

function getRegistryName(registry: N8nPackagesRegistryConnection) {
	if (registry.type === 'git' && registry.id === GIT_PLACEHOLDER_REGISTRY.id) {
		return i18n.baseText('settings.n8nPackagesRegistry.registry.git' as BaseTextKey);
	}
	if (registry.type === 's3') {
		return i18n.baseText('settings.n8nPackagesRegistry.registry.s3Bucket' as BaseTextKey);
	}
	return registry.name;
}

const importModalTitle = computed(() =>
	i18n.baseText('settings.n8nPackagesRegistry.importModal.title' as BaseTextKey, {
		interpolate: {
			registryName: selectedRegistry.value ? getRegistryName(selectedRegistry.value) : '',
		},
	}),
);

function getRegistryTypeIcon(type: N8nPackagesRegistryConnection['type']): IconName {
	if (type === 'source-control') return 'git-branch';
	if (type === 's3') return 'database';
	return 'cloud';
}

function getProjectForRegistry(registry: N8nPackagesRegistryConnection): ProjectListItem | null {
	if (!registry.projectId) return null;

	return projectsStore.projects.find((project) => project.id === registry.projectId) ?? null;
}

function getProjectNameForRegistry(registry: N8nPackagesRegistryConnection) {
	return getProjectForRegistry(registry)?.name ?? registry.projectId ?? '';
}

function getScopeIcon(registry: N8nPackagesRegistryConnection): IconOrEmoji {
	if (!registry.projectId) return { type: 'icon', value: 'globe' };

	const projectIcon = getProjectForRegistry(registry)?.icon;
	return isIconOrEmoji(projectIcon) ? projectIcon : { type: 'icon', value: 'layers' };
}

function getScopeTooltip(registry: N8nPackagesRegistryConnection) {
	if (!registry.projectId) {
		return i18n.baseText('settings.n8nPackagesRegistry.scope.global.tooltip' as BaseTextKey);
	}

	return i18n.baseText('settings.n8nPackagesRegistry.scope.project.tooltip' as BaseTextKey, {
		interpolate: {
			projectName: getProjectNameForRegistry(registry),
		},
	});
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
		const importedChanges = await importProjectChanges(
			rootStore.restApiContext,
			group.project.id,
			selectedRegistryId.value,
		);
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
				:disabled="isLoading || !selectedRegistry?.enabled"
				data-test-id="n8n-packages-registry-refresh"
				@click="refresh"
			>
				{{ i18n.baseText('settings.n8nPackagesRegistry.refresh') }}
			</N8nButton>
		</header>

		<div v-if="hasRegistries" :class="$style.registryList" class="mb-l">
			<N8nCard
				v-for="registry in registryCards"
				:key="registry.id"
				:hoverable="registry.enabled"
				:class="[
					$style.registryCard,
					{
						[$style.registryCardSelected]: registry.id === selectedRegistryId,
						[$style.registryCardDisabled]: !registry.enabled,
					},
				]"
				:data-test-id="`n8n-packages-registry-card-${registry.id}`"
				:aria-disabled="!registry.enabled"
				@click="selectRegistry(registry.id)"
			>
				<template #prepend>
					<div :class="$style.registryIcon">
						<N8nIcon :icon="getRegistryTypeIcon(registry.type)" size="large" />
					</div>
				</template>

				<template #header>
					<div :class="$style.registryCardHeader">
						<N8nHeading tag="h2" bold size="small">{{ getRegistryName(registry) }}</N8nHeading>
						<N8nBadge
							v-if="!registry.enabled"
							theme="tertiary"
							:bold="false"
							size="xsmall"
							data-test-id="n8n-packages-registry-disabled-badge"
						>
							{{ i18n.baseText('settings.n8nPackagesRegistry.placeholder' as BaseTextKey) }}
						</N8nBadge>
					</div>
				</template>

				<template #default>
					<N8nText color="text-light" size="small">
						{{ getRegistryTypeLabel(registry.type) }}
					</N8nText>
				</template>

				<template #append>
					<N8nTooltip :class="$style.scopeBadge" placement="top">
						<N8nBadge :class="$style.badge" theme="tertiary">
							<ProjectIcon :icon="getScopeIcon(registry)" :border-less="true" size="mini" />
							<span
								v-if="registry.projectId"
								v-n8n-truncate:20="getProjectNameForRegistry(registry)"
								:class="$style.nowrap"
							>
								{{ getProjectNameForRegistry(registry) }}
							</span>
							<span v-else>
								{{ i18n.baseText('projects.badge.global') }}
							</span>
						</N8nBadge>
						<template #content>
							{{ getScopeTooltip(registry) }}
						</template>
					</N8nTooltip>
				</template>
			</N8nCard>
		</div>

		<Modal
			:name="IMPORT_MODAL_KEY"
			:title="importModalTitle"
			width="80%"
			max-width="1120px"
			max-height="80%"
			scrollable
			:center="false"
			:custom-class="$style.importModal"
		>
			<template #content>
				<div :class="$style.modalToolbar" class="mb-s">
					<N8nText v-if="selectedRegistry" color="text-light" size="small">
						{{ getRegistryTypeLabel(selectedRegistry.type) }}
					</N8nText>
					<N8nButton
						variant="subtle"
						size="small"
						icon="refresh-cw"
						:disabled="isLoading || !selectedRegistry?.enabled"
						data-test-id="n8n-packages-registry-modal-refresh"
						@click="refresh"
					>
						{{ i18n.baseText('settings.n8nPackagesRegistry.refresh') }}
					</N8nButton>
				</div>

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
			</template>
		</Modal>
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

.registryList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	max-width: 702px;
	margin-inline: auto;
}

.registryCard {
	--card--padding: var(--spacing--2xs);
	cursor: pointer;
	transition:
		border-color 0.2s ease,
		box-shadow 0.2s ease,
		opacity 0.2s ease;
}

.registryCardSelected {
	border-color: var(--color--primary);
	box-shadow: var(--shadow--card-hover);
}

.registryCardDisabled {
	cursor: not-allowed;
	opacity: 0.62;
}

.registryIcon {
	width: var(--spacing--xl);
	height: var(--spacing--xl);
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--color--text--tint-1);
}

.registryCardHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.scopeBadge {
	margin-left: var(--spacing--xs);
}

.badge {
	padding: var(--spacing--4xs) var(--spacing--2xs);
	background-color: var(--color--background--light-3);
	border-color: var(--color--foreground);
	height: var(--spacing--lg);

	& > span {
		display: flex;
		gap: var(--spacing--3xs);
		align-items: center;
	}
}

.nowrap {
	white-space: nowrap !important;
}

.disabledRow {
	background: var(--color--background--light-2);
}

.importModal {
	:global(.el-dialog__body) {
		padding-top: var(--spacing--md);
	}
}

.modalToolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

@media (max-width: 820px) {
	.header {
		flex-direction: column;
		align-items: stretch;
	}

	.registryList {
		max-width: none;
	}
}
</style>
