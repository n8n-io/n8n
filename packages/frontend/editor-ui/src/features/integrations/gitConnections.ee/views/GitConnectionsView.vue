<script setup lang="ts">
import { useToast } from '@n8n/composables/useToast';
import {
	N8nEmptyState,
	N8nIcon,
	N8nLoading2,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRow,
	N8nSettingsRowConfigure,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	useMessage,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, nextTick, onMounted, ref, useTemplateRef } from 'vue';

import { MODAL_CONFIRM } from '@/app/constants';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import GitConnectionDialog from '../components/GitConnectionDialog.vue';
import {
	deleteGitConnection,
	fetchGitConnections,
	type GitConnectionSummary,
} from '../gitConnections.api';

// Placeholder until the feature has a documentation page.
const DOCS_URL = '#';

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const rootStore = useRootStore();
const documentTitle = useDocumentTitle();

const connections = ref<GitConnectionSummary[]>([]);
const isInitialLoading = ref(true);
const isFetching = ref(false);
const loadError = ref(false);
const dialogOpen = ref(false);
const editingId = ref<string | undefined>(undefined);
const connectionToFocus = ref<string | undefined>(undefined);
const addRow = useTemplateRef<{ $el?: HTMLElement }>('addRow');
const list = useTemplateRef<HTMLElement>('list');
const page = useTemplateRef<{ $el?: HTMLElement }>('page');

// The backend accepts a single connection and treats it as the instance
// connection. This relaxes once project-level connections land.
const canAddConnection = computed(() => !isFetching.value && connections.value.length === 0);

function describe(connection: GitConnectionSummary) {
	const provider = i18n.baseText('settings.gitConnections.connectorRow.provider');
	const repository = connection.branchName
		? `${connection.repositoryUrl} @ ${connection.branchName}`
		: connection.repositoryUrl;
	return `${provider} \u00b7 ${repository}`;
}

let hasLoaded = false;
let pendingLoad: Promise<void> = Promise.resolve();

async function load() {
	// Only the first load shows the skeleton; a refetch keeps the list mounted so
	// the dialog still has something to restore focus to.
	isInitialLoading.value = !hasLoaded;
	isFetching.value = true;
	loadError.value = false;
	try {
		connections.value = await fetchGitConnections(rootStore.publicApiContext);
	} catch (error) {
		loadError.value = true;
		connections.value = [];
		toast.showError(error, i18n.baseText('settings.gitConnections.error.title'));
	} finally {
		isInitialLoading.value = false;
		isFetching.value = false;
		hasLoaded = true;
	}
}

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.gitConnections.title'));
	await load();
});

function openCreateDialog() {
	if (!canAddConnection.value) return;
	editingId.value = undefined;
	connectionToFocus.value = undefined;
	dialogOpen.value = true;
}

function openEditDialog(id: string) {
	editingId.value = id;
	connectionToFocus.value = id;
	dialogOpen.value = true;
}

function onSaved(id: string) {
	connectionToFocus.value = id;
	pendingLoad = load();
}

async function focusConnection(id: string | undefined) {
	await nextTick();
	const row = id
		? list.value?.querySelector<HTMLElement>(`[data-connection-id="${id}"]`)
		: undefined;
	// The page itself is the last resort: a failed refetch replaces both the rows
	// and the add row with the error state, and reka's own restore is suppressed.
	(row ?? addRow.value?.$el ?? page.value?.$el)?.focus();
}

async function onDialogOpenChange(open: boolean) {
	dialogOpen.value = open;
	if (open) return;
	// The row to focus only exists once the refetch has rendered.
	await pendingLoad;
	await focusConnection(connectionToFocus.value);
}

async function onDelete(id: string) {
	const confirmed = await message.confirm(
		i18n.baseText('settings.gitConnections.delete.confirm.message'),
		i18n.baseText('settings.gitConnections.delete.confirm.title'),
		{
			confirmButtonText: i18n.baseText('settings.gitConnections.delete.confirm.button'),
			customClass: 'el-message-box--destructive',
			showClose: true,
		},
	);

	if (confirmed !== MODAL_CONFIRM) return;

	try {
		await deleteGitConnection(rootStore.publicApiContext, id);
		toast.showMessage({
			title: i18n.baseText('settings.gitConnections.toast.deleted'),
			type: 'success',
		});
		connectionToFocus.value = undefined;
		dialogOpen.value = false;
		await load();
		await focusConnection(undefined);
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.gitConnections.toast.error.delete'));
	}
}
</script>

<template>
	<N8nSettingsLayout ref="page" :class="$style.layout" tabindex="-1">
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.gitConnections.title')"
			:description="i18n.baseText('settings.gitConnections.description')"
			:docs-url="DOCS_URL"
		/>

		<N8nSettingsSection
			:title="i18n.baseText('settings.gitConnections.connectors.title')"
			:description="i18n.baseText('settings.gitConnections.connectors.description')"
		>
			<N8nLoading2 v-if="isInitialLoading" :rows="2" :shrink-last="false" />
			<N8nEmptyState
				v-else-if="loadError"
				:heading="i18n.baseText('settings.gitConnections.error.title')"
				:description="i18n.baseText('settings.gitConnections.error.description')"
				:button-text="i18n.baseText('generic.retry')"
				data-test-id="git-connections-load-error"
				@click:button="load"
			/>
			<template v-else>
				<div ref="list" :class="$style.list">
					<N8nSettingsRowGroup v-for="connection in connections" :key="connection.id">
						<N8nSettingsRow
							clickable
							:title="connection.name"
							:description="describe(connection)"
							:data-connection-id="connection.id"
							data-test-id="git-connection-row"
							@click="openEditDialog(connection.id)"
						>
							<template #visual>
								<N8nIcon icon="git-branch" color="text-dark" :size="20" />
							</template>
							<template #action>
								<N8nSettingsRowConfigure
									:value="i18n.baseText('settings.gitConnections.scope.instance')"
								/>
							</template>
						</N8nSettingsRow>
					</N8nSettingsRowGroup>
				</div>

				<N8nSettingsRowGroup v-if="canAddConnection">
					<N8nSettingsRow
						ref="addRow"
						clickable
						:title="i18n.baseText('settings.gitConnections.addConnector')"
						:description="i18n.baseText('settings.gitConnections.addConnector.description')"
						data-test-id="git-connections-add"
						@click="openCreateDialog"
					>
						<template #visual>
							<N8nIcon icon="plus" color="text-dark" :size="20" />
						</template>
						<template #action>
							<N8nIcon icon="chevron-right" color="text-light" size="small" />
						</template>
					</N8nSettingsRow>
				</N8nSettingsRowGroup>
			</template>
		</N8nSettingsSection>

		<GitConnectionDialog
			v-if="dialogOpen"
			:key="editingId ?? 'new'"
			:open="dialogOpen"
			:connection-id="editingId"
			@update:open="onDialogOpenChange"
			@saved="onSaved"
			@delete="onDelete"
		/>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
// The settings shell already pads the top of the page.
.layout {
	padding-top: 0;

	&:focus {
		outline: none;
	}
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}
</style>
