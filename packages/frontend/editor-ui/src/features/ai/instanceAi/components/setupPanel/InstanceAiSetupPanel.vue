<script lang="ts" setup>
import {
	computed,
	onScopeDispose,
	provide,
	ref,
	shallowReactive,
	useTemplateRef,
	watch,
} from 'vue';
import { useLocalStorage, usePreferredReducedMotion, useTimeoutFn } from '@vueuse/core';
import { useUsersStore } from '@n8n/stores/users.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	N8nSetupPanel,
	N8nButton,
	N8nIcon,
	N8nText,
	N8nPopover,
	type SetupPanelItem,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { shouldAutoResolveCredential } from '@n8n/api-types';
import { NodeHelpers } from 'n8n-workflow';
import { useToast } from '@n8n/composables/useToast';
import type { INodeUi } from '@/Interface';
import {
	LOCAL_STORAGE_INSTANCE_AI_SETUP_ITEMS,
	LOCAL_STORAGE_INSTANCE_AI_SETUP_DISMISSED,
	LOCAL_STORAGE_INSTANCE_AI_SETUP_COACHMARK_SEEN,
	ResourceLocatorDropdownTeleportedKey,
} from '@/app/constants';
import { getWorkflow } from '@/app/api/workflows';
import { SETUP_PANEL_SUCCESS_DELAY } from '@/app/constants/durations';
import { deriveHomeProject } from '@/app/stores/workflowDocument.store';
import type { InstanceAiCredentialContext } from '@/app/composables/useInstanceAiEditorCapability';
import NodeIcon from '@/app/components/NodeIcon.vue';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import { getAppNameFromCredType, getAppNameFromNodeName } from '@/app/utils/nodeTypesUtils';
import { deriveServiceName } from '@/features/credentials/templatedAuth.utils';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useCredentialOAuth } from '@/features/credentials/composables/useCredentialOAuth';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useCredentialTestInBackground } from '@/features/credentials/composables/useCredentialTestInBackground';
import { useThread } from '../../instanceAi.store';
import { useSetupPanelState, type SetupPanelRow } from '../../composables/useSetupPanelState';
import { useSetupPanelExecution } from '../../composables/useSetupPanelExecution';
import {
	buildInstanceAiArtifactCredentialQuestion,
	buildInstanceAiCredentialHandoffContext,
} from '../../composables/useInstanceAiHandoff';
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
import { applySetupParameterChanges } from '../../setupPanelParameterChanges';

const props = defineProps<{
	/** Workflow selected from an artifact or an early setup announcement. */
	workflowId: string;
	projectId?: string;
}>();
const emit = defineEmits<{
	'update:overlapHeight': [height: number];
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
const oauth = useCredentialOAuth();
const connectingItemId = ref<string>();
const reopenAuthorization = ref<() => void>();
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
	isRefreshingWorkflow,
	isCheckingOAuthCredentials,
	isAgentBuilding,
	isAwaitingFirstBuild,
	getNodeByName: getSavedNodeByName,
	refreshWorkflow,
	workflowProjectId,
	isItemDone,
	isCredentialConfigured,
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
	threadId: thread.id,
	workflowId: () => props.workflowId,
	isAgentBuilding,
	onFlushResult: notifyApplyResult,
	onSaved: (workflow) => panelTelemetry.trackSaved(workflow),
});

function getNodeByName(name: string, includePendingParameters = true): INodeUi | undefined {
	const node = getSavedNodeByName(name);
	if (!node) return undefined;
	let credentials = node.credentials;
	for (const { item } of rows.value) {
		if (
			item.kind !== 'credential' ||
			!item.nodeBindings?.some((binding) => binding.nodeName === name)
		)
			continue;
		const pending = actions.getPendingCredential(item.id, name);
		if (pending) credentials = { ...credentials, [item.credentialType]: pending };
	}
	const changes = includePendingParameters ? actions.getPendingParameterChanges(name) : [];
	if (credentials === node.credentials && changes.length === 0) return node;
	return {
		...node,
		credentials,
		parameters: changes.length
			? applySetupParameterChanges(node.parameters, changes)
			: node.parameters,
	};
}

