<script setup lang="ts">
import type { GitConnectionType } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nActionToggle,
	N8nBadge,
	N8nButton,
	N8nCard,
	N8nEmptyState,
	N8nHeading,
	N8nIcon,
	N8nLoading2,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, nextTick, onMounted, ref, useTemplateRef } from 'vue';

import { MODAL_CONFIRM } from '@/app/constants';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useMessage } from '@/app/composables/useMessage';
import { escapeHtml } from '@/app/utils/htmlUtils';
import GitConnectionDialog from '../components/GitConnectionDialog.vue';
import {
	deleteGitConnection,
	fetchGitConnections,
	type GitConnectionSummary,
} from '../gitConnections.api';

type ConnectionRow = {
	id: string;
	name: string;
	repositoryUrl: string;
	branchName: string | null;
	connectionType: GitConnectionType;
};

const CONNECTION_ACTIONS = {
	EDIT: 'edit',
	DELETE: 'delete',
} as const;

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const rootStore = useRootStore();
const documentTitle = useDocumentTitle();

const connections = ref<GitConnectionSummary[]>([]);
const isLoading = ref(true);
const loadError = ref(false);
const dialogOpen = ref(false);
const editingId = ref<string | undefined>(undefined);
const addButton = useTemplateRef<{ $el?: HTMLElement }>('addButton');

// LIGO-1020: the instance connection is prepended to this list
const rows = computed<ConnectionRow[]>(() =>
	connections.value.map((connection) => ({
		id: connection.id,
		name: connection.name,
		repositoryUrl: connection.repositoryUrl,
		branchName: connection.branchName,
		connectionType: connection.connectionType,
	})),
);

const rowActions = computed(() => [
	{ label: i18n.baseText('generic.edit'), value: CONNECTION_ACTIONS.EDIT },
	{ label: i18n.baseText('generic.delete'), value: CONNECTION_ACTIONS.DELETE },
]);

let hasLoaded = false;

async function load() {
	// Only the first load shows the skeleton; a refetch keeps the list — and the
	// Add button the dialog restores focus to — mounted.
	isLoading.value = !hasLoaded;
	loadError.value = false;
	try {
		connections.value = await fetchGitConnections(rootStore.publicApiContext);
	} catch {
		loadError.value = true;
		connections.value = [];
	} finally {
		isLoading.value = false;
		hasLoaded = true;
	}
}

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.gitConnections.title'));
	await load();
});

function openCreateDialog() {
	editingId.value = undefined;
	dialogOpen.value = true;
}

function openEditDialog(id: string) {
	editingId.value = id;
	dialogOpen.value = true;
}

async function onDialogOpenChange(open: boolean) {
	dialogOpen.value = open;
	if (open) return;
	// Focus has to wait for `v-if` to unmount the dialog: while it is still there
	// reka's focus trap pulls focus straight back, and the unmount drops it to
	// `<body>`.
	await nextTick();
	addButton.value?.$el?.focus();
}

async function confirmDelete(row: ConnectionRow) {
	const confirmed = await message.confirm(
		i18n.baseText('settings.gitConnections.delete.confirm.message', {
			interpolate: { name: escapeHtml(row.name) },
		}),
		i18n.baseText('settings.gitConnections.delete.confirm.title'),
		{
			confirmButtonText: i18n.baseText('settings.gitConnections.delete.confirm.button'),
			customClass: 'el-message-box--destructive',
			showClose: true,
		},
	);

	if (confirmed !== MODAL_CONFIRM) return;

	try {
		await deleteGitConnection(rootStore.publicApiContext, row.id);
		toast.showMessage({
			title: i18n.baseText('settings.gitConnections.toast.deleted'),
			type: 'success',
		});
		await load();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.gitConnections.toast.error.delete'));
	}
}

async function onRowAction(action: string, row: ConnectionRow) {
	if (action === CONNECTION_ACTIONS.EDIT) {
		openEditDialog(row.id);
	} else if (action === CONNECTION_ACTIONS.DELETE) {
		await confirmDelete(row);
	}
}
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header" class="mb-xl">
			<div :class="$style.headerText">
				<N8nHeading tag="h1" size="2xlarge">
					{{ i18n.baseText('settings.gitConnections.title') }}
				</N8nHeading>
				<N8nText color="text-base" size="medium">
					{{ i18n.baseText('settings.gitConnections.description') }}
				</N8nText>
			</div>
		</div>

		<div :class="$style.sectionHeader">
			<div :class="$style.headerText">
				<N8nHeading tag="h2" size="large">
					{{ i18n.baseText('settings.gitConnections.connectors.title') }}
				</N8nHeading>
				<N8nText color="text-base" size="small">
					{{ i18n.baseText('settings.gitConnections.connectors.description') }}
				</N8nText>
			</div>
			<N8nButton
				v-if="!loadError"
				ref="addButton"
				icon="plus"
				:label="i18n.baseText('settings.gitConnections.addConnector')"
				data-test-id="git-connections-add"
				@click="openCreateDialog"
			/>
		</div>

		<N8nLoading2 v-if="isLoading" :rows="3" :shrink-last="false" />
		<N8nEmptyState
			v-else-if="loadError"
			:heading="i18n.baseText('settings.gitConnections.error.title')"
			:description="i18n.baseText('settings.gitConnections.error.description')"
			:button-text="i18n.baseText('generic.retry')"
			data-test-id="git-connections-load-error"
			@click:button="load"
		/>
		<N8nEmptyState
			v-else-if="rows.length === 0"
			:heading="i18n.baseText('settings.gitConnections.empty.title')"
			:description="i18n.baseText('settings.gitConnections.empty.description')"
		/>
		<div v-else>
			<N8nCard v-for="row in rows" :key="row.id" class="mb-2xs" data-test-id="git-connection-card">
				<template #header>
					<div :class="$style.cardHeader">
						<N8nText tag="h3" bold>{{ row.name }}</N8nText>
						<N8nBadge theme="tertiary">
							<span :class="$style.badgeContent">
								<N8nIcon icon="git-branch" size="small" />
								{{ i18n.baseText('settings.gitConnections.connectorType.git') }}
							</span>
						</N8nBadge>
					</div>
				</template>
				<div :class="$style.cardDescription">
					<N8nText color="text-light" size="small">{{ row.repositoryUrl }}</N8nText>
					<N8nText v-if="row.branchName" color="text-light" size="small">
						{{ row.branchName }}
					</N8nText>
				</div>
				<template #append>
					<N8nActionToggle :actions="rowActions" @action="onRowAction($event, row)" />
				</template>
			</N8nCard>
		</div>

		<GitConnectionDialog
			v-if="dialogOpen"
			:key="editingId ?? 'new'"
			:open="dialogOpen"
			:connection-id="editingId"
			@update:open="onDialogOpenChange"
			@saved="load"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	padding-bottom: var(--spacing--xl);
	max-width: 702px;
	margin: 0 auto;
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.headerText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.sectionHeader {
	display: flex;
	justify-content: space-between;
	align-items: flex-end;
	gap: var(--spacing--sm);
	margin-bottom: var(--spacing--sm);
}

.cardHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.badgeContent {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
}

.cardDescription {
	display: flex;
	gap: var(--spacing--2xs);
}
</style>
