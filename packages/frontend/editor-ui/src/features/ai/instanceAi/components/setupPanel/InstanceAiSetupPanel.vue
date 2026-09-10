<script lang="ts" setup>
import { computed, onScopeDispose, provide, ref, shallowReactive, watch } from 'vue';
import { useLocalStorage } from '@vueuse/core';
import { useUsersStore } from '@n8n/stores/users.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	N8nSetupPanel,
	N8nSetupConnection,
	N8nIcon,
	N8nText,
	type SetupPanelItem,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import type { INodeParameters } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import {
	LOCAL_STORAGE_INSTANCE_AI_SETUP_ITEMS,
	LOCAL_STORAGE_INSTANCE_AI_SETUP_DISMISSED,
	ResourceLocatorDropdownTeleportedKey,
} from '@/app/constants';
import { getWorkflow } from '@/app/api/workflows';
import { deriveHomeProject } from '@/app/stores/workflowDocument.store';
import NodeIcon from '@/app/components/NodeIcon.vue';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import { getAppNameFromCredType } from '@/app/utils/nodeTypesUtils';
import { deriveServiceName } from '@/features/credentials/templatedAuth.utils';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useCredentialOAuth } from '@/features/credentials/composables/useCredentialOAuth';
import { useUIStore } from '@/app/stores/ui.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useCredentialTestInBackground } from '@/features/credentials/composables/useCredentialTestInBackground';
import { useThread } from '../../instanceAi.store';
import { useSetupPanelState } from '../../composables/useSetupPanelState';
import { useSetupPanelExecution } from '../../composables/useSetupPanelExecution';
import { groupSetupPanelRows, type SetupPanelGroup } from '../../setupPanelGroups';
import { useSetupPanelTelemetry } from '../../composables/useSetupPanelTelemetry';
import {
	useSetupPanelActions,
	type SetupCredentialItem,
	type SetupPanelApplyResult,
} from '../../composables/useSetupPanelActions';
import InstanceAiSetupPanelDetail from './InstanceAiSetupPanelDetail.vue';
import InstanceAiSetupCredential from './InstanceAiSetupCredential.vue';
import { AI_GATEWAY_MANAGED_TAG } from '../../constants';

const props = defineProps<{
	/** Workflow selected from an artifact or an early setup announcement. */
	workflowId: string;
	projectId?: string;
}>();

// Resource menus must escape the scrollable card and the composer beneath it.
provide(ResourceLocatorDropdownTeleportedKey, true);

const i18n = useI18n();
const toast = useToast();
const thread = useThread();
const credentialsStore = useCredentialsStore();
const nodeTypesStore = useNodeTypesStore();
const projectsStore = useProjectsStore();
const usersStore = useUsersStore();
const rootStore = useRootStore();
const uiStore = useUIStore();
const oauth = useCredentialOAuth();
const connectingItemId = ref<string>();
let active = true;
onScopeDispose(() => {
	active = false;
	oauth.cancelAuthorize();
});
const { testCredentialInBackground } = useCredentialTestInBackground();

const {
	rows,
	rowSource,
	credentialsAvailable,
	isAgentBuilding,
	getNodeByName,
	refreshWorkflow,
	workflowProjectId,
} = useSetupPanelState({
	thread,
	workflowId: () => props.workflowId,
});

const fetchedProject = ref<{ workflowId: string; projectId?: string }>();
const credentialProjectId = computed(
	() =>
		workflowProjectId.value ??
		props.projectId ??
		(fetchedProject.value?.workflowId === props.workflowId
			? fetchedProject.value.projectId
			: undefined),
);
// Early credential announcements can precede the artifact's project metadata.
watch(
	() => (workflowProjectId.value || props.projectId ? undefined : props.workflowId),
	async (id) => {
		if (!id || fetchedProject.value?.workflowId === id) return;
		try {
			const workflow = await getWorkflow(rootStore.restApiContext, id);
			if (props.workflowId === id)
				fetchedProject.value = { workflowId: id, projectId: deriveHomeProject(workflow)?.id };
		} catch {
			// Saved-state derivation retries after the build ends.
		}
	},
	{ immediate: true },
);
const isCredentialProjectReady = computed(() =>
	projectsStore.myProjects.some((project) => project.id === credentialProjectId.value),
);
watch(
	credentialProjectId,
	async (id) => {
		if (id && !isCredentialProjectReady.value) {
			await projectsStore.getMyProjects().catch(() => {});
		}
	},
	{ immediate: true },
);

const actions = useSetupPanelActions({
	workflowId: () => props.workflowId,
	isAgentBuilding,
	onFlushResult: notifyApplyResult,
});

