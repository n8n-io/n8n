<script setup lang="ts">
import type { ICredentialsResponse } from '../credentials.types';
import type { INodeUi, INodeUpdatePropertiesInformation } from '@/Interface';
import type {
	ICredentialType,
	INodeCredentialDescription,
	INodeCredentials,
	INodeCredentialsDetails,
	INodeParameters,
	NodeParameterValueType,
} from 'n8n-workflow';
import { resolveSupportedCredentialActivation } from 'n8n-workflow';
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import {
	hasProxyAuth,
	getAppNameFromCredType,
	getAuthTypeForNodeCredential,
	getInactiveCredentials,
	getNodeCredentialForSelectedAuthType,
	updateNodeAuthType,
} from '@/app/utils/nodeTypesUtils';
import { useToast } from '@n8n/composables/useToast';
import { useEditorContext } from '@/app/composables/useEditorContext';
import {
	useInstanceAiEditorCapability,
	type InstanceAiCredentialHelpHandler,
} from '@/app/composables/useInstanceAiEditorCapability';

import TitledList from '@/app/components/TitledList.vue';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { ChatHubToolContextKey, CREDENTIAL_ONLY_NODE_PREFIX } from '@/app/constants';
import { ndvEventBus } from '@/features/ndv/shared/ndv.eventBus';
import { useCredentialsStore, type CredentialFetchScope } from '../credentials.store';
import { useQuickConnect } from '../quickConnect/composables/useQuickConnect';
import { useCredentialOAuth } from '../composables/useCredentialOAuth';
import QuickConnectButton from '../quickConnect/components/QuickConnectButton.vue';
import { injectNDVStoreIfProvided } from '@/features/ndv/shared/ndv.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { assert } from '@n8n/utils/assert';
import { isEmpty } from '@/app/utils/typesUtils';
import { getResourcePermissions } from '@n8n/permissions';
import {
	useNodeCredentialOptions,
	type CredentialDropdownOption,
} from '../composables/useNodeCredentialOptions';
import { getAutoSelectedCredential } from '../credentials.utils';
import { usePrivateCredentials } from '@/features/resolvers/composables/usePrivateCredentials';
import {
	AI_GATEWAY_MANAGED_TAG,
	SYSTEM_RESOLVER_ID,
	type InstanceAiCredentialSetupHint,
} from '@n8n/api-types';
import CredentialIcon from './CredentialIcon.vue';
import CredentialPrivateConnectionRow from './CredentialPrivateConnectionRow.vue';
import { useAiGateway } from '@/app/composables/useAiGateway';
import { useAiGatewayTopUp } from '@/app/composables/useAiGatewayTopUp';

import {
	N8nActionPill,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nLink,
	N8nOption,
	N8nSelect,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
type Props = {
	node: INodeUi;
	overrideCredType?: NodeParameterValueType;
	readonly?: boolean;
	showAll?: boolean;
	hideIssues?: boolean;
	skipAutoSelect?: boolean;
	/** The user asked for a fresh credential (Instance AI setup surfaces). Nothing
	 *  is preselected, and the empty picker invites creation ("Connect to X")
	 *  instead of reading as a list to choose from. Existing credentials stay
	 *  selectable — the user may change their mind once they see them. */
	preferNewCredential?: boolean;
	/** Workflow this credential slot belongs to, for telemetry attribution. Standalone
	 *  hosts (Instance AI setup card) must pass it — they render without a provided
	 *  workflow document; other hosts fall back to the injected document. */
	workflowId?: string;
	/** When true, skip all global store writes (workflowsStore, nodeHelpers).
	 *  Used by Instance AI to render credential selection without polluting the active workflow. */
	standalone?: boolean;
	/** Project ID to scope new credential creation to the correct project. */
	projectId?: string;
	/** Pre-fill the credential name when creating a new credential. */
	suggestedCredentialName?: string;
	/** Hide the "Ask n8n AI" assistant button inside the credential editor.
	 *  Used by surfaces (e.g. agents) where the assistant flow isn't wired up. */
	hideAskAssistant?: boolean;
	/** Agent-supplied Templated Custom Auth recipe (Instance AI setup surfaces) —
	 *  passed to the credential modal so a CREATE opens pre-filled on the guided
	 *  simple view. */
	credentialSetupHint?: InstanceAiCredentialSetupHint;
	/** Replaces the type-derived field label ("Credential for X"). Only
	 *  meaningful with `overrideCredType` (a single credential row). */
	credentialsFieldLabel?: string;
	/** Host-supplied behavior for the credential modal's Instance AI help button,
	 *  overriding the injected editor capability. Instance AI setup cards use it —
	 *  the capability chain doesn't reach the chat panel they render in. */
	instanceAiCredentialHelp?: InstanceAiCredentialHelpHandler;
	/** Skip the component's own credential fetch on mount. Hosts with a
	 *  synthetic workflow document (e.g. the tool config modal) own the fetch
	 *  themselves — the component's own fetch would query the synthetic
	 *  document's nonexistent workflow id and replace the credential store
	 *  with the empty result. */
	skipCredentialsFetch?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	readonly: false,
	overrideCredType: '',
	showAll: false,
	hideIssues: false,
	skipAutoSelect: false,
	preferNewCredential: false,
	standalone: false,
	skipCredentialsFetch: false,
});

const emit = defineEmits<{
	credentialSelected: [credential: INodeUpdatePropertiesInformation];
	valueChanged: [value: { name: string; value: NodeParameterValueType }];
	blur: [source: string];
}>();

const telemetry = useTelemetry();
const i18n = useI18n();
const NEW_CREDENTIALS_TEXT = i18n.baseText('nodeCredentials.createNew');
const N8N_CREDITS_LABEL = i18n.baseText('aiGateway.credentialMode.n8nConnect.title');

const instanceAiCapability = useInstanceAiEditorCapability();
const { instanceAi } = useEditorContext();
const isToolContext = inject(ChatHubToolContextKey, false);

// The host's credential-help behavior, handed to the (teleported) credential
// modal that can't inject it. An explicit prop wins over the injected capability;
// undefined when neither exists → the modal shows no Instance AI button.
function resolveInstanceAiCredentialHelp(): InstanceAiCredentialHelpHandler | undefined {
	if (props.instanceAiCredentialHelp) return props.instanceAiCredentialHelp;
	const openCredential = instanceAiCapability.openCredential;
	if (!instanceAi.value || !openCredential) return undefined;
	return async (credential) => await openCredential(credential, 'credential_edit');
}

const credentialsStore = useCredentialsStore();
const nodeTypesStore = useNodeTypesStore();
const ndvStore = injectNDVStoreIfProvided();
const uiStore = useUIStore();
const projectsStore = useProjectsStore();
const workflowsStore = useWorkflowsStore();
const workflowDocumentStore = props.standalone ? undefined : injectWorkflowDocumentStore();
const telemetryWorkflowId = computed(
	() => props.workflowId ?? (props.standalone ? '' : workflowDocumentStore?.value.workflowId),
);
const { isEnabled: isPrivateCredentialsEnabled } = usePrivateCredentials();

// Quick connect
const {
	loading: quickConnectLoading,
	getQuickConnectOption,
	connect,
	cancelConnect,
} = useQuickConnect();
const { canOAuthCredentialQuickConnect, hasManualCredentialInputFields, authorize } =
	useCredentialOAuth();

const aiGateway = useAiGateway();
const { openTopUp } = useAiGatewayTopUp();

const balancePill = computed(() => {
	const balance = aiGateway.balance.value;
	if (balance === undefined) return undefined;
	const depleted = balance <= 0;
	return {
		text: depleted
			? i18n.baseText('aiGateway.wallet.noCredits')
			: i18n.baseText('aiGateway.wallet.balanceRemaining', {
					interpolate: { balance: `$${Number(balance).toFixed(2)}` },
				}),
		type: depleted ? ('danger' as const) : ('default' as const),
	};
});