// Show submitted values while writes wait. Execute still requires the saved rows to be complete.
const displayedRows = computed(() =>
	rows.value.map((row) => {
		if (row.item.kind === 'credential') {
			const pending = actions.getPendingCredential(row.item.id);
			if (pending && !row.item.nodeBindings?.length)
				return { ...row, isDone: isCredentialConfigured(pending) };
			const hasPending =
				pending ||
				row.item.nodeBindings?.some(({ nodeName }) =>
					actions.getPendingCredential(row.item.id, nodeName),
				);
			return hasPending ? { ...row, isDone: isItemDone(row.item, getNodeByName) } : row;
		}
		return actions.getPendingParameterChanges(row.item.nodeName).length
			? { ...row, isDone: isItemDone(row.item, getNodeByName) }
			: row;
	}),
);

const execution = useSetupPanelExecution({ thread, workflowId: () => props.workflowId });

const selectedItemId = ref<string>();
// Persist dismissal, not completion. New requirements reopen the panel.
const setupDismissedKey = computed(() =>
	LOCAL_STORAGE_INSTANCE_AI_SETUP_DISMISSED(
		usersStore.currentUserId ?? '',
		thread.id,
		props.workflowId,
	),
);
const setupDismissed = useLocalStorage(setupDismissedKey, false, { writeDefaults: false });
watch(
	() => props.workflowId,
	() => {
		selectedItemId.value = undefined;
		oauth.cancelAuthorize();
		clearDetailState();
		lastDetailId = undefined;
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
const credentialsReady = computed(
	() =>
		credentialsAvailable.value && !isRefreshingWorkflow.value && !isCheckingOAuthCredentials.value,
);
const selectingExisting = ref(new Set<string>());
watch(
	[rows, credentialsReady, () => credentialsStore.usableCredentials],
	async ([currentRows, ready]) => {
		if (!ready) return;
		const workflowId = props.workflowId;
		const selections = currentRows.flatMap(({ item }) => {
			if (
				item.kind !== 'credential' ||
				item.nodeBindings?.length ||
				item.preferNew ||
				actions.getPendingCredential(item.id) ||
				selectingExisting.value.has(item.id)
			)
				return [];
			const credentials = credentialsStore.getUsableCredentialByType(item.credentialType);
			return shouldAutoResolveCredential(item.credentialType, credentials.length)
				? [{ item, credential: credentials[0] }]
				: [];
		});
		if (!selections.length) return;
		// Hide all automatic selections before any asynchronous save can expose a partial list.
		selectingExisting.value = new Set([
			...selectingExisting.value,
			...selections.map(({ item }) => item.id),
		]);
		for (const { item, credential } of selections) {
			try {
				if (props.workflowId === workflowId)
					await actions.bindCredential(item, { id: credential.id, name: credential.name });
			} finally {
				selectingExisting.value.delete(item.id);
			}
		}
	},
	{ immediate: true, flush: 'sync' },
);

function needsInitialAction(row: SetupPanelRow) {
	return (
		!row.isDone &&
		(row.item.kind === 'parameters' ||
			(credentialsReady.value && !selectingExisting.value.has(row.item.id)))
	);
}

watch(
	() => displayedRows.value.filter(needsInitialAction),
	(currentRows) => {
		const added = currentRows.filter((row) => !shownItemIds.value.includes(row.item.id));
		if (added.length)
			shownItemIds.value = [...shownItemIds.value, ...added.map((row) => row.item.id)];
	},
	{ immediate: true, flush: 'sync' },
);
const groups = computed(() =>
	groupSetupPanelRows(displayedRows.value, {
		workflowId: props.workflowId,
		getNodeByName,
		getNodeType: nodeType,
	}).filter((group) => {
		const items = [...(group.credential ? [group.credential] : []), ...group.parameters];
		return (
			group.id === selectedItemId.value ||
			items.some((row) => shownItemIds.value.includes(row.item.id)) ||
			items.some(needsInitialAction)
		);
	}),
);
const panelTelemetry = useSetupPanelTelemetry({
	workflowId: () => props.workflowId,
	thread,
	rows,
	groups,
	shownItemIds,
	getNodeByName: getSavedNodeByName,
	isItemDone,
	isAgentBuilding,
	ready: () =>
		!setupDismissed.value &&
		credentialsReady.value &&
		(rowSource.value === 'derived' || rows.value.length > 0),
});
defineExpose({ getChatTelemetryContext: panelTelemetry.getChatTelemetryContext });
const selectedGroup = computed(() =>
	groups.value.find((group) => group.id === selectedItemId.value),
);
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
			getAppNameFromNodeName(
				getAppNameFromCredType(
					item.appDisplayName ??
						credentialsStore.getCredentialTypeByName(item.credentialType)?.displayName ??
						item.credentialType,
				),
			)
		);
	return group.node
		? getAppNameFromNodeName(nodeType(group.node)?.displayName ?? group.node.name)
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
					(connectingItemId.value === group.id ||
						credentialsStore.getUsableCredentialByType(group.credential.item.credentialType)
							.length === 0),
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
					!credentialsAvailable.value ||
					!credentialsStore.getCredentialTypeByName(group.credential.item.credentialType)
				: !group.parameters.some((row) => getNodeByName(row.item.nodeName)),
		};
	}),
);