const execution = useSetupPanelExecution({ thread, workflowId: () => props.workflowId });

const selectedItemId = ref<string>();
// Persist dismissal, not completion. New requirements reopen the panel.
const setupDismissed = useLocalStorage(
	() =>
		LOCAL_STORAGE_INSTANCE_AI_SETUP_DISMISSED(
			usersStore.currentUserId ?? '',
			thread.id,
			props.workflowId,
		),
	false,
	{ writeDefaults: false },
);
watch(
	() => props.workflowId,
	() => {
		selectedItemId.value = undefined;
		oauth.cancelAuthorize();
		dirtyParameters.clear();
	},
);

function nodeType(node: INodeUi) {
	return nodeTypesStore.getNodeType(node.type, node.typeVersion);
}

// Remember visibility only. Completion still comes from the workflow and credentials.
const shownItemIds = useLocalStorage<string[]>(
	() =>
		LOCAL_STORAGE_INSTANCE_AI_SETUP_ITEMS(
			usersStore.currentUserId ?? '',
			thread.id,
			props.workflowId,
		),
	[],
	{ writeDefaults: false, flush: 'sync' },
);
const credentialsReady = credentialsAvailable;
watch(
	[rows, credentialsReady],
	([currentRows, ready]) => {
		const added = currentRows.filter(
			(row) =>
				!row.isDone &&
				(row.item.kind === 'parameters' || ready) &&
				!shownItemIds.value.includes(row.item.id),
		);
		if (added.length)
			shownItemIds.value = [...shownItemIds.value, ...added.map((row) => row.item.id)];
	},
	{ immediate: true, flush: 'sync' },
);
const groups = computed(() =>
	groupSetupPanelRows(rows.value, {
		workflowId: props.workflowId,
		getNodeByName,
		getNodeType: nodeType,
	}).filter((group) => {
		const items = [...(group.credential ? [group.credential] : []), ...group.parameters];
		return (
			items.some((row) => shownItemIds.value.includes(row.item.id)) ||
			items.some((row) => !row.isDone && (row.item.kind === 'parameters' || credentialsReady.value))
		);
	}),
);
const panelTelemetry = useSetupPanelTelemetry({
	workflowId: () => props.workflowId,
	threadId: thread.id,
	rows,
	groups,
	shownItemIds,
	ready: () =>
		!setupDismissed.value &&
		credentialsReady.value &&
		(rowSource.value === 'derived' || rows.value.length > 0),
});
const selectedGroup = computed(() =>
	groups.value.find((group) => group.id === selectedItemId.value),
);
const selectedNode = computed(() => {
	const item = selectedGroup.value?.credential?.item;
	const name = item?.nodeBindings?.find((binding) => getNodeByName(binding.nodeName))?.nodeName;
	return name ? getNodeByName(name) : undefined;
});
const selectedNodes = computed(() =>
	(selectedGroup.value?.credential?.item.nodeBindings ?? []).flatMap((binding) => {
		const node = getNodeByName(binding.nodeName);
		return node ? [node] : [];
	}),
);

function groupById(id: string) {
	return groups.value.find((group) => group.id === id);
}

function groupNodeType(id: string) {
	const node = groupById(id)?.node;
	return node ? nodeType(node) : null;
}

function groupName(group: SetupPanelGroup): string {
	const item = group.credential?.item;
	if (item)
		return (
			deriveServiceName(item.setupHint) ??
			getAppNameFromCredType(
				item.appDisplayName ??
					credentialsStore.getCredentialTypeByName(item.credentialType)?.displayName ??
					item.credentialType,
			)
		);
	return group.node
		? (nodeType(group.node)?.displayName ?? group.node.name)
		: i18n.baseText('instanceAi.setupPanel.details');
}

