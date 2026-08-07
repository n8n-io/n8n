<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useLoadingService } from '@/app/composables/useLoadingService';
import { useMessage } from '@/app/composables/useMessage';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { MODAL_CONFIRM } from '@/app/constants';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nEmptyState,
	N8nHeading,
	N8nText,
} from '@n8n/design-system';

import SourceControlConnectionForm from '../components/SourceControlConnectionForm.vue';
import { useSourceControlConnectionsStore } from '../sourceControlConnections.store';
import type { SourceControlConnectionDto } from '../sourceControlConnections.types';

const locale = useI18n();
const toast = useToast();
const message = useMessage();
const documentTitle = useDocumentTitle();
const loadingService = useLoadingService();
const pageRedirectionHelper = usePageRedirectionHelper();
const connectionsStore = useSourceControlConnectionsStore();
const projectsStore = useProjectsStore();

const isAdding = ref(false);
const editingConnectionId = ref<string | null>(null);

const editingConnection = computed(() =>
	connectionsStore.connections.find((connection) => connection.id === editingConnectionId.value),
);

const isInstanceConnection = (connection: SourceControlConnectionDto) =>
	connection.scopes.some((scope) => scope.scopeType === 'instance');

const scopeSummary = (connection: SourceControlConnectionDto) => {
	if (isInstanceConnection(connection)) {
		return locale.baseText('settings.sourceControl.connections.scope.instance');
	}
	const projectNames = connection.scopes
		.filter((scope) => scope.scopeType === 'project')
		.map(
			(scope) =>
				projectsStore.projects.find((project) => project.id === scope.projectId)?.name ??
				scope.projectId,
		);
	if (projectNames.length === 0) {
		return locale.baseText('settings.sourceControl.connections.scope.none');
	}
	return locale.baseText('settings.sourceControl.connections.scope.projects', {
		interpolate: { projects: projectNames.join(', ') },
	});
};