watch(
	() =>
		selectedItemId.value &&
		panelItems.value.find((item) => item.id === selectedItemId.value && !item.disabled),
	(item) => {
		if (selectedItemId.value && !item) {
			selectedItemId.value = undefined;
			clearDetailState();
		}
	},
);
const parameterEditors = computed(() =>
	(selectedGroup.value?.parameters ?? []).flatMap((row) => {
		// Keep saved parameters as the baseline, so a failed write leaves the input editable.
		const node = getNodeByName(row.item.nodeName, false);
		return node
			? [
					{
						item: row.item,
						node,
						pendingChanges: actions.getPendingParameterChanges(row.item.nodeName),
					},
				]
			: [];
	}),
);

const perNodeGroups = shallowReactive(new Set<string>());
const perNodeCredentials = computed(() => {
	const group = selectedGroup.value;
	if (!group?.credential || selectedNodes.value.length < 2) return false;
	if (perNodeGroups.has(group.id)) return true;
	const type = group.credential.item.credentialType;
	return (
		new Set(
			selectedNodes.value.map((node) => {
				const credential = node.credentials?.[type];
				return credential?.__aiGatewayManaged ? AI_GATEWAY_MANAGED_TAG : credential?.id;
			}),
		).size > 1
	);
});
const detailSections = computed(() => {
	const group = selectedGroup.value;
	if (!group) return [];
	const credential = group.credential?.item;
	const editors = parameterEditors.value.filter(({ item, node }) => {
		const type = nodeType(node);
		if (!type) return false;
		const values =
			NodeHelpers.getNodeParameters(type.properties, node.parameters, true, true, node, type) ??
			node.parameters;
		return type.properties.some(
			(property) =>
				property.type !== 'hidden' &&
				item.parameterNames.some((name) => name.split(/[.[\]]/)[0] === property.name) &&
				NodeHelpers.displayParameter(values, property, node, type),
		);
	});
	const nodes = credential ? selectedNodes.value : editors.map((editor) => editor.node);
	return [
		...(credential && !perNodeCredentials.value
			? [
					{
						id: group.id,
						title: undefined,
						credential,
						nodes: selectedNodes.value,
						editors: [],
						showParameters: false,
					},
				]
			: []),
		...nodes
			.filter(
				(node) =>
					perNodeCredentials.value || editors.some((editor) => editor.node.name === node.name),
			)
			.map((node) => ({
				id: `node:${node.name}`,
				title: nodes.length > 1 ? node.name : undefined,
				credential:
					credential && perNodeCredentials.value
						? {
								...credential,
								id: `${credential.id}:${node.name}`,
								nodeBindings: [{ nodeName: node.name }],
							}
						: undefined,
				nodes: [node],
				editors: editors.filter((editor) => editor.node.name === node.name),
				showParameters:
					credential && perNodeCredentials.value
						? isCredentialConfigured(node.credentials?.[credential.credentialType])
						: !group.credential || group.credential.isDone,
			})),
	].filter(
		(section) => section.credential || (section.showParameters && section.editors.length > 0),
	);
});
const parameterEditorComponents = useTemplateRef<
	Array<InstanceType<typeof InstanceAiSetupPanelDetail>>
>('parameterEditorComponents');
const showParameterConfirm = computed(() =>
	detailSections.value.some((section) => section.showParameters && section.editors.length > 0),
);

// --- Apply paths (T6 actions; row done-ness re-derives after each write) ---