const panelItems = computed<SetupPanelItem[]>(() =>
	groups.value.map((group) => {
		const pending: string[] = [];
		if (group.credential && !group.credential.isDone) {
			pending.push(i18n.baseText('instanceAi.setupPanel.connection'));
		}
		for (const row of group.parameters) {
			if (row.isDone) continue;
			const node = getNodeByName(row.item.nodeName);
			const properties = node ? nodeType(node)?.properties : undefined;
			for (const name of row.item.parameterNames) {
				const root = name.split(/[.[\]]/)[0];
				pending.push(properties?.find((property) => property.name === root)?.displayName ?? name);
			}
		}
		return {
			id: group.id,
			title: groupName(group),
			hasAction: Boolean(
				group.credential &&
					!group.credential.isDone &&
					oauth.isOAuthCredentialType(group.credential.item.credentialType) &&
					oauth.canOAuthCredentialQuickConnect(group.credential.item.credentialType) &&
					credentialsStore.getUsableCredentialByType(group.credential.item.credentialType)
						.length === 0,
			),
			completed:
				(!group.credential || group.credential.isDone) &&
				group.parameters.every((row) => row.isDone),
			subtitle: pending.length
				? i18n.baseText('instanceAi.setupPanel.needs', {
						interpolate: { items: [...new Set(pending)].join(', ') },
					})
				: undefined,
			disabled: group.credential
				? !isCredentialProjectReady.value ||
					!credentialsReady.value ||
					!credentialsStore.getCredentialTypeByName(group.credential.item.credentialType)
				: !group.parameters.some((row) => getNodeByName(row.item.nodeName)),
		};
	}),
);

const parameterEditors = computed(() =>
	(selectedGroup.value?.parameters ?? []).flatMap((row) => {
		const node = getNodeByName(row.item.nodeName);
		return node ? [{ item: row.item, node, isComplete: row.isDone }] : [];
	}),
);

// --- Apply paths (T6 actions; row done-ness re-derives after each write) ---

const isApplying = ref(false);
const credentialBusy = ref(false);
const credentialHasChanges = ref(false);
const dirtyParameters = shallowReactive(new Set<string>());
const requestingExecution = ref(false);
const isChatBusy = computed(
	() => thread.isStreaming || thread.isSendingMessage || thread.isAwaitingConfirmation,
);
const allRowsDone = computed(() => rows.value.length > 0 && rows.value.every((row) => row.isDone));
const hasChanges = computed(() => credentialHasChanges.value || dirtyParameters.size > 0);
const terminalStatus = computed(() => {
	if (!allRowsDone.value || hasChanges.value) return 'incomplete';
	if (requestingExecution.value) return 'executing';
	if (isAgentBuilding.value) return 'incomplete';
	if (
		rowSource.value !== 'derived' ||
		!credentialsReady.value ||
		isApplying.value ||
		actions.isApplying.value ||
		actions.pendingApplyCount.value > 0 ||
		credentialBusy.value ||
		connectingItemId.value
	)
		return 'validating';
	return 'complete';
});

watch(
	[
		() => rows.value.some((row) => !row.isDone),
		hasChanges,
		rowSource,
		credentialsReady,
		isAgentBuilding,
	],
	([pending, dirty, source, ready, building]) => {
		if (dirty || (pending && ((source === 'derived' && ready) || building)))
			setupDismissed.value = false;
	},
	{ immediate: true },
);

async function onExecute() {
	if (terminalStatus.value !== 'complete' || isChatBusy.value || requestingExecution.value) return;
	const workflowId = props.workflowId;
	requestingExecution.value = true;
	try {
		const result = await execution.executeWorkflow();
		if (
			result?.notified &&
			props.workflowId === workflowId &&
			allRowsDone.value &&
			!hasChanges.value &&
			!actions.isApplying.value &&
			actions.pendingApplyCount.value === 0
		) {
			setupDismissed.value = true;
			panelTelemetry.trackDismissed('execution_finished');
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('instanceAi.setupPanel.executeError'));
	} finally {
		requestingExecution.value = false;
	}
}

async function connectFromRow(id: string, advanced = false) {
	const group = groupById(id);
	const item = group?.credential?.item;
	const projectId = credentialProjectId.value;
	if (!group || !item || !projectId || connectingItemId.value) return;
	const workflowId = props.workflowId;
	const nodeName = item.nodeBindings?.find((binding) => getNodeByName(binding.nodeName))?.nodeName;
	const node = nodeName ? getNodeByName(nodeName) : undefined;
	const bind = async (credentialId: string) => {
		if (!active || props.workflowId !== workflowId) return;
		await onBindCredential(item, credentialId);
		if (active && props.workflowId === workflowId && group.parameters.length > 0)
			selectedItemId.value = id;
	};
	panelTelemetry.trackConnectionStarted(item, advanced ? 'advanced' : 'oauth');
	if (advanced) {
		uiStore.openNewCredential(
			item.credentialType,
			false,
			true,
			projectId,
			undefined,
			node?.name,
			node,
			{
				closeOnSave: true,
				credentialSetupHint: item.setupHint,
				workflowId,
				onCredentialCreated: (credential) => {
					void bind(credential.id);
				},
			},
		);
		return;
	}
	connectingItemId.value = id;
	try {
		const credential = await oauth.createAndAuthorize(item.credentialType, node?.type, {
			projectId,
			workflowId,
		});
		if (credential) await bind(credential.id);
	} catch (error) {
		if (active) toast.showError(error, i18n.baseText('instanceAi.setupPanel.connectionError'));
	} finally {
		connectingItemId.value = undefined;
	}
}