function entryPlaceholder(credentialType: string): string {
	return i18n.baseText('nodeCredentials.quickConnect.connectTo', {
		interpolate: { provider: getServiceName(credentialType) },
	});
}

function selectedCredentialIcon(credentialType: string) {
	if (isAiGatewayManagedCredentials(credentialType)) return 'wallet' as const;
	if (!selected.value[credentialType]?.id) return undefined;
	return isCredentialResolvable(credentialType) ? ('user-round' as const) : ('key-round' as const);
}
const hideAskAssistant = computed(() => props.hideAskAssistant || isToolContext);

const canCreateCredentials = computed(
	() =>
		getResourcePermissions(
			projectsStore.currentProject?.scopes ?? projectsStore.personalProject?.scopes,
		).credential.create,
);

const nodeHelpers = useNodeHelpers();
const toast = useToast();

const subscribedToCredentialType = ref('');
const filter = ref('');
const openCredentialSelectType = ref<string | null>(null);
const listeningForAuthChange = ref(false);
const selectRefs = ref<Array<InstanceType<typeof N8nSelect>>>([]);

const node = computed(() => props.node);

const nodeType = computed(() =>
	nodeTypesStore.getNodeType(props.node.type, props.node.typeVersion),
);

const {
	mainNodeAuthField,
	credentialTypesNodeDescriptionDisplayed,
	credentialTypesNodeDescriptions,
	isCredentialExisting,
	showMixedCredentials,
} = useNodeCredentialOptions(
	node,
	nodeType,
	() => props.overrideCredType,
	() => props.showAll,
);

const credentialTypeNames = computed(() => {
	const returnData: Record<string, string> = {};

	for (const { name } of credentialTypesNodeDescriptions.value) {
		const credentialType = credentialsStore.getCredentialTypeByName(name);
		returnData[name] = credentialType ? credentialType.displayName : name;
	}

	return returnData;
});

const selected = computed<Record<string, INodeCredentialsDetails>>(
	() => props.node.credentials ?? {},
);

function isCredentialResolvable(credentialType: string): boolean {
	if (!isPrivateCredentialsEnabled.value) return false;
	const credentialId = selected.value[credentialType]?.id;
	if (!credentialId) return false;
	const credential = credentialsStore.getCredentialById(credentialId);
	return credential?.isResolvable === true;
}

function getSelectedPrivateCredential(credentialType: string): ICredentialsResponse | null {
	if (!isPrivateCredentialsEnabled.value) return null;
	const id = selected.value[credentialType]?.id;
	if (!id) return null;
	const credential = credentialsStore.getCredentialById(id);
	return credential?.isResolvable === true ? credential : null;
}

function isPrivateConnected(credentialType: string): boolean {
	return getSelectedPrivateCredential(credentialType)?.connectedByMe === true;
}

function canEditPrivateCredential(credentialType: string): boolean {
	const credential = getSelectedPrivateCredential(credentialType);
	return getResourcePermissions(credential?.scopes).credential.update === true;
}

function canConnectPrivateCredential(credentialType: string): boolean {
	const credential = getSelectedPrivateCredential(credentialType);
	return getResourcePermissions(credential?.scopes).credential.connect === true;
}

async function onConnectFromRow(credentialType: string): Promise<void> {
	const credential = getSelectedPrivateCredential(credentialType);
	if (!credential) return;
	const success = await authorize(credential);
	if (success) {
		credentialsStore.setConnectedByMe(credential.id, true, await fetchMyAccount(credential.id));
	}
}

/**
 * The provider account a fresh connection authenticates as, which only the
 * server can tell us. Purely a label — a failed lookup must not undo a
 * successful connection.
 */
async function fetchMyAccount(credentialId: string): Promise<string | undefined> {
	try {
		const credential = await credentialsStore.getCredentialData({ id: credentialId });
		return credential?.connectedAccountIdentifier;
	} catch {
		return undefined;
	}
}