const isApplying = ref(false);
const busyCredentials = shallowReactive(new Set<string>());
const dirtyCredentials = shallowReactive(new Set<string>());
const credentialBusy = computed(() => busyCredentials.size > 0);
const credentialHasChanges = computed(() => dirtyCredentials.size > 0);
const dirtyParameters = shallowReactive(new Set<string>());
const requestingExecution = execution.isRunning;
const isChatBusy = computed(
	() => thread.isStreaming || thread.isSendingMessage || thread.isAwaitingConfirmation,
);

const setupPanel = useTemplateRef<HTMLElement>('setupPanel');
const setupCoachmarkSeen = useLocalStorage(
	() => LOCAL_STORAGE_INSTANCE_AI_SETUP_COACHMARK_SEEN(usersStore.currentUserId ?? ''),
	false,
	{ writeDefaults: false },
);
const showSetupCoachmark = ref(false);
const canShowSetupCoachmark = computed(
	() =>
		Boolean(usersStore.currentUserId && setupPanel.value) &&
		(isAgentBuilding.value || (isAwaitingFirstBuild.value && thread.isStreaming)) &&
		!setupDismissed.value &&
		!selectedItemId.value &&
		panelItems.value.some((item) => !item.completed && !item.disabled),
);
watch(
	[canShowSetupCoachmark, () => usersStore.currentUserId, () => props.workflowId],
	([available]) => {
		showSetupCoachmark.value = available && !setupCoachmarkSeen.value;
		if (showSetupCoachmark.value) setupCoachmarkSeen.value = true;
	},
	{ immediate: true, flush: 'post' },
);

async function onAskForHelp(credential: InstanceAiCredentialContext) {
	if (isChatBusy.value) return;
	await thread.sendMessage(buildInstanceAiArtifactCredentialQuestion(credential), {
		authorship: { kind: 'prefill', prefillType: 'handoff_credential_setup' },
		pushRef: rootStore.pushRef,
		handoffContext: buildInstanceAiCredentialHandoffContext(credential),
	});
}
const allRowsDone = computed(() => rows.value.length > 0 && rows.value.every((row) => row.isDone));
const hasChanges = computed(() => credentialHasChanges.value || dirtyParameters.size > 0);
const activeGroupComplete = computed(() => {
	const group = selectedGroup.value;
	return Boolean(
		group &&
			(!group.credential || group.credential.isDone) &&
			group.parameters.every((row) => row.isDone),
	);
});
const canAutoClose = ref(false);
const reducedMotion = usePreferredReducedMotion();
let selectionVersion = 0;
let lastDetailId: string | undefined;
const readyToReturn = computed(
	() =>
		canAutoClose.value &&
		activeGroupComplete.value &&
		!hasChanges.value &&
		!isApplying.value &&
		!actions.isApplying.value &&
		!credentialBusy.value &&
		!isRefreshingWorkflow.value &&
		!connectingItemId.value,
);
const { start: scheduleReturn, stop: cancelReturn } = useTimeoutFn(
	() => {
		if (readyToReturn.value) selectedItemId.value = undefined;
	},
	computed(() => (reducedMotion.value === 'reduce' ? 0 : SETUP_PANEL_SUCCESS_DELAY)),
	{ immediate: false },
);

function clearDetailState() {
	busyCredentials.clear();
	dirtyCredentials.clear();
	dirtyParameters.clear();
}

function onDetailClosed() {
	if (selectedItemId.value) return;
	clearDetailState();
	lastDetailId = undefined;
}

watch(
	selectedItemId,
	(id) => {
		selectionVersion++;
		cancelReturn();
		canAutoClose.value = Boolean(id && !activeGroupComplete.value);
		if (id && id !== lastDetailId) {
			clearDetailState();
			lastDetailId = id;
		}
	},
	{ flush: 'sync' },
);
watch(readyToReturn, (ready) => {
	cancelReturn();
	if (ready) scheduleReturn();
});

function finishSubmission(
	result: SetupPanelApplyResult,
	version: number | undefined,
	workflowId: string,
) {
	if (
		active &&
		props.workflowId === workflowId &&
		version === selectionVersion &&
		(result === 'applied' || result === 'noop' || result === 'queued')
	)
		canAutoClose.value = true;
}

