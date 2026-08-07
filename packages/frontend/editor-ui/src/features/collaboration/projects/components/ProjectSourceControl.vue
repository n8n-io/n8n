<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { N8nBadge, N8nButton, N8nFormInput, N8nText } from '@n8n/design-system';

import { useProjectsStore } from '../projects.store';
import { useSourceControlConnectionsStore } from '@/features/integrations/sourceControl.ee/sourceControlConnections.store';

const i18n = useI18n();
const toast = useToast();
const rbacStore = useRBACStore();
const projectsStore = useProjectsStore();
const connectionsStore = useSourceControlConnectionsStore();

const selectedConnectionId = ref('');
const isBusy = ref(false);

const showSection = computed(
	() =>
		connectionsStore.isEnterpriseSourceControlEnabled && rbacStore.hasScope('sourceControl:manage'),
);

const claimedConnection = computed(() =>
	connectionsStore.connections.find((connection) =>
		connection.scopes.some(
			(scope) =>
				scope.scopeType === 'project' && scope.projectId === projectsStore.currentProjectId,
		),
	),
);

const resolvedConnection = computed(() =>
	connectionsStore.connectionForProject(projectsStore.currentProjectId ?? undefined),
);

const connectionOptions = computed(() =>
	connectionsStore.connections
		.filter((connection) => !connection.scopes.some((scope) => scope.scopeType === 'instance'))
		.map((connection) => ({
			value: connection.id,
			label: `${connection.repositoryUrl} (${connection.branchName})`,
		})),
);

const onClaim = async () => {
	if (!projectsStore.currentProjectId || !selectedConnectionId.value) return;
	isBusy.value = true;
	try {
		await connectionsStore.claimProject(selectedConnectionId.value, projectsStore.currentProjectId);
		toast.showMessage({
			title: i18n.baseText('projects.settings.sourceControl.toast.claimed'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('projects.settings.sourceControl.toast.error'));
	}
	isBusy.value = false;
};

const onUnclaim = async () => {
	if (!projectsStore.currentProjectId || !claimedConnection.value) return;
	isBusy.value = true;
	try {
		await connectionsStore.unclaimProject(
			claimedConnection.value.id,
			projectsStore.currentProjectId,
		);
		toast.showMessage({
			title: i18n.baseText('projects.settings.sourceControl.toast.unclaimed'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('projects.settings.sourceControl.toast.error'));
	}
	isBusy.value = false;
};

watch(
	showSection,
	async (show) => {
		if (show && connectionsStore.connections.length === 0) {
			await connectionsStore.fetchAll();
		}
	},
	{ immediate: true },
);
</script>

<template>
	<fieldset v-if="showSection" data-test-id="project-source-control-section">
		<h3 class="mb-s">
			<label for="projectSourceControl">{{
				i18n.baseText('projects.settings.sourceControl')
			}}</label>
		</h3>

		<div :class="$style.currentState">
			<template v-if="claimedConnection">
				<N8nText>
					{{ i18n.baseText('projects.settings.sourceControl.claimed') }}
				</N8nText>
				<N8nBadge theme="primary">
					{{ claimedConnection.repositoryUrl }} ({{ claimedConnection.branchName }})
				</N8nBadge>
				<N8nButton
					size="small"
					variant="subtle"
					:disabled="isBusy"
					data-test-id="project-source-control-unclaim-button"
					@click="onUnclaim"
				>
					{{ i18n.baseText('projects.settings.sourceControl.button.unclaim') }}
				</N8nButton>
			</template>
			<template v-else-if="resolvedConnection">
				<N8nText>
					{{ i18n.baseText('projects.settings.sourceControl.coveredByInstance') }}
				</N8nText>
				<N8nBadge theme="tertiary">
					{{ resolvedConnection.repositoryUrl }} ({{ resolvedConnection.branchName }})
				</N8nBadge>
			</template>
			<N8nText v-else color="text-light">
				{{ i18n.baseText('projects.settings.sourceControl.notSynced') }}
			</N8nText>
		</div>

		<div v-if="!claimedConnection && connectionOptions.length > 0" :class="$style.claimRow">
			<N8nFormInput
				id="projectSourceControlConnection"
				v-model="selectedConnectionId"
				label=""
				type="select"
				name="projectSourceControlConnection"
				:options="connectionOptions"
				:placeholder="i18n.baseText('projects.settings.sourceControl.select.placeholder')"
				data-test-id="project-source-control-connection-select"
			/>
			<N8nButton
				size="small"
				:disabled="isBusy || !selectedConnectionId"
				data-test-id="project-source-control-claim-button"
				@click="onClaim"
			>
				{{ i18n.baseText('projects.settings.sourceControl.button.claim') }}
			</N8nButton>
		</div>
	</fieldset>
</template>

<style lang="scss" module>
.currentState {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--xs);
	flex-wrap: wrap;
}

.claimRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	max-width: var(--project-field--width, 40rem);

	> div:first-child {
		flex: 1;
	}
}
</style>