async function notifyApplyResult(result: SetupPanelApplyResult) {
	if (result === 'error' || result === 'conflict') {
		toast.showMessage({ title: i18n.baseText('instanceAi.setupPanel.applyError'), type: 'error' });
	}
	if (result === 'applied' || result === 'noop' || result === 'dropped' || result === 'conflict') {
		await refreshWorkflow();
	}
}

async function onBindCredential(item: SetupCredentialItem, credentialId: string) {
	if (credentialId === AI_GATEWAY_MANAGED_TAG) {
		const result = await actions.bindCredential(item, {
			id: null,
			name: '',
			__aiGatewayManaged: true,
		});
		await notifyApplyResult(result);
		panelTelemetry.trackConnectionCompleted(item, null, result);
		return;
	}
	const credential = credentialsStore.getCredentialById(credentialId);
	if (!credential) return;
	void testCredentialInBackground(credential.id, credential.name, item.credentialType);
	const result = await actions.bindCredential(item, { id: credential.id, name: credential.name });
	await notifyApplyResult(result);
	panelTelemetry.trackConnectionCompleted(item, credential.id, result);
}

async function onApplyParameters(
	nodeName: string,
	values: INodeParameters,
	baseline?: INodeParameters,
) {
	isApplying.value = true;
	try {
		await notifyApplyResult(await actions.applyParameterValues(nodeName, values, baseline));
	} finally {
		isApplying.value = false;
	}
}
</script>

<template>
	<N8nSetupPanel
		v-if="!setupDismissed"
		v-model:active-item-id="selectedItemId"
		:items="panelItems"
		:status="terminalStatus"
		:execute-disabled="isChatBusy || requestingExecution"
		data-test-id="instance-ai-setup-panel"
		@execute="onExecute"
	>
		<template #action="{ item }">
			<N8nSetupConnection
				:connected="false"
				:action-label="i18n.baseText('instanceAi.setupPanel.connect')"
				action-variant="subtle"
				:actions="[{ id: 'advanced', label: i18n.baseText('instanceAi.setupPanel.advancedSetup') }]"
				:disabled="item.disabled || Boolean(connectingItemId)"
				:loading="connectingItemId === item.id"
				@action="connectFromRow(item.id)"
				@select="connectFromRow(item.id, true)"
			/>
		</template>
		<template #icon="{ item }">
			<CredentialIcon
				v-if="groupById(item.id)?.credential"
				:credential-type-name="groupById(item.id)?.credential?.item.credentialType ?? ''"
				:size="16"
			/>
			<NodeIcon
				v-else-if="groupById(item.id)?.node"
				:node-type="groupNodeType(item.id)"
				:size="16"
			/>
			<N8nIcon v-else icon="sliders-horizontal" size="small" />
		</template>
		<template #detail>
			<div v-if="selectedGroup" :class="$style.detail">
				<InstanceAiSetupCredential
					v-if="selectedGroup.credential && credentialProjectId"
					:key="selectedGroup.credential.item.id"
					:item="selectedGroup.credential.item"
					:node="selectedNode"
					:nodes="selectedNodes"
					:workflow-id="workflowId"
					:project-id="credentialProjectId"
					@bind-credential="onBindCredential"
					@update:busy="credentialBusy = $event"
					@update:has-changes="credentialHasChanges = $event"
					@connect-started="
						panelTelemetry.trackConnectionStarted(selectedGroup.credential.item, $event)
					"
				/>
				<template v-if="!selectedGroup.credential || selectedGroup.credential.isDone">
					<div v-for="editor in parameterEditors" :key="editor.item.id">
						<N8nText v-if="parameterEditors.length > 1" size="small" bold>
							{{ editor.node.name }}
						</N8nText>
						<InstanceAiSetupPanelDetail
							:item="editor.item"
							:node="editor.node"
							:workflow-id="workflowId"
							:project-id="credentialProjectId"
							:is-applying="isApplying"
							:is-complete="editor.isComplete"
							@apply-parameters="onApplyParameters"
							@update:has-changes="
								$event
									? dirtyParameters.add(editor.item.id)
									: dirtyParameters.delete(editor.item.id)
							"
						/>
					</div>
				</template>
			</div>
		</template>
	</N8nSetupPanel>
</template>

<style lang="scss" module>
.detail {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}
</style>