const terminalStatus = computed(() => {
	if (!allRowsDone.value || hasChanges.value) return 'incomplete';
	if (requestingExecution.value) return 'executing';
	if (isAgentBuilding.value || isAwaitingFirstBuild.value) return 'incomplete';
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
	const dismissedKey = setupDismissedKey.value;
	try {
		const result = await execution.executeWorkflow();
		if (!active || !result?.notified) return;
		if (props.workflowId !== workflowId) {
			// On return, the pending-row watcher reopens setup if this workflow needs more input.
			localStorage.setItem(dismissedKey, 'true');
			return;
		}
		if (
			allRowsDone.value &&
			!isAgentBuilding.value &&
			!hasChanges.value &&
			!actions.isApplying.value &&
			actions.pendingApplyCount.value === 0
		) {
			setupDismissed.value = true;
			panelTelemetry.trackDismissed('execution_finished');
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('instanceAi.setupPanel.executeError'));
	}
}

async function connectFromRow(id: string) {
	if (connectingItemId.value === id && reopenAuthorization.value) {
		reopenAuthorization.value();
		return;
	}
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
		if (
			active &&
			props.workflowId === workflowId &&
			groupById(id)?.parameters.some((row) => !row.isDone)
		)
			selectedItemId.value = id;
	};
	panelTelemetry.trackConnectionStarted(item, 'oauth');
	connectingItemId.value = id;
	try {
		const credential = await oauth.createAndAuthorize(item.credentialType, node?.type, {
			projectId,
			workflowId,
			onAuthorizationStarted: (reopen) => {
				reopenAuthorization.value = reopen;
			},
		});
		if (credential) await bind(credential.id);
	} catch (error) {
		if (active) toast.showError(error, i18n.baseText('instanceAi.setupPanel.connectionError'));
	} finally {
		reopenAuthorization.value = undefined;
		connectingItemId.value = undefined;
	}
}

async function notifyApplyResult(result: SetupPanelApplyResult, workflowId: string) {
	if (!active || props.workflowId !== workflowId) return;
	if (result === 'error' || result === 'conflict') {
		toast.showMessage({ title: i18n.baseText('instanceAi.setupPanel.applyError'), type: 'error' });
	}
	if (result === 'applied' || result === 'noop' || result === 'dropped' || result === 'conflict') {
		await refreshWorkflow();
	}
}

async function onBindCredential(item: SetupCredentialItem, credentialId: string) {
	const workflowId = props.workflowId;
	const version =
		selectedGroup.value?.credential?.item.credentialType === item.credentialType
			? selectionVersion
			: undefined;
	if (credentialId === AI_GATEWAY_MANAGED_TAG) {
		const result = await actions.bindCredential(item, {
			id: null,
			name: '',
			__aiGatewayManaged: true,
		});
		await notifyApplyResult(result, workflowId);
		panelTelemetry.trackConnectionCompleted(item, null, result);
		finishSubmission(result, version, workflowId);
		return;
	}
	const credential =
		(credentialsStore.hasUsableCredentialsForScope({ workflowId })
			? credentialsStore.getUsableCredentialById(credentialId)
			: undefined) ?? credentialsStore.getCredentialById(credentialId);
	if (!credential) return;
	void testCredentialInBackground(credential.id, credential.name, item.credentialType);
	const result = await actions.bindCredential(item, { id: credential.id, name: credential.name });
	await notifyApplyResult(result, workflowId);
	panelTelemetry.trackConnectionCompleted(item, credential.id, result);
	finishSubmission(result, version, workflowId);
}

async function onConfirmParameters() {
	if (isApplying.value || credentialBusy.value) return;
	const editors = parameterEditorComponents.value ?? [];
	const submissions = editors.flatMap((editor) => {
		const submission = editor.getSubmission();
		return submission ? [submission] : [];
	});
	if (!submissions.length) return;
	const workflowId = props.workflowId;
	const version = selectionVersion;
	isApplying.value = true;
	try {
		const result = await actions.applyParameterBatch(submissions);
		await notifyApplyResult(result, workflowId);
		finishSubmission(result, version, workflowId);
	} finally {
		isApplying.value = false;
	}
}
</script>