async function onDisconnectFromRow(credentialType: string): Promise<void> {
	const credential = getSelectedPrivateCredential(credentialType);
	if (!credential) return;

	try {
		await credentialsStore.disconnectMyConnection({ id: credential.id });
		toast.showMessage({
			title: i18n.baseText('credentials.private.disconnected.success'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('credentials.private.disconnected.error'));
	}
}

// The connect / connected callout is only relevant when the workflow uses the
// default (system) resolver, where resolution maps to the n8n user's own
// connection. With a custom resolver (e.g. Slack, OAuth) the runtime account is
// chosen by the resolver, not the n8n user, so their own connection state is
// irrelevant and we don't surface it.
const isDefaultResolver = computed(() => {
	const resolverId = workflowDocumentStore?.value.settings?.credentialResolverId;
	return !resolverId || resolverId === SYSTEM_RESOLVER_ID;
});

// Whether the node's current resource/operation is runnable by the AI gateway.
// Nodes without an operation selected are treated as supported so gateway
// auto-selection still works for operation-agnostic nodes.
const isCurrentActionSupported = computed(() => {
	const params = props.node.parameters;
	const operation = params.operation as string | undefined;
	if (!operation) return true;
	const resource = params.resource as string | undefined;
	return aiGateway.isActionSupported(node.value.type, resource, operation);
});

watch(
	() => props.node.parameters,
	(newValue, oldValue) => {
		// When active node parameters change, check if authentication type has been changed
		// and set `subscribedToCredentialType` to corresponding credential type
		const isActive = props.node.name === ndvStore.value?.activeNode?.name;
		// Only do this for active node and if it's listening for auth change
		if (isActive && nodeType.value && listeningForAuthChange.value) {
			if (mainNodeAuthField.value && oldValue && newValue) {
				const newAuth = newValue[mainNodeAuthField.value.name];
				if (newAuth) {
					const authType =
						typeof newAuth === 'object' ? JSON.stringify(newAuth) : newAuth.toString();
					const credentialType = getNodeCredentialForSelectedAuthType(nodeType.value, authType);
					if (credentialType) {
						subscribedToCredentialType.value = credentialType.name;
					}
				}
			}
		}
	},
	{ immediate: true, deep: true },
);

// Started here rather than in `onMounted`: the request drops the slice held for a
// different workflow or project synchronously, and that has to happen before the
// watchers below and the first render read it — otherwise the picker's opening
// frame lists the previously opened scope's credentials.
const initialFetchScope = props.skipCredentialsFetch ? undefined : getCredentialFetchScope();
if (initialFetchScope) {
	void credentialsStore.fetchUsableCredentials(initialFetchScope);
}

let hasEvaluatedCredentials = false;

// Select most recent credential by default
watch(
	credentialTypesNodeDescriptionDisplayed,
	(types) => {
		if (props.skipAutoSelect) return;
		if (types.length === 0) return;
		// Before the scoped fetch lands there are no options to pick from, which would
		// read as "no credentials exist" and auto-enable the AI Gateway below. The
		// watcher re-fires once the fetch populates the slice.
		if (!credentialsStore.hasFetchedUsableCredentials) return;

		const isInitialEvaluation = !hasEvaluatedCredentials;
		hasEvaluatedCredentials = true;

		if (
			aiGateway.isEnabled.value &&
			!aiGateway.isNodeTypeVersionSupported(node.value.type, node.value.typeVersion)
		) {
			for (const { type } of types) {
				if (selected.value[type.name]?.__aiGatewayManaged) {
					onAiGatewaySelector(type.name, false, false);
				}
			}
		}

		if (!isEmpty(selected.value)) return;

		const autoSelected = getAutoSelectedCredential(node.value, props.overrideCredType);
		if (autoSelected) {
			onCredentialSelected(
				autoSelected.credentialType,
				autoSelected.credential.id,
				false, // showAuthOptions
				false, // isUserAction
			);
			return;
		}

		// No credentials available to select — auto-enable AI Gateway for supported
		// types, but only on the initial setup so a later action change doesn't
		// redirect the user onto n8n credits.
		if (aiGateway.isEnabled.value && isInitialEvaluation) {
			for (const { type } of types) {
				// Same rule as showAiGatewaySelector: supported type, or a sibling fallback.
				const gatewaySupported =
					aiGateway.isCredentialTypeSupported(type.name) ||
					resolveGatewayActivation(type.name) !== undefined;
				if (
					gatewaySupported &&
					aiGateway.isNodeTypeVersionSupported(node.value.type, node.value.typeVersion) &&
					isCurrentActionSupported.value
				) {
					onAiGatewaySelector(type.name, true, false);
				}
			}
		}
	},
	{ immediate: true },
);

function getCredentialFetchScope(): CredentialFetchScope | undefined {
	const workflowId = workflowDocumentStore?.value.workflowId;
	if (workflowId && !workflowsStore.isNewWorkflow) {
		return { workflowId };
	}

	const projectId =
		props.projectId ?? projectsStore.currentProject?.id ?? projectsStore.personalProject?.id;

	return projectId ? { projectId } : undefined;
}

onMounted(() => {
	credentialsStore.$onAction(({ name, after, args }) => {
		const listeningForActions = ['createNewCredential', 'updateCredential', 'deleteCredential'];
		const credentialType = subscribedToCredentialType.value;
		if (!credentialType) {
			return;
		}

		after(async (result) => {
			if (!listeningForActions.includes(name)) {
				return;
			}

			if (name === 'createNewCredential') {
				// If store update is skipped, it means the credential creation is part of an OAuth flow
				// the store will be updated on OAuth success, so we can ignore this action here
				const options = args[3];

				if (options?.skipStoreUpdate) {
					return;
				}
			}

			// Let the server decide whether the mutated credential is usable here rather
			// than optimistically inserting it — a credential edited from the command bar
			// may well belong to another project.
			const refetchScope = getCredentialFetchScope();
			if (refetchScope) {
				try {
					await credentialsStore.fetchUsableCredentials(refetchScope);
				} catch {
					// Fall through with whatever the store already holds.
				}
			}

			const current = selected.value[credentialType];
			let credentialsOfType: ICredentialsResponse[] = [];
			if (props.showAll) {
				if (props.node) {
					credentialsOfType = [...(credentialsStore.allUsableCredentialsForNode(props.node) || [])];
				}
			} else {
				credentialsOfType = [
					...(credentialsStore.allUsableCredentialsByType[credentialType] || []),
				];
			}
			switch (name) {
				// new credential was added
				case 'createNewCredential':
					if (result) {
						onCredentialSelected(credentialType, (result as ICredentialsResponse).id);
					}
					break;
				case 'updateCredential':
					const updatedCredential = result as ICredentialsResponse;
					// credential name was changed, update it
					if (updatedCredential.name !== current.name) {
						onCredentialSelected(credentialType, current.id);
					}
					break;
				case 'deleteCredential':
					// all credentials were deleted
					if (credentialsOfType.length === 0) {
						clearSelectedCredential(credentialType);
					} else {
						const id = args[0].id;
						// credential was deleted, select last one added to replace with
						if (current.id === id) {
							onCredentialSelected(
								credentialType,
								credentialsOfType[credentialsOfType.length - 1].id,
							);
						}
					}
					break;
			}
		});
	});

	ndvEventBus.on('credential.createNew', onCreateAndAssignNewCredential);

	void aiGateway.fetchConfig();
	void aiGateway.fetchWallet();

	// Clear stale AI Gateway managed credentials if the feature is disabled
	if (!aiGateway.isEnabled.value) {
		const credentials = { ...(props.node.credentials ?? {}) };
		let hasGatewayManaged = false;
		for (const [credType, credDetails] of Object.entries(credentials)) {
			if (credDetails.__aiGatewayManaged) {
				delete credentials[credType];
				hasGatewayManaged = true;
			}
		}
		if (hasGatewayManaged) {
			emit('credentialSelected', { name: props.node.name, properties: { credentials } });
		}
	}
});

onBeforeUnmount(() => {
	ndvEventBus.off('credential.createNew', onCreateAndAssignNewCredential);
	cancelConnect();
});

function getSelectedId(type: INodeCredentialDescription) {
	if (isAiGatewayManagedCredentials(type.name)) {
		return AI_GATEWAY_MANAGED_TAG;
	}
	if (isCredentialExisting(type)) {
		return selected.value[type.name].id;
	}
	return undefined;
}

function getSelectedName(type: string) {
	if (isAiGatewayManagedCredentials(type)) {
		return N8N_CREDITS_LABEL;
	}
	return selected.value?.[type]?.name;
}

function getSelectPlaceholder(type: string, issues: string[]) {
	if (issues.length && getSelectedName(type)) {
		return i18n.baseText('nodeCredentials.selectedCredentialUnavailable', {
			interpolate: { name: getSelectedName(type) },
		});
	}
	// Asked-for-fresh slots read as the create affordance they are, matching the
	// no-credentials-yet empty state instead of "Select Credential".
	if (props.preferNewCredential) return entryPlaceholder(type);
	return i18n.baseText('nodeCredentials.selectCredential');
}

function clearSelectedCredential(credentialType: string) {
	const node = props.node;

	const credentials = {
		...(node.credentials ?? {}),
	};

	delete credentials[credentialType];

	const updateInformation: INodeUpdatePropertiesInformation = {
		name: props.node.name,
		properties: {
			credentials,
		},
	};

	emit('credentialSelected', updateInformation);
}

function createNewCredential(
	credentialType: string,
	listenForAuthChange: boolean = false,
	showAuthOptions = false,
	forceManualMode = false,
) {
	if (listenForAuthChange) {
		// If new credential dialog is open, start listening for auth type change which should happen in the modal
		// this will be handled in this component's watcher which will set subscribed credential accordingly
		listeningForAuthChange.value = true;
		subscribedToCredentialType.value = credentialType;
	}

	uiStore.openNewCredential(
		credentialType,
		showAuthOptions,
		forceManualMode,
		props.projectId,
		props.suggestedCredentialName,
		props.node.name,
		props.node,
		{
			hideAskAssistant: hideAskAssistant.value,
			closeOnSave: true,
			...(isToolContext ? { appendToBody: true } : {}),
			instanceAiCredentialHelp: resolveInstanceAiCredentialHelp(),
			credentialSetupHint: props.credentialSetupHint,
			workflowId: telemetryWorkflowId.value || undefined,
		},
	);
	telemetry.track('User opened Credential modal', {
		credential_type: credentialType,
		source: 'node',
		new_credential: true,
		workflow_id: telemetryWorkflowId.value,
	});
}

function onCreateAndAssignNewCredential({
	type,
	showAuthOptions,
}: {
	type: string;
	showAuthOptions: boolean;
}) {
	createNewCredential(type, true, showAuthOptions);
}

function onCredentialSelected(
	credentialType: string,
	credentialId: string | null | undefined,
	showAuthOptions = false,
	isUserAction = true,
) {
	if (!credentialId) {
		createNewCredential(credentialType, false, showAuthOptions);
		return;
	}

	telemetry.track('User selected credential from node modal', {
		credential_type: credentialType,
		node_type: props.node.type,
		...(hasProxyAuth(props.node) ? { is_service_specific: true } : {}),
		workflow_id: telemetryWorkflowId.value,
		credential_id: credentialId,
	});

	// Attribution funnel: a picked stored credential is always a user's own (BYOK)
	// credential. Standalone hosts (Instance AI setup card) route the confirmed
	// selection through the backend, which attributes it as `source: 'instance-ai-*'`
	// — so only emit here for the manual canvas to avoid double-counting.
	if (isUserAction && !props.standalone) {
		telemetry.track('Node credential assigned', {
			credential_type: credentialType,
			node_type: props.node.type,
			workflow_id: workflowDocumentStore?.value.workflowId,
			credential_id: credentialId,
			credential_kind: 'own',
			source: 'user',
		});
	}

	const selectedCredentials = credentialsStore.getCredentialById(credentialId);
	const selectedCredentialsType = props.showAll ? selectedCredentials.type : credentialType;
	const oldCredentials = props.node.credentials?.[selectedCredentialsType] ?? null;

	const newSelectedCredentials: INodeCredentialsDetails = {
		id: selectedCredentials.id,
		name: selectedCredentials.name,
	};

	// if credentials has been string or neither id matched nor name matched uniquely.
	// A gateway-managed slot also has id: null but is a deliberate state, not an
	// invalid credential — repairing it would sweep every other n8n-credits node.
	if (
		!props.standalone &&
		!oldCredentials?.__aiGatewayManaged &&
		(oldCredentials?.id === null ||
			(oldCredentials?.id &&
				!credentialsStore.getCredentialByIdAndType(oldCredentials.id, selectedCredentialsType)))
	) {
		// update all nodes in the workflow with the same old/invalid credentials
		workflowDocumentStore?.value?.replaceInvalidWorkflowCredentials({
			credentials: newSelectedCredentials,
			invalid: oldCredentials,
			type: selectedCredentialsType,
		});
		nodeHelpers.updateNodesCredentialsIssues();
		toast.showMessage({
			title: i18n.baseText('nodeCredentials.showMessage.title'),
			message: i18n.baseText('nodeCredentials.showMessage.message', {
				interpolate: {
					oldCredentialName: oldCredentials.name,
					newCredentialName: newSelectedCredentials.name,
				},
			}),
			type: 'success',
		});
	}

	// Auto-assign credential to other matching nodes
	// Skip auto-assign for automatic/system actions (e.g., auto-selecting on mount)
	if (isUserAction && !props.standalone) {
		const updatedNodesCount =
			workflowDocumentStore?.value?.assignCredentialToMatchingNodes({
				credentials: newSelectedCredentials,
				type: selectedCredentialsType,
				currentNodeName: props.node.name,
			}) ?? 0;

		if (updatedNodesCount > 0) {
			nodeHelpers.updateNodesCredentialsIssues();
			toast.showMessage({
				title: i18n.baseText('nodeCredentials.showMessage.title'),
				message: i18n.baseText('nodeCredentials.autoAssigned.message', {
					interpolate: { count: String(updatedNodesCount) },
				}),
				type: 'success',
			});
		}
	}

	// If credential is selected from mixed credential dropdown, update node's auth filed based on selected credential
	if (props.showAll && mainNodeAuthField.value && !props.standalone) {
		const nodeCredentialDescription = nodeType.value?.credentials?.find(
			(cred) => cred.name === selectedCredentialsType,
		);
		const authOption = getAuthTypeForNodeCredential(nodeType.value, nodeCredentialDescription);
		if (authOption && workflowDocumentStore?.value) {
			updateNodeAuthType(
				workflowDocumentStore.value.updateNodeProperties,
				props.node,
				authOption.value,
			);
			const parameterData = {
				name: `parameters.${mainNodeAuthField.value.name}`,
				value: authOption.value,
			};
			emit('valueChanged', parameterData);
		}
	}

	const node = props.node;

	const credentials: INodeCredentials = {
		...(node.credentials ?? {}),
		[selectedCredentialsType]: newSelectedCredentials,
	};

	// Drop credential types the node no longer uses (e.g. after switching auth type),
	// so stale entries don't accumulate in the saved workflow. The type the user just
	// picked is always kept.
	const inactiveCredentials = getInactiveCredentials(
		{ ...node, credentials },
		nodeType.value,
	).filter((type) => type !== selectedCredentialsType);
	for (const credentialType of inactiveCredentials) {
		delete credentials[credentialType];
	}

	const updateInformation: INodeUpdatePropertiesInformation = {
		name: props.node.name,
		properties: {
			credentials,
		},
	};

	emit('credentialSelected', updateInformation);
}

function isAiGatewayManagedCredentials(credentialType: string): boolean {
	return aiGateway.isEnabled.value && selected.value[credentialType]?.__aiGatewayManaged === true;
}

// Credential type + activation parameters n8n credits should use for this row:
// the shown type if supported, else a supported sibling (whose auth the node
// switches to). See `resolveSupportedCredentialActivation`.
//
// The sibling fallback is limited to hosts consuming the full `credentialSelected`
// payload and `valueChanged` (NDV, tool config). Setup-flow hosts (setup panel,
// Instance AI — standalone or `overrideCredType`) key the payload by this row's
// type, so a sibling switch reads as a deselect and the auth change is lost.
function resolveGatewayActivation(credentialType: string) {
	if (!nodeType.value) return undefined;
	const activation = resolveSupportedCredentialActivation(
		nodeType.value,
		props.node,
		aiGateway.isCredentialTypeSupported,
		credentialType,
	);
	if (!activation) return undefined;
	const isSetupFlowHost =
		props.standalone ||
		(typeof props.overrideCredType === 'string' && props.overrideCredType !== '');
	if (activation.credentialType !== credentialType && isSetupFlowHost) return undefined;
	return activation;
}

function showAiGatewaySelector(credentialType: string): boolean {
	if (!aiGateway.isEnabled.value) return false;
	if (!aiGateway.isNodeTypeVersionSupported(node.value.type, node.value.typeVersion)) return false;
	if (isAiGatewayManagedCredentials(credentialType)) return true;
	// Shown type supported → toggle directly; otherwise fall back to a sibling.
	if (aiGateway.isCredentialTypeSupported(credentialType)) return true;
	return resolveGatewayActivation(credentialType) !== undefined;
}

// Persist the parameters that activate the chosen credential type (e.g. switch
// `authentication`): write through the workflow document, and emit so hosts that
// keep their own parameter copy (NDV, setup panel) stay in sync.
function applyActivationParameters(parameters: INodeParameters): void {
	const changed = Object.entries(parameters).filter(
		([name, value]) => props.node.parameters[name] !== value,
	);
	if (changed.length === 0) return;

	if (!props.standalone && workflowDocumentStore?.value) {
		workflowDocumentStore.value.updateNodeProperties({
			name: props.node.name,
			properties: { parameters: { ...props.node.parameters, ...Object.fromEntries(changed) } },
		});
	}
	for (const [name, value] of changed) {
		emit('valueChanged', { name: `parameters.${name}`, value });
	}
}

function onAiGatewaySelector(credentialType: string, enable: boolean, isUserAction = true): void {
	const credentials = { ...(props.node.credentials ?? {}) };

	// When enabling n8n credits, the managed slot goes on the supported credential
	// type — the shown one, or a supported sibling whose auth we switch the node to.
	const activation = enable ? resolveGatewayActivation(credentialType) : undefined;
	const effectiveType = activation?.credentialType ?? credentialType;

	// Track the credential kind actually assigned, or null when the slot is cleared
	// (toggle-off with no credential to restore) so no false assignment is recorded.
	let assignedKind: 'n8n_connect' | 'own' | null = null;
	// The stored credential restored on toggle-off; n8n Connect slots have none.
	let assignedCredentialId: string | null = null;

	if (enable) {
		// Moving the managed slot to a sibling: drop a stale managed sentinel from the
		// shown type. A user credential stays (inactive), as manual auth switches do.
		if (effectiveType !== credentialType && credentials[credentialType]?.__aiGatewayManaged) {
			delete credentials[credentialType];
		}
		if (activation) applyActivationParameters(activation.parameters);
		credentials[effectiveType] = { id: null, name: '', __aiGatewayManaged: true };
		assignedKind = 'n8n_connect';
	} else {
		// Toggle OFF: restore the most recent available credential for THIS node only.
		// Avoid onCredentialSelected which calls replaceInvalidWorkflowCredentials and
		// would affect other nodes that also have gateway-managed credentials (id: null, name: '').
		const typeEntry = credentialTypesNodeDescriptionDisplayed.value.find(
			({ type }) => type.name === credentialType,
		);

		if (typeEntry && typeEntry.options.length > 0) {
			const mostRecent = typeEntry.options.reduce((a, b) => (a.updatedAt > b.updatedAt ? a : b));
			const restoredCredential = credentialsStore.getCredentialById(mostRecent.id);
			credentials[credentialType] = { id: restoredCredential.id, name: restoredCredential.name };
			assignedKind = 'own';
			assignedCredentialId = restoredCredential.id;
		} else {
			delete credentials[credentialType];
		}
	}

	if (isUserAction) {
		telemetry.track('User toggled n8n connect credential', {
			credential_type: effectiveType,
			node_type: props.node.type,
			mode: enable ? 'n8n_connect' : 'own',
			workflow_id: telemetryWorkflowId.value,
		});
		// Only the manual canvas is attributed to the user here; standalone
		// (Instance AI) assignments are counted by the backend as `instance-ai-*`.
		if (!props.standalone && assignedKind) {
			telemetry.track('Node credential assigned', {
				credential_type: effectiveType,
				node_type: props.node.type,
				workflow_id: workflowDocumentStore?.value.workflowId,
				credential_id: assignedCredentialId,
				credential_kind: assignedKind,
				source: 'user',
			});
		}
	}

	emit('credentialSelected', {
		name: props.node.name,
		properties: { credentials },
	});
	if (!props.standalone) void aiGateway.saveAfterToggle();
}

function getIssues(credentialTypeName: string): string[] {
	const node = props.node;

	if (node.issues?.credentials === undefined) {
		return [];
	}

	if (!node.issues.credentials.hasOwnProperty(credentialTypeName)) {
		return [];
	}
	return node.issues.credentials[credentialTypeName];
}

function onTopUp(credentialType: string): void {
	if (props.readonly) return;
	void openTopUp({
		source: 'credential_selector',
		credentialType,
	});
}

function editCredential(credentialType: string): void {
	const credential = props.node.credentials?.[credentialType];
	assert(credential?.id);

	uiStore.openExistingCredential(credential.id, {
		hideAskAssistant: hideAskAssistant.value,
		...(isToolContext ? { appendToBody: true } : {}),
		instanceAiCredentialHelp: resolveInstanceAiCredentialHelp(),
		workflowId: telemetryWorkflowId.value || undefined,
	});

	telemetry.track('User opened Credential modal', {
		credential_type: credentialType,
		source: 'node',
		new_credential: false,
		workflow_id: telemetryWorkflowId.value,
	});
	subscribedToCredentialType.value = credentialType;
}

function getCredentialsFieldLabel(credentialType: INodeCredentialDescription): string {
	if (props.credentialsFieldLabel) return props.credentialsFieldLabel;
	if (credentialType.displayName) return credentialType.displayName;
	const credentialTypeName = credentialTypeNames.value[credentialType.name];
	const isCredentialOnlyNode = props.node.type.startsWith(CREDENTIAL_ONLY_NODE_PREFIX);

	if (isCredentialOnlyNode) {
		return i18n.baseText('nodeCredentials.credentialFor', {
			interpolate: { credentialType: nodeType.value?.displayName ?? credentialTypeName },
		});
	}

	if (!showMixedCredentials(credentialType)) {
		return i18n.baseText('nodeCredentials.credentialFor', {
			interpolate: { credentialType: credentialTypeName },
		});
	}
	return i18n.baseText('nodeCredentials.credentialsLabelShort');
}

function setFilter(newFilter = '') {
	filter.value = newFilter;
}

function onSelectVisibleChange(credentialType: string, isVisible: boolean) {
	openCredentialSelectType.value = isVisible ? credentialType : null;
	if (!isVisible) setFilter();
}

function matches(needle: string, haystack: string) {
	return haystack.toLocaleLowerCase().includes(needle.toLocaleLowerCase());
}

// The n8n credits option's value is UI-only select state: selecting it routes
// to the managed-slot path, which owns the persisted
// `{ id: null, name: '', __aiGatewayManaged: true }` shape.
function showN8nCreditsOption(credentialType: string): boolean {
	return showAiGatewaySelector(credentialType) && matches(filter.value, N8N_CREDITS_LABEL);
}

function showBalanceIndicator(credentialType: string): boolean {
	return (
		isAiGatewayManagedCredentials(credentialType) && Boolean(balancePill.value) && !filter.value
	);
}

function isBalanceIndicatorMuted(credentialType: string): boolean {
	return openCredentialSelectType.value === credentialType;
}

/** @param credentialIdOrTag a credential id, or `AI_GATEWAY_MANAGED_TAG` from the n8n credits option */
function onCredentialOptionSelected(
	type: INodeCredentialDescription,
	credentialIdOrTag: string,
): void {
	if (credentialIdOrTag === AI_GATEWAY_MANAGED_TAG) {
		onAiGatewaySelector(type.name, true);
		return;
	}
	onCredentialSelected(type.name, credentialIdOrTag, showMixedCredentials(type));
}

async function onClickCreateCredential(type: ICredentialType | INodeCredentialDescription) {
	selectRefs.value.forEach((select) => select.blur());
	await nextTick();
	createNewCredential(type.name, true, showMixedCredentials(type));
}

function getServiceName(credentialTypeName: string): string {
	const displayName = credentialTypeNames.value[credentialTypeName] ?? credentialTypeName;
	return getAppNameFromCredType(displayName);
}

function getRelatedCredentialTypes(type: INodeCredentialDescription): INodeCredentialDescription[] {
	const authFieldName = mainNodeAuthField.value?.name;
	// if not the main auth field, return the type itself
	if (!authFieldName || !type.displayOptions?.show?.[authFieldName]) {
		return [type];
	}

	// otherwise, return all credential types that show the main auth field
	return credentialTypesNodeDescriptions.value.filter(
		(credentialType) => credentialType.displayOptions?.show?.[authFieldName],
	);
}

function canQuickConnect(credentialType: INodeCredentialDescription): boolean {
	return (
		!!getQuickConnectOption(credentialType.name, props.node.type) ||
		canOAuthCredentialQuickConnect(credentialType.name)
	);
}

function getQuickConnectCredentialType(type: INodeCredentialDescription): string | undefined {
	return getRelatedCredentialTypes(type).find(canQuickConnect)?.name;
}

function showQuickConnectEmptyState(type: INodeCredentialDescription): boolean {
	return !isCredentialExisting(type) && !!getQuickConnectCredentialType(type);
}

function showStandardEmptyState(type: INodeCredentialDescription): boolean {
	return !isCredentialExisting(type) && !getQuickConnectCredentialType(type);
}

// Empty-slot layouts, only when the type has no stored credentials and isn't on
// n8n credits: the quick-connect invitation, else the standard picker.
function showQuickConnectSlot(
	type: INodeCredentialDescription,
	options: CredentialDropdownOption[],
): boolean {
	return (
		options.length === 0 &&
		showQuickConnectEmptyState(type) &&
		!isAiGatewayManagedCredentials(type.name)
	);
}

function showStandardEmptySlot(
	type: INodeCredentialDescription,
	options: CredentialDropdownOption[],
): boolean {
	return (
		options.length === 0 &&
		showStandardEmptyState(type) &&
		!isAiGatewayManagedCredentials(type.name)
	);
}

function canManuallySetUpCredential(credentialTypeName: string): boolean {
	const credentialType = credentialsStore.getCredentialTypeByName(credentialTypeName);
	if (!credentialType) {
		return true;
	}

	return hasManualCredentialInputFields(credentialType);
}

async function onQuickConnectSignIn(credentialTypeName: string) {
	subscribedToCredentialType.value = credentialTypeName;
	const serviceName = getServiceName(credentialTypeName);

	try {
		const credential = await connect({
			credentialTypeName,
			nodeType: props.node.type,
			source: 'node_type',
			serviceName,
		});

		if (credential) {
			onCredentialSelected(credentialTypeName, credential.id);
			toast.showMessage({
				title: i18n.baseText('nodeCredentials.quickConnect.credential.created.success'),
				type: 'success',
			});
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('nodeCredentials.quickConnect.credential.created.error'));
	}
}
</script>

<template>
	<div
		v-if="credentialTypesNodeDescriptionDisplayed.length"
		:class="['node-credentials', $style.container]"
	>
		<div
			v-for="{ type, options } in credentialTypesNodeDescriptionDisplayed"
			:key="type.name"
			data-test-id="node-credentials-slot"
		>
			<N8nInputLabel
				:label="getCredentialsFieldLabel(type)"
				:bold="false"
				size="small"
				color="text-dark"
				data-test-id="credentials-label"
			>
				<template v-if="$slots['label-postfix']" #options>
					<slot name="label-postfix" />
				</template>
				<div
					v-if="readonly"
					:class="[
						$style.selectContainer,
						{
							[$style.inputWithPrivateRow]:
								getSelectedPrivateCredential(type.name) && isDefaultResolver,
						},
					]"
				>
					<N8nInput
						:model-value="getSelectedName(type.name)"
						disabled
						size="small"
						data-test-id="node-credentials-select"
					/>
					<div
						v-if="isCredentialResolvable(type.name)"
						:class="[$style.dynamicIndicator, $style.dynamicIndicatorReadonly]"
					>
						<N8nTooltip placement="top">
							<template #content>{{ i18n.baseText('credentials.private.tooltip') }}</template>
							<N8nIcon
								icon="user-round-key"
								size="small"
								data-test-id="node-credential-private-icon"
							/>
						</N8nTooltip>
					</div>
				</div>
				<div
					v-else-if="showQuickConnectSlot(type, options)"
					:class="[$style.quickConnectContainer]"
					data-test-id="quick-connect-empty-state"
				>
					<QuickConnectButton
						size="small"
						:disabled="quickConnectLoading"
						:credential-type-name="getQuickConnectCredentialType(type) ?? type.name"
						:service-name="getServiceName(getQuickConnectCredentialType(type) ?? type.name)"
						@click="onQuickConnectSignIn(getQuickConnectCredentialType(type) ?? type.name)"
					/>
					<span v-if="canManuallySetUpCredential(type.name)" :class="$style.setupManuallyContainer">
						<N8nText size="small" :class="$style.setupManuallyOr">
							{{ i18n.baseText('nodeCredentials.quickConnect.or') }}
						</N8nText>
						<N8nLink
							:class="$style.setupManuallyLink"
							theme="secondary"
							underline
							size="small"
							data-test-id="setup-manually-link"
							@click="createNewCredential(type.name, true, showMixedCredentials(type), true)"
						>
							{{ i18n.baseText('nodeCredentials.quickConnect.setupManually') }}
						</N8nLink>
					</span>
				</div>

				<div
					v-else-if="showStandardEmptySlot(type, options)"
					:class="$style.standardEmptyContainer"
					data-test-id="node-credentials-empty-state"
				>
					<button
						v-if="!showN8nCreditsOption(type.name)"
						type="button"
						:class="$style.emptySelectButton"
						:disabled="!canCreateCredentials"
						@click="onClickCreateCredential(type)"
					>
						<CredentialIcon :credential-type-name="type.name" :size="16" />
						<span>{{ entryPlaceholder(type.name) }}</span>
					</button>
					<N8nSelect
						v-else
						ref="selectRefs"
						:class="$style.emptySelect"
						size="small"
						:disabled="!canCreateCredentials && !showN8nCreditsOption(type.name)"
						:placeholder="entryPlaceholder(type.name)"
						:popper-class="`${$style.selectPopper} ${$style.entryPopper}`"
						@update:model-value="(value: string) => onCredentialOptionSelected(type, value)"
					>
						<template #prefix>
							<CredentialIcon :credential-type-name="type.name" :size="16" />
						</template>
						<N8nOption
							v-if="showN8nCreditsOption(type.name)"
							:key="AI_GATEWAY_MANAGED_TAG"
							data-test-id="node-credentials-select-item-n8n-credits"
							:label="N8N_CREDITS_LABEL"
							:value="AI_GATEWAY_MANAGED_TAG"
						>
							<div :class="$style.credentialOption">
								<N8nIcon icon="wallet" size="large" :class="$style.optionIcon" />
								<span :class="$style.entryText">
									<N8nText :class="$style.optionName">
										{{ i18n.baseText('aiGateway.picker.useN8nCredits') }}
									</N8nText>
									<N8nText :class="$style.entrySubtitle">
										{{ i18n.baseText('aiGateway.picker.readyToRun') }}
									</N8nText>
								</span>
								<N8nActionPill
									v-if="balancePill"
									size="small"
									:type="balancePill.type"
									:text="balancePill.text"
									:class="$style.entryPill"
								/>
							</div>
						</N8nOption>
						<template #empty> </template>
						<template #footer>
							<button
								type="button"
								data-test-id="node-credentials-select-item-new"
								:class="[$style.newCredential, $style.entryCreate]"
								:disabled="!canCreateCredentials"
								@click="onClickCreateCredential(type)"
							>
								<N8nIcon size="large" icon="key-round" :class="$style.optionIcon" />
								<span :class="$style.entryText">
									<N8nText :class="$style.optionName">
										{{ i18n.baseText('aiGateway.picker.useOwnCredential') }}
									</N8nText>
									<N8nText :class="$style.entrySubtitle">
										{{ i18n.baseText('aiGateway.picker.bringYourOwnKey') }}
									</N8nText>
								</span>
							</button>
						</template>
					</N8nSelect>
					<!-- Invisible sizer: its width (label + icon/caret room) sizes the grid
					     cell so the select stacked in the same cell hugs the label. -->
					<span
						v-if="showN8nCreditsOption(type.name)"
						:class="$style.emptySizer"
						aria-hidden="true"
					>
						{{ entryPlaceholder(type.name) }}
					</span>
				</div>
				<div
					v-else
					:class="[
						getIssues(type.name).length && !hideIssues ? $style.hasIssues : $style.input,
						{
							[$style.inputWithPrivateRowEditable]:
								getSelectedPrivateCredential(type.name) &&
								isDefaultResolver &&
								canEditPrivateCredential(type.name),
							[$style.inputWithPrivateRow]:
								getSelectedPrivateCredential(type.name) &&
								isDefaultResolver &&
								!canEditPrivateCredential(type.name),
						},
					]"
					data-test-id="node-credentials-select"
				>
					<div :class="$style.selectContainer">
						<N8nSelect
							ref="selectRefs"
							:model-value="getSelectedId(type)"
							:placeholder="getSelectPlaceholder(type.name, getIssues(type.name))"
							size="small"
							filterable
							:filter-method="setFilter"
							:popper-class="$style.selectPopper"
							:class="{
								[$style.selectWithDynamic]: isCredentialResolvable(type.name),
								[$style.selectWithBalance]: showBalanceIndicator(type.name),
							}"
							@update:model-value="(value: string) => onCredentialOptionSelected(type, value)"
							@visible-change="(isVisible: boolean) => onSelectVisibleChange(type.name, isVisible)"
							@blur="emit('blur', 'credentials')"
						>
							<template #prefix>
								<N8nIcon
									v-if="selectedCredentialIcon(type.name)"
									:icon="selectedCredentialIcon(type.name)!"
									size="large"
									:class="$style.optionIcon"
								/>
							</template>
							<N8nOption
								v-if="showN8nCreditsOption(type.name)"
								:key="AI_GATEWAY_MANAGED_TAG"
								data-test-id="node-credentials-select-item-n8n-credits"
								:label="N8N_CREDITS_LABEL"
								:value="AI_GATEWAY_MANAGED_TAG"
							>
								<div :class="$style.credentialOption">
									<N8nIcon icon="wallet" size="large" :class="$style.optionIcon" />
									<N8nText :class="$style.optionName">
										{{ N8N_CREDITS_LABEL }}
									</N8nText>
									<N8nActionPill
										v-if="balancePill"
										size="small"
										:type="balancePill.type"
										:text="balancePill.text"
									/>
									<N8nIcon
										v-if="isAiGatewayManagedCredentials(type.name)"
										icon="check"
										size="large"
										:class="$style.checkIcon"
									/>
								</div>
							</N8nOption>
							<N8nOption
								v-for="item in options.filter((o) => matches(filter, o.name))"
								:key="item.id"
								:data-test-id="`node-credentials-select-item-${item.id}`"
								:label="item.name"
								:value="item.id"
							>
								<div :class="$style.credentialOption">
									<N8nIcon
										:icon="item.isResolvable ? 'user-round' : 'key-round'"
										size="large"
										:class="$style.optionIcon"
									/>
									<div :class="$style.credentialOptionName">
										<N8nText :class="$style.optionName">{{ item.name }}</N8nText>
										<N8nTooltip
											v-if="isPrivateCredentialsEnabled && item.isResolvable"
											placement="top"
										>
											<template #content>{{
												i18n.baseText('credentials.private.tooltip')
											}}</template>
											<N8nIcon
												icon="user-round-key"
												size="small"
												data-test-id="credential-option-private-badge"
											/>
										</N8nTooltip>
									</div>
									<N8nText size="small" color="text-light" :class="$style.optionMeta">
										{{
											item.isResolvable
												? i18n.baseText(
														'credentialEdit.credentialConfig.credentialType.endUser.title',
													)
												: item.typeDisplayName
										}}
									</N8nText>
									<N8nIcon
										v-if="getSelectedId(type) === item.id"
										icon="check"
										size="large"
										:class="$style.checkIcon"
									/>
								</div>
							</N8nOption>
							<template #empty> </template>
							<template #footer>
								<button
									type="button"
									data-test-id="node-credentials-select-item-new"
									:class="[$style.newCredential]"
									:disabled="!canCreateCredentials"
									@click="onClickCreateCredential(type)"
								>
									<N8nIcon size="large" icon="plus" :class="$style.optionIcon" />
									{{ NEW_CREDENTIALS_TEXT }}
								</button>
							</template>
						</N8nSelect>
						<div
							v-if="showBalanceIndicator(type.name)"
							data-test-id="credential-balance-indicator"
							:class="[
								$style.balanceIndicator,
								{ [$style.balanceIndicatorMuted]: isBalanceIndicatorMuted(type.name) },
							]"
						>
							<!-- Invisible copy of the selected label reserves its exact rendered
							     width so the badge sits the same spacing--2xs gap after it as in
							     the dropdown row, instead of a hardcoded label-width guess. -->
							<span :class="$style.balanceLabelSizer" aria-hidden="true">{{
								N8N_CREDITS_LABEL
							}}</span>
							<N8nActionPill size="small" :type="balancePill?.type" :text="balancePill?.text" />
						</div>
						<div v-if="isCredentialResolvable(type.name)" :class="$style.dynamicIndicator">
							<N8nTooltip placement="top">
								<template #content>{{ i18n.baseText('credentials.private.tooltip') }}</template>
								<N8nIcon
									icon="user-round-key"
									size="small"
									data-test-id="node-credential-private-icon"
								/>
							</N8nTooltip>
						</div>
					</div>

					<div v-if="getIssues(type.name).length && !hideIssues" :class="$style.warning">
						<N8nTooltip placement="top">
							<template #content>
								<TitledList
									:title="`${i18n.baseText('nodeCredentials.issues')}:`"
									:items="getIssues(type.name)"
								/>
							</template>
							<N8nIcon icon="triangle-alert" />
						</N8nTooltip>
					</div>

					<div v-if="isAiGatewayManagedCredentials(type.name)" :class="$style.edit">
						<N8nIcon
							icon="settings"
							class="clickable"
							data-test-id="credential-topup-button"
							:title="i18n.baseText('aiGateway.toggle.topUp')"
							@click="onTopUp(type.name)"
						/>
					</div>
					<div
						v-else-if="
							selected[type.name] &&
							isCredentialExisting(type) &&
							(!getSelectedPrivateCredential(type.name) || canEditPrivateCredential(type.name))
						"
						:class="$style.edit"
						data-test-id="credential-edit-button"
					>
						<N8nIcon
							icon="pen"
							class="clickable"
							:title="i18n.baseText('nodeCredentials.updateCredential')"
							@click="editCredential(type.name)"
						/>
					</div>
				</div>
				<CredentialPrivateConnectionRow
					v-if="getSelectedPrivateCredential(type.name) && isDefaultResolver"
					:credential-type-name="type.name"
					:credential-name="getServiceName(type.name)"
					:is-connected="isPrivateConnected(type.name)"
					:connected-account-name="
						getSelectedPrivateCredential(type.name)?.connectedAccountIdentifier
					"
					:can-connect="canConnectPrivateCredential(type.name)"
					data-test-id="node-credential-private-row"
					@connect="onConnectFromRow(type.name)"
					@switch-account="onConnectFromRow(type.name)"
					@disconnect="onDisconnectFromRow(type.name)"
				/>
			</N8nInputLabel>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/common/var';