const onConnect = async (connection: SourceControlConnectionDto) => {
	loadingService.startLoading();
	loadingService.setLoadingText(locale.baseText('settings.sourceControl.loading.connecting'));
	try {
		await connectionsStore.connect(connection.id);
		toast.showMessage({
			title: locale.baseText('settings.sourceControl.toast.connected.title'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, locale.baseText('settings.sourceControl.toast.connected.error'));
	}
	loadingService.stopLoading();
};

const onDisconnect = async (connection: SourceControlConnectionDto) => {
	try {
		await connectionsStore.disconnect(connection.id);
		toast.showMessage({
			title: locale.baseText('settings.sourceControl.toast.disconnected.title'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, locale.baseText('settings.sourceControl.toast.disconnected.error'));
	}
};

const onDelete = async (connection: SourceControlConnectionDto) => {
	const confirmation = await message.confirm(
		locale.baseText('settings.sourceControl.connections.modals.delete.message'),
		locale.baseText('settings.sourceControl.connections.modals.delete.title'),
		{
			confirmButtonText: locale.baseText('settings.sourceControl.connections.button.delete'),
			cancelButtonText: locale.baseText('settings.sourceControl.connections.button.cancel'),
		},
	);
	if (confirmation !== MODAL_CONFIRM) return;
	try {
		await connectionsStore.remove(connection.id);
		toast.showMessage({
			title: locale.baseText('settings.sourceControl.connections.toast.deleted'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, locale.baseText('settings.sourceControl.connections.toast.saveError'));
	}
};

const onToggleInstanceScope = async (connection: SourceControlConnectionDto) => {
	try {
		if (isInstanceConnection(connection)) {
			await connectionsStore.removeInstanceScope(connection.id);
		} else {
			await connectionsStore.setInstanceScope(connection.id);
		}
	} catch (error) {
		toast.showError(error, locale.baseText('settings.sourceControl.connections.toast.saveError'));
	}
};

const onFormSaved = async () => {
	isAdding.value = false;
	editingConnectionId.value = null;
};

const goToUpgrade = () => {
	void pageRedirectionHelper.goToUpgrade('source-control', 'upgrade-source-control');
};

onMounted(async () => {
	documentTitle.set(locale.baseText('settings.sourceControl.title'));
	if (!connectionsStore.isEnterpriseSourceControlEnabled) return;
	await Promise.all([connectionsStore.fetchAll(), projectsStore.getAllProjects()]);
});
</script>

<template>
	<div>
		<N8nHeading size="2xlarge" tag="h1">{{
			locale.baseText('settings.sourceControl.title')
		}}</N8nHeading>
		<div
			v-if="connectionsStore.isEnterpriseSourceControlEnabled"
			data-test-id="source-control-content-licensed"
		>
			<N8nCallout theme="secondary" icon="info" class="mt-2xl mb-l">
				{{ locale.baseText('settings.sourceControl.connections.description') }}
			</N8nCallout>

			<div :class="$style.listHeader">
				<N8nHeading size="xlarge" tag="h2">{{
					locale.baseText('settings.sourceControl.connections.heading')
				}}</N8nHeading>
				<N8nButton
					v-if="!isAdding"
					icon="plus"
					data-test-id="source-control-add-connection-button"
					@click="isAdding = true"
				>
					{{ locale.baseText('settings.sourceControl.connections.add') }}
				</N8nButton>
			</div>

			<SourceControlConnectionForm
				v-if="isAdding"
				@saved="onFormSaved"
				@cancel="isAdding = false"
			/>

			<N8nEmptyState
				v-if="!isAdding && connectionsStore.connections.length === 0"
				data-test-id="source-control-connections-empty"
			>
				<template #heading>
					<span>{{ locale.baseText('settings.sourceControl.connections.empty.heading') }}</span>
				</template>
				<template #description>
					{{ locale.baseText('settings.sourceControl.connections.empty.description') }}
				</template>
			</N8nEmptyState>

			<div
				v-for="connection in connectionsStore.connections"
				:key="connection.id"
				:class="$style.connectionCard"
				data-test-id="source-control-connection-card"
			>
				<div :class="$style.cardHeader">
					<div :class="$style.cardTitle">
						<N8nText bold>{{ connection.repositoryUrl }}</N8nText>
						<span :class="$style.branchChip" :style="{ backgroundColor: connection.branchColor }">{{
							connection.branchName
						}}</span>
						<N8nBadge theme="tertiary">{{ connection.connectionType.toUpperCase() }}</N8nBadge>
						<N8nBadge v-if="isInstanceConnection(connection)" theme="primary">
							{{ locale.baseText('settings.sourceControl.connections.instanceBadge') }}
						</N8nBadge>
						<N8nBadge :theme="connection.connected ? 'success' : 'warning'">
							{{
								connection.connected
									? locale.baseText('settings.sourceControl.connections.status.connected')
									: locale.baseText('settings.sourceControl.connections.status.notConnected')
							}}
						</N8nBadge>
					</div>
					<N8nText size="small" color="text-light">{{ scopeSummary(connection) }}</N8nText>
				</div>
				<div :class="$style.cardActions">
					<N8nButton
						v-if="!connection.connected"
						size="small"
						data-test-id="source-control-connect-button"
						@click="onConnect(connection)"
					>
						{{ locale.baseText('settings.sourceControl.button.connect') }}
					</N8nButton>
					<N8nButton
						v-else
						size="small"
						variant="subtle"
						data-test-id="source-control-disconnect-button"
						@click="onDisconnect(connection)"
					>
						{{ locale.baseText('settings.sourceControl.button.disconnect') }}
					</N8nButton>
					<N8nButton size="small" variant="subtle" @click="onToggleInstanceScope(connection)">
						{{
							isInstanceConnection(connection)
								? locale.baseText('settings.sourceControl.connections.removeInstance')
								: locale.baseText('settings.sourceControl.connections.makeInstance')
						}}
					</N8nButton>
					<N8nButton
						size="small"
						variant="subtle"
						data-test-id="source-control-edit-connection-button"
						@click="
							editingConnectionId = editingConnectionId === connection.id ? null : connection.id
						"
					>
						{{ locale.baseText('settings.sourceControl.connections.button.edit') }}
					</N8nButton>
					<N8nButton
						size="small"
						variant="subtle"
						icon="trash-2"
						data-test-id="source-control-delete-connection-button"
						@click="onDelete(connection)"
					>
						{{ locale.baseText('settings.sourceControl.connections.button.delete') }}
					</N8nButton>
				</div>
				<SourceControlConnectionForm
					v-if="editingConnectionId === connection.id && editingConnection"
					:connection="editingConnection"
					class="mt-s"
					@saved="onFormSaved"
					@cancel="editingConnectionId = null"
				/>
			</div>
		</div>
		<N8nEmptyState
			v-else
			data-test-id="source-control-content-unlicensed"
			:class="$style.actionBox"
			:description="locale.baseText('settings.sourceControl.actionBox.description')"
			:button-text="locale.baseText('settings.sourceControl.actionBox.buttonText')"
			@click:button="goToUpgrade"
		>
			<template #heading>
				<span>{{ locale.baseText('settings.sourceControl.actionBox.title') }}</span>
			</template>
			<template #description>
				{{ locale.baseText('settings.sourceControl.actionBox.description') }}
				<a :href="locale.baseText('settings.sourceControl.docs.url')" target="_blank">
					{{ locale.baseText('settings.sourceControl.actionBox.description.link') }}
				</a>
			</template>
		</N8nEmptyState>
	</div>
</template>

<style lang="scss" module>
.listHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: var(--spacing--md);
}

.connectionCard {
	border: var(--border);
	border-radius: var(--radius);
	padding: var(--spacing--sm);
	margin-bottom: var(--spacing--sm);
}

.cardHeader {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin-bottom: var(--spacing--xs);
}

.cardTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-wrap: wrap;
}

.branchChip {
	display: inline-block;
	padding: 0 var(--spacing--2xs);
	border-radius: var(--radius);
	color: var(--color--text--tint-3, #fff);
	font-size: var(--font-size--2xs);
	line-height: 1.6;
}

.cardActions {
	display: flex;
	gap: var(--spacing--2xs);
	flex-wrap: wrap;
}

.actionBox {
	margin: var(--spacing--2xl) 0 0;
}
</style>