<template>
	<div v-if="!setupDismissed && panelItems.length" ref="setupPanel">
		<N8nSetupPanel
			:key="workflowId"
			v-model:active-item-id="selectedItemId"
			:items="panelItems"
			:status="terminalStatus"
			:execute-disabled="isChatBusy || requestingExecution"
			data-test-id="instance-ai-setup-panel"
			@execute="onExecute"
			@detail-closed="onDetailClosed"
			@update:overlap-height="emit('update:overlapHeight', $event)"
		>
			<template #action="{ item }">
				<N8nButton
					size="small"
					variant="subtle"
					:disabled="
						item.disabled ||
						Boolean(connectingItemId && (connectingItemId !== item.id || !reopenAuthorization))
					"
					:loading="connectingItemId === item.id && !reopenAuthorization"
					@click="connectFromRow(item.id)"
				>
					{{ i18n.baseText('instanceAi.setupPanel.connect') }}
				</N8nButton>
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
			<template #detail="{ item }">
				<div v-if="selectedGroup" :class="$style.detail">
					<section
						v-for="section in detailSections"
						:key="section.id"
						:class="[$style.section, { [$style.divided]: section.title }]"
					>
						<N8nText
							v-if="section.title"
							tag="h3"
							size="medium"
							bold
							:class="$style.sectionTitle"
							>{{ section.title }}</N8nText
						>
						<InstanceAiSetupCredential
							v-if="section.credential && credentialProjectId"
							:key="section.credential.id"
							:item="section.credential"
							:node="section.nodes[0]"
							:pending-credential="actions.getPendingCredential(section.credential.id)"
							:nodes="section.nodes"
							:workflow-id="workflowId"
							:project-id="credentialProjectId"
							:help-disabled="isChatBusy"
							:allow-per-node="!perNodeCredentials && selectedNodes.length > 1"
							@set-credentials-per-node="perNodeGroups.add(item.id)"
							@ask-for-help="onAskForHelp"
							@bind-credential="
								(credential, id) => selectedItemId === item.id && onBindCredential(credential, id)
							"
							@update:busy="
								(selectedItemId === item.id || (!selectedItemId && !$event)) &&
								($event ? busyCredentials.add(section.id) : busyCredentials.delete(section.id))
							"
							@update:has-changes="
								(selectedItemId === item.id || (!selectedItemId && !$event)) &&
								($event ? dirtyCredentials.add(section.id) : dirtyCredentials.delete(section.id))
							"
							@connect-started="
								selectedItemId === item.id &&
								panelTelemetry.trackConnectionStarted(section.credential, $event)
							"
						/>
						<template v-if="section.showParameters">
							<div v-for="editor in section.editors" :key="editor.item.id">
								<InstanceAiSetupPanelDetail
									ref="parameterEditorComponents"
									:item="editor.item"
									:node="editor.node"
									:workflow-id="workflowId"
									:project-id="credentialProjectId"
									:pending-changes="editor.pendingChanges"
									@update:has-changes="
										(selectedItemId === item.id || (!selectedItemId && !$event)) &&
										($event
											? dirtyParameters.add(editor.item.id)
											: dirtyParameters.delete(editor.item.id))
									"
								/>
							</div>
						</template>
					</section>
					<div v-if="showParameterConfirm" :class="$style.footer">
						<N8nButton
							size="small"
							:disabled="dirtyParameters.size === 0 || isApplying || credentialBusy"
							:loading="isApplying"
							data-test-id="instance-ai-setup-panel-confirm"
							@click="onConfirmParameters"
						>
							{{ i18n.baseText(activeGroupComplete ? 'generic.update' : 'generic.confirm') }}
						</N8nButton>
					</div>
				</div>
			</template>
		</N8nSetupPanel>
		<N8nPopover
			:open="showSetupCoachmark"
			:reference="setupPanel ?? undefined"
			side="top"
			align="start"
			show-arrow
			:enable-scrolling="false"
			suppress-auto-focus
			width="calc(var(--spacing--5xl) + var(--spacing--3xl))"
			@update:open="showSetupCoachmark = $event && showSetupCoachmark"
		>
			<template #content>
				<div :class="$style.coachmark" data-test-id="instance-ai-setup-coachmark">
					<N8nText tag="p" size="small" role="status">{{
						i18n.baseText('instanceAi.setupPanel.earlySetupCoachmark')
					}}</N8nText>
					<N8nButton size="small" @click="showSetupCoachmark = false">{{
						i18n.baseText('instanceAi.setupPanel.dismissCoachmark')
					}}</N8nButton>
				</div>
			</template>
		</N8nPopover>
	</div>
</template>

<style lang="scss" module>
.detail,
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}
.section + .divided {
	border-top: var(--border);
	padding-top: var(--spacing--sm);
}

.sectionTitle {
	margin: 0;
}

.footer {
	display: flex;
	justify-content: flex-end;
}

.coachmark {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);

	p {
		margin: 0;
	}
}
</style>