.container {
	margin-top: var(--spacing--xs);

	& > div:not(:first-child) {
		margin-top: var(--spacing--xs);
	}
}

.selectPopper {
	:global(.el-select-dropdown__list) {
		padding: var(--spacing--4xs) 0;
	}

	// Keep the footer divider full-width while the create row keeps the same
	// inset hover shape as the options above it.
	:global(.el-select-dropdown__footer) {
		padding: var(--spacing--4xs) 0;
		border-top: var(--border);
	}

	:global(.el-select-dropdown__item) {
		display: flex;
		align-items: center;
		height: auto;
		margin: 0 var(--spacing--4xs);
		padding: var(--spacing--4xs) var(--spacing--2xs);
		line-height: var(--line-height--md);
		border-radius: var(--radius);
	}

	:global(.el-select-dropdown__item.selected) {
		color: var(--color--text--shade-1);
		font-weight: var(--font-weight--regular);
	}

	:has(.newCredential:hover) :global(.hover) {
		background-color: transparent;
	}

	&:not(:has(li)) {
		:global(.el-select-dropdown__footer) {
			border-top: none;
		}

		.newCredential {
			border-radius: var(--radius);
		}
	}
}

.warning {
	margin-left: var(--spacing--4xs);
	color: var(--color--danger--tint-1);
	font-size: var(--font-size--sm);
}

