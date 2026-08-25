<script setup lang="ts">
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
	N8nTooltip,
	useMessage,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, nextTick, onMounted, ref, useTemplateRef } from 'vue';

import { MODAL_CONFIRM } from '@/app/constants';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { escapeHtml } from '@/app/utils/htmlUtils';
import GitConnectionDialog from '../components/GitConnectionDialog.vue';
import {
	deleteGitConnection,
	fetchGitConnections,
	type GitConnectionSummary,
} from '../gitConnections.api';

const CONNECTION_ACTIONS = {
	EDIT: 'edit',
	DELETE: 'delete',
} as const;

type ConnectionAction = (typeof CONNECTION_ACTIONS)[keyof typeof CONNECTION_ACTIONS];

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
const connectionToFocus = ref<string | undefined>(undefined);
const addButton = useTemplateRef<{ $el?: HTMLElement }>('addButton');
const list = useTemplateRef<HTMLElement>('list');

// The backend accepts a single connection and treats it as the instance
// connection. This relaxes once project-level connections land.
const canAddConnection = computed(() => connections.value.length === 0);

const rowActions = computed(() => [
	{ label: i18n.baseText('generic.edit'), value: CONNECTION_ACTIONS.EDIT },
	{ label: i18n.baseText('generic.delete'), value: CONNECTION_ACTIONS.DELETE },
]);

let hasLoaded = false;
let pendingLoad: Promise<void> = Promise.resolve();

async function load() {
	// Only the first load shows the skeleton; a refetch keeps the list mounted so
	// the dialog still has something to restore focus to.
	isLoading.value = !hasLoaded;
	loadError.value = false;
	try {
		connections.value = await fetchGitConnections(rootStore.publicApiContext);
	} catch (error) {
		loadError.value = true;
		connections.value = [];
		toast.showError(error, i18n.baseText('settings.gitConnections.error.title'));
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
	const card = id
		? list.value?.querySelector<HTMLElement>(`[data-connection-id="${id}"]`)
		: undefined;
	(card ?? addButton.value?.$el)?.focus();
}

async function onDialogOpenChange(open: boolean) {
	dialogOpen.value = open;
	if (open) return;
	// The card to focus only exists once the refetch has rendered.
	await pendingLoad;
	await focusConnection(connectionToFocus.value);
}

async function confirmDelete(connection: GitConnectionSummary) {
	const confirmed = await message.confirm(
		i18n.baseText('settings.gitConnections.delete.confirm.message', {
			interpolate: { name: escapeHtml(connection.name) },
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
		await deleteGitConnection(rootStore.publicApiContext, connection.id);
		toast.showMessage({
			title: i18n.baseText('settings.gitConnections.toast.deleted'),
			type: 'success',
		});
		await load();
		await focusConnection(undefined);
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.gitConnections.toast.error.delete'));
	}
}

async function onRowAction(action: ConnectionAction, connection: GitConnectionSummary) {
	if (action === CONNECTION_ACTIONS.EDIT) {
		openEditDialog(connection.id);
	} else if (action === CONNECTION_ACTIONS.DELETE) {
		await confirmDelete(connection);
	}
}
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.headerText" class="mb-xl">
			<N8nHeading tag="h1" size="2xlarge">
				{{ i18n.baseText('settings.gitConnections.title') }}
			</N8nHeading>
			<N8nText color="text-base" size="medium">
				{{ i18n.baseText('settings.gitConnections.description') }}
			</N8nText>
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
			<N8nTooltip
				v-if="!loadError"
				:disabled="canAddConnection"
				:content="i18n.baseText('settings.gitConnections.addConnector.limitReached')"
			>
				<N8nButton
					ref="addButton"
					icon="plus"
					:disabled="!canAddConnection"
					:label="i18n.baseText('settings.gitConnections.addConnector')"
					data-test-id="git-connections-add"
					@click="openCreateDialog"
				/>
			</N8nTooltip>
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
			v-else-if="connections.length === 0"
			:heading="i18n.baseText('settings.gitConnections.empty.title')"
			:description="i18n.baseText('settings.gitConnections.empty.description')"
		/>
		<div v-else ref="list">
			<N8nCard
				v-for="connection in connections"
				:key="connection.id"
				:class="$style.card"
				tabindex="-1"
				:data-connection-id="connection.id"
				data-test-id="git-connection-card"
			>
				<template #header>
					<div :class="$style.cardHeader">
						<N8nText tag="h3" bold>{{ connection.name }}</N8nText>
						<N8nBadge theme="tertiary">
							<span :class="$style.badgeContent">
								<N8nIcon icon="git-branch" size="small" />
								{{ i18n.baseText('settings.gitConnections.connectorType.git') }}
							</span>
						</N8nBadge>
						<N8nBadge theme="tertiary">
							{{ i18n.baseText('settings.gitConnections.scope.instance') }}
						</N8nBadge>
					</div>
				</template>
				<div :class="$style.cardDescription">
					<N8nText color="text-light" size="small">{{ connection.repositoryUrl }}</N8nText>
					<template v-if="connection.branchName">
						<N8nText color="text-light" size="small">&middot;</N8nText>
						<N8nText color="text-light" size="small">{{ connection.branchName }}</N8nText>
					</template>
				</div>
				<template #append>
					<N8nActionToggle :actions="rowActions" @action="onRowAction($event, connection)" />
				</template>
			</N8nCard>
		</div>

		<GitConnectionDialog
			v-if="dialogOpen"
			:key="editingId ?? 'new'"
			:open="dialogOpen"
			:connection-id="editingId"
			@update:open="onDialogOpenChange"
			@saved="onSaved"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	padding-bottom: var(--spacing--xl);
	max-width: 702px;
	margin: 0 auto;
}

.headerText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.sectionHeader {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: var(--spacing--sm);
	margin-bottom: var(--spacing--md);
}

.card {
	--card--padding: var(--spacing--md);

	margin-bottom: var(--spacing--xs);

	&:focus {
		outline: none;
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--outline-color);
	}
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
	gap: var(--spacing--3xs);
	margin-top: var(--spacing--4xs);
}
</style>