.edit {
	display: flex;
	justify-content: center;
	align-items: center;
	color: var(--color--text);
	margin-left: var(--spacing--3xs);
	font-size: var(--font-size--sm);

	&:hover,
	&:focus {
		color: var(--color--primary);
	}
}

.input {
	display: flex;
	align-items: center;
}

.selectContainer {
	--credential-select-side-padding: var(--spacing--2xs);
	--credential-select-icon-size: var(--spacing--sm);
	--credential-select-icon-gap: var(--spacing--3xs);
	--credential-select-label-padding: calc(
		var(--credential-select-side-padding) + var(--credential-select-icon-size) +
			var(--credential-select-icon-gap)
	);

	position: relative;
	flex: 1;
	display: grid;
	grid-template-areas: 'control';

	> :global(.n8n-select),
	.balanceIndicator {
		grid-area: control;
	}

	:global(.el-input__prefix-inner > :last-child) {
		margin-right: var(--spacing--3xs);
	}

	:global(.el-select .el-input__prefix) {
		left: var(--credential-select-side-padding);
	}

	:global(.el-select .el-input.el-input--prefix .el-input__inner) {
		padding-left: var(--credential-select-label-padding);
	}
}

/* Merge the select visually with the private connection row below it.
   The container owns the border (same token as the row) so the merged block
   reads as one element; the inner input's own border is disabled. Covers both
   the new N8nInput (--input--radius--*) and the element-plus based select
   (--input-triple--radius--*) corner variables. */
.inputWithPrivateRow {
	--input--radius--bottom-left: 0;
	--input--radius--bottom-right: 0;
	--input-triple--radius--bottom-right: 0;
	--input--border-color: transparent;
	border: var(--border-width, 1px) solid var(--border-color);
	border-radius: var(--radius) var(--radius) 0 0;

	/* N8nInput redefines --input--border-color on its own root, so the
	   ancestor-level override above doesn't reach it */
	:global(.n8n-input) {
		--input--border-color: transparent;
	}
}

/* Editable variant: select + edit pen wrapped in a shared bordered container
   whose bottom edge connects to the private connection row */
.inputWithPrivateRowEditable {
	--input--border-color: transparent;
	--input-triple--radius--top-right: 0;
	--input-triple--radius--bottom-right: 0;
	border: var(--border-width, 1px) solid var(--border-color);
	border-radius: var(--radius) var(--radius) 0 0;
	padding-right: var(--spacing--2xs);

	.selectContainer {
		border-right: var(--border-width, 1px) solid var(--border-color);
	}

	.edit {
		margin-left: var(--spacing--2xs);
	}
}

.hasIssues {
	composes: input;
	--input--border-color: var(--color--danger);
}

.credentialOption {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	width: 100%;
}

.checkIcon {
	flex-shrink: 0;
	margin-left: auto;
	color: var(--color--text--shade-1);
}

.optionIcon {
	display: flex;
	align-items: center;
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.optionName {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	color: var(--color--text--shade-1);
	white-space: nowrap;
}

.entryPill {
	margin-left: auto;
}

// Give the menu a comfortable floor width (wider than the compact trigger) so
// the right-aligned balance badge clears the longest option text with a gap;
// grows past this if content is longer. el-select pins the popper min-width
// inline, hence the important.
.entryPopper {
	min-width: calc(var(--spacing--5xl) + var(--spacing--2xl)) !important;

	// The entry menu is invitational, so it keeps the footer spacing but skips
	// the divider used by the regular credential menu.
	:global(.el-select-dropdown__footer) {
		border-top: none;
	}

	// The popper is wider than the compact trigger; keep the arrow centered on
	// the popup instead of the trigger (popper.js positions it inline).
	:global(.el-popper__arrow) {
		left: 50% !important;
		transform: translateX(-50%);
	}
}

.entryText {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	min-width: 0;
}

.entrySubtitle {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	white-space: nowrap;
}

// The entry menu is invitational — no divider before its create row, and it
// hovers like the option rows (inset, rounded). Compounded with .newCredential
// so this hover color wins regardless of source order.
.entryCreate.newCredential {
	text-align: left;
	width: calc(100% - 2 * var(--spacing--4xs));
	margin: 0 var(--spacing--4xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius);

	&:not([disabled]):hover {
		background-color: var(--color--background);
	}
}

.optionMeta {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	font-size: var(--font-size--2xs);
}

.credentialOptionName {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.selectWithDynamic {
	:global(.el-input__inner) {
		padding-right: 80px;
	}
}

.selectWithBalance {
	:global(.el-input__inner) {
		padding-right: 35px;
	}
}

// Non-interactive status pill rendered over the select, like .dynamicIndicator.
// The invisible sizer reserves the label's width so the pill lands the same
// spacing--2xs gap after it as the dropdown row (see .balanceLabelSizer).
.balanceIndicator {
	display: flex;
	align-items: center;
	align-self: center;
	justify-self: start;
	gap: var(--spacing--2xs);
	padding-left: var(--credential-select-label-padding);
	max-width: calc(100% - 35px);
	z-index: 1;
	pointer-events: none;
}

// Mirrors the el-select trigger label (size small = 12px) so its width matches
// the rendered selection exactly; hidden but still occupies layout space.
.balanceLabelSizer {
	flex-shrink: 0;
	font-size: var(--font-size--2xs);
	white-space: nowrap;
	visibility: hidden;
}

.balanceIndicator > span:not(.balanceLabelSizer),
.credentialOption > .optionName + span,
.entryPill {
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border-radius: var(--radius);
	background-color: light-dark(var(--color--neutral-200), var(--color--neutral-700));
	color: light-dark(var(--color--neutral-750), var(--color--neutral-150));
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--sm);
}

.balanceIndicatorMuted {
	opacity: 0.6;
}

.dynamicIndicator {
	position: absolute;
	right: 28px;
	top: 50%;
	transform: translateY(-50%);
	z-index: 1;
}

.dynamicIndicatorReadonly {
	right: var(--spacing--xs);
}

.newCredential {
	display: flex;
	box-sizing: border-box;
	width: calc(100% - 2 * var(--spacing--4xs));
	min-height: var.$select-option-height;
	margin: 0 var(--spacing--4xs);
	// Matches .credentialOption so the plus icon and label align with the rows.
	gap: var(--spacing--2xs);
	align-items: center;
	font-weight: var(--font-weight--medium);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--md);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	background-color: transparent;
	color: var(--color--text--shade-1);
	border-radius: var(--radius);

	border: 0;

	&:not([disabled]) {
		cursor: pointer;
		&:hover {
			background-color: light-dark(
				var(--color--background--light-2),
				var(--menu--color--background--hover)
			);
		}
	}

	&[disabled] {
		opacity: 0.5;
		cursor: not-allowed;
	}
}

.quickConnectContainer {
	display: flex;
	flex-direction: row;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--4xs);
}

.setupManuallyContainer {
	display: inline-flex;
	align-items: baseline;
	gap: var(--spacing--4xs);
}

.setupManuallyOr {
	color: var(--color--text);
}

.setupManuallyLink {
	--link--color--secondary: var(--color--text);

	&:hover,
	&:focus,
	&:active {
		:global(span) {
			color: var(--color--text--shade-1);
		}
	}
}

.standardEmptyContainer {
	display: inline-flex;
	align-items: center;
	// The parent N8nInputLabel is a flex column, which would stretch this to full
	// width; opt out so the trigger can shrink-wrap its content.
	align-self: flex-start;
	max-width: 100%;
	margin-top: var(--spacing--4xs);
}

.emptySizer {
	display: none;
}

.emptySelectButton {
	box-sizing: border-box;
	appearance: none;
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	height: calc(var(--spacing--lg) + var(--spacing--4xs));
	max-width: 100%;
	padding: 0 calc(var(--spacing--2xs) + var(--spacing--5xs));
	border: var.$input-border;
	border-right-color: var.$input-border-right-color;
	border-bottom-color: var.$input-border-bottom-color;
	border-radius: var.$input-border-radius;
	background-color: var.$input-background-color;
	color: var.$input-font-color;
	font-family: inherit;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--lg);
	text-align: left;
	cursor: pointer;

	&:not(:disabled):hover {
		border-color: var.$input-hover-border;
	}

	&:focus {
		outline: none;
		border-color: var.$input-focus-border;
	}

	&:disabled {
		border-color: var.$input-disabled-border;
		background-color: var.$input-disabled-fill;
		color: var.$input-disabled-color;
		cursor: not-allowed;
	}

	span {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
}

.emptySelect {
	--empty-select-height: calc(var(--spacing--lg) + var(--spacing--4xs));
	--empty-select-side-padding: calc(var(--spacing--2xs) + var(--spacing--5xs));
	--empty-select-icon-size: var(--spacing--sm);
	--empty-select-gap: var(--spacing--3xs);
	--empty-select-label-padding: calc(
		var(--empty-select-side-padding) + var(--empty-select-icon-size) + var(--empty-select-gap)
	);

	width: fit-content;
	min-width: 0;
	max-width: 100%;

	:global(.el-select),
	:global(.el-input) {
		width: fit-content;
		max-width: 100%;
	}

	:global(.el-select .el-input__prefix) {
		left: var(--empty-select-side-padding);
	}

	:global(.el-select .el-input__suffix) {
		right: var(--empty-select-side-padding);
	}

	:global(.el-input__prefix-inner > :last-child) {
		margin-right: var(--empty-select-gap);
	}

	:global(.el-select .el-input.el-input--prefix .el-input__inner) {
		field-sizing: content;
		width: auto;
		min-width: 0;
		height: var(--empty-select-height);
		min-height: var(--empty-select-height);
		line-height: var(--empty-select-height);
		padding-left: var(--empty-select-label-padding);
		padding-right: var(--empty-select-label-padding);
		caret-color: transparent;
		font-weight: var(--font-weight--medium);

		&::placeholder {
			color: var(--color--text--shade-1);
			opacity: 1;
		}
	}
}
</style>
