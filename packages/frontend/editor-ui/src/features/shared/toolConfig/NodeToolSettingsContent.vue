<script setup lang="ts">
/**
 * Shared "configure a node-as-tool" form.
 *
 * Renders a two-sub-tab view (Parameters + node Settings) over an `INode`,
 * wired to `ParameterInputList` + `NodeCredentials`. Emits validity and name
 * changes so any container (Chat Hub modal, Agents modal, etc.) can drive a
 * Save/Cancel footer.
 *
 * Context marker: we provide `ChatHubToolContextKey` here so the parameter
 * form suppresses features that don't apply when a node is being configured
 * as an LLM tool outside a workflow canvas (see `ParameterOptions`,
 * `ParameterInputFull`). The key name is historical — treat it as the
 * "node-as-tool config" marker; it applies equally to Chat Hub and Agents.
 */
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { setParameterValue } from '@/app/utils/parameterUtils';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import NodeCredentials from '@/features/credentials/components/NodeCredentials.vue';
import ParameterInputList from '@/features/ndv/parameters/components/ParameterInputList.vue';
import { collectParametersByTab, createCommonNodeSettings } from '@/features/ndv/shared/ndv.utils';
import { omitOperationOptions } from '@/features/shared/toolConfig/toolConfig.utils';
import type { INodeUpdatePropertiesInformation, ITab, IUpdateInformation } from '@/Interface';
import { N8nNotice, N8nSpinner, N8nTabs, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import {
	NodeHelpers,
	deepCopy,
	type INode,
	type INodeParameters,
	type Workflow,
} from 'n8n-workflow';
import { computed, onBeforeUnmount, onMounted, provide, ref, shallowRef, watch } from 'vue';
import {
	ChatHubToolContextKey,
	ExpressionLocalResolveContextSymbol,
	ToolConfigCredentialSelectedKey,
	WorkflowDocumentStoreKey,
} from '@/app/constants';
import type { ExpressionLocalResolveContext } from '@/app/types/expressions';
import useEnvironmentsStore from '@/features/settings/environments.ee/environments.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import {
	createWorkflowDocumentId,
	disposeWorkflowDocumentStore,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { disposeNDVStore, useNDVStore } from '@/features/ndv/shared/ndv.store';

const props = defineProps<{
	initialNode: INode;
	existingToolNames?: string[];
	hideAskAssistant?: boolean;
	projectId?: string;
	/** Resource/operation option values to hide from the form (e.g. operations the hosting runtime cannot execute). */
	hiddenOperations?: readonly string[];
	parameterIssues?: Record<string, string[]>;
	fromAiDisabledParameters?: string[];
	/** Keeps standalone Agent tool parameters resolvable through the scoped NDV store. */
	syncNodeToNdv?: boolean;
}>();

const emit = defineEmits<{
	'update:valid': [isValid: boolean];
	'update:node-name': [name: string];
	'update:node': [node: INode];
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
const credentialsStore = useCredentialsStore();
const projectsStore = useProjectsStore();
const nodeHelpers = useNodeHelpers();
const environmentsStore = useEnvironmentsStore();
const settingsStore = useSettingsStore();

const nodeTypesLoaded = computed(() => Object.keys(nodeTypesStore.nodeTypes).length > 0);

const node = shallowRef<INode | null>(props.initialNode);
const userEditedName = ref(false);
const nodeTypeError = ref(false);
const nodeTypesLoadFailed = ref(false);
// Tracks the initialNode identity that has been hydrated to prevent background
// re-fires (e.g. nodeTypesStore reactivity) from overwriting user edits.
const hydratedInitialNode = ref<string | null>(null);
// Tracks which node identity a preserved (user-edited) name belongs to, so a
// stale name cannot leak onto a different node after an identity swap.
const preservedNameNodeId = ref<string | null>(null);

const existingToolNames = computed(() => props.existingToolNames ?? []);
// `props.projectId` can be an empty string when the agent scope id has not
// resolved yet (see `useAgentScopeProjectId`), so fall back with `||` rather
// than `??` — otherwise the empty string sticks and the credential fetch below
// is skipped on first open.
const credentialProjectId = computed(() => props.projectId || projectsStore.personalProject?.id);

const nodeTypeDescription = computed(() => {
	if (!props.initialNode) {
		return null;
	}
	const description = nodeTypesStore.getNodeType(props.initialNode.type);
	if (!description || !props.hiddenOperations?.length) {
		return description;
	}
	return omitOperationOptions(description, props.hiddenOperations);
});

type ToolSettingsTab = 'params' | 'settings';
const activeTab = ref<ToolSettingsTab>('params');

const parametersByTab = computed(() =>
	collectParametersByTab(nodeTypeDescription.value?.properties ?? [], false),
);

const hasSettings = computed(
	() => nodeSettings.value.length > 0 || parametersByTab.value.settings.length > 0,
);

const tabOptions = computed<Array<ITab<ToolSettingsTab>>>(() => {
	const tabs: Array<ITab<ToolSettingsTab>> = [
		{ label: i18n.baseText('nodeSettings.parameters'), value: 'params' },
	];
	if (hasSettings.value) {
		tabs.push({ label: i18n.baseText('nodeSettings.settings'), value: 'settings' });
	}
	return tabs;
});

const nodeSettings = computed(() =>
	createCommonNodeSettings(
		true,
		i18n.baseText.bind(i18n),
		settingsStore.isOtelCustomSpanAttributesEnabled,
	).filter((s) => s.name !== 'notes' && s.name !== 'notesInFlow'),
);

const settingsNodeValues = computed<INodeParameters>(() => {
	if (!node.value) return { parameters: {} };
	return {
		parameters: deepCopy(node.value.parameters),
		customTelemetryTags: deepCopy(node.value.customTelemetryTags ?? {}),
	};
});

const showNoParametersNotice = computed(
	() => parametersByTab.value.params.filter((item) => item.type !== 'notice').length === 0,
);

const hasParameterIssues = computed(() => {
	if (!nodeTypeDescription.value || !node.value) {
		return false;
	}

	const parameterIssues = NodeHelpers.getNodeParametersIssues(
		nodeTypeDescription.value.properties,
		node.value,
		nodeTypeDescription.value,
	);

	return parameterIssues !== null && Object.keys(parameterIssues.parameters ?? {}).length > 0;
});

const hasCredentialIssues = computed(() => {
	if (!nodeTypeDescription.value || !node.value) {
		return false;
	}

	const credentialIssues = nodeHelpers.getNodeIssues(
		nodeTypeDescription.value,
		node.value,
		{ getNode: () => node.value } as unknown as Workflow,
		['parameters', 'execution', 'typeUnknown', 'input'],
	);

	return Object.keys(credentialIssues?.credentials ?? {}).length > 0;
});

const toolWorkflowDocumentId = createWorkflowDocumentId('node-tool-workflow');
const toolWorkflowStore = useWorkflowDocumentStore(toolWorkflowDocumentId);
const toolNdvStore = useNDVStore(toolWorkflowDocumentId);
const workflowDocumentStore = computed(() => toolWorkflowStore);

const isHydrated = computed(() => {
	if (!nodeTypeDescription.value || !node.value?.name) {
		return false;
	}
	return toolWorkflowStore.getNodeByName(node.value.name) != null;
});

const expressionResolveCtx = computed<ExpressionLocalResolveContext | undefined>(() => {
	if (!node.value) return undefined;

	return {
		localResolve: true,
		envVars: environmentsStore.variablesAsObject,
		nodeName: node.value.name,
		additionalKeys: {},
		inputNode: undefined,
	};
});

const isValid = computed(() => {
	return (
		node.value?.name &&
		!hasParameterIssues.value &&
		!hasCredentialIssues.value &&
		!nodeTypeError.value &&
		isHydrated.value
	);
});

// Provide expression resolve context for dynamic parameter loading
provide(ExpressionLocalResolveContextSymbol, expressionResolveCtx);
provide(WorkflowDocumentStoreKey, workflowDocumentStore);
provide(ChatHubToolContextKey, true);

function makeUniqueName(baseName: string, existingNames: string[]): string {
	if (!existingNames.includes(baseName)) return baseName;
	let counter = 1;
	while (existingNames.includes(`${baseName} (${counter})`)) {
		counter++;
	}
	return `${baseName} (${counter})`;
}

function handleChangeParameter(updateData: IUpdateInformation) {
	if (!node.value) return;

	const newParameters = deepCopy(node.value.parameters);
	setParameterValue(newParameters, updateData.name, updateData.value);

	node.value = {
		...node.value,
		parameters: newParameters,
	};
}

function handleChangeSettingsValue(updateData: IUpdateInformation) {
	if (!node.value) return;
	if (updateData.name.startsWith('parameters.')) {
		const paramName = updateData.name.slice('parameters.'.length);
		const newParameters = deepCopy(node.value.parameters);
		setParameterValue(newParameters, paramName, updateData.value);
		node.value = {
			...node.value,
			parameters: newParameters,
		};
	} else if (updateData.name.includes('.') || updateData.name.includes('[')) {
		const newNode = deepCopy(node.value);
		setParameterValue(newNode as unknown as INodeParameters, updateData.name, updateData.value);

		if (newNode.customTelemetryTags?.tag?.length === 0) {
			newNode.customTelemetryTags = {};
		}

		node.value = newNode;
	} else {
		node.value = { ...node.value, [updateData.name]: updateData.value };
	}
}

function handleChangeCredential(updateData: INodeUpdatePropertiesInformation) {
	if (node.value) {
		node.value = {
			...node.value,
			...updateData.properties,
		};
	}
}

// CredentialsSelect → ParameterInput writes the document store only; this
// keeps the local draft (isValid / save payload) in sync.
provide(ToolConfigCredentialSelectedKey, handleChangeCredential);

function handleChangeName(name: string) {
	if (node.value) {
		userEditedName.value = true;
		// Capture the node identity being edited, but only once. Retrying the
		// name does not change the identity, so re-reading it on a later edit
		// would capture the edited name for id-less nodes.
		if (preservedNameNodeId.value === null) {
			preservedNameNodeId.value = node.value.id || node.value.name;
		}
		node.value = { ...node.value, name };
	}
}

// Hydrate initial node with defaults once node types are available.
watch(
	[() => props.initialNode, nodeTypeDescription, nodeTypesLoaded],
	([initialNode]) => {
		if (!initialNode) {
			node.value = null;
			userEditedName.value = false;
			hydratedInitialNode.value = null;
			nodeTypeError.value = false;
			return;
		}

		const initialNodeId = initialNode.id || initialNode.name;
		// Short-circuit if already hydrated for this node identity to prevent background
		// re-fires (e.g. nodeTypes reactivity, hiddenOperations changes) from overwriting user edits.
		if (hydratedInitialNode.value === initialNodeId) {
			return;
		}
		// If the incoming node identity differs from the one the preserved name belongs to,
		// drop the preserved name — it belongs to a different node.
		if (preservedNameNodeId.value && preservedNameNodeId.value !== initialNodeId) {
			preservedNameNodeId.value = null;
		}

		// Preserve a user-edited name when hydrating after a cold start; the name
		// recomputation below would otherwise replace it with the default. Only
		// re-apply it to the node identity it was edited on. `initialNodeId` is
		// stable across edits to the local `node` ref, so it is the right
		// comparison target for id-less nodes.
		const preservedName =
			hydratedInitialNode.value === null &&
			userEditedName.value &&
			preservedNameNodeId.value === initialNodeId
				? node.value?.name
				: null;

		const uniqueName = makeUniqueName(initialNode.name, existingToolNames.value);
		let nodeData =
			uniqueName !== initialNode.name ? { ...initialNode, name: uniqueName } : { ...initialNode };

		// Initialize parameters with defaults if node type is available
		if (nodeTypeDescription.value) {
			const defaultParameters = NodeHelpers.getNodeParameters(
				nodeTypeDescription.value.properties ?? [],
				nodeData.parameters ?? {},
				true, // returnDefaults: include all default values
				false, // returnNoneDisplayed: exclude hidden parameters
				nodeData,
				nodeTypeDescription.value,
			);

			nodeData = {
				...nodeData,
				parameters: defaultParameters ?? {},
			};

			// Determine if the name is still a default (not user-edited).
			// Check both isDefaultNodeName and displayName since tool variants
			// set the initial name from displayName ("Airtable Tool")
			// while defaults.name stays as the base ("Airtable").
			const nameForCheck = nodeData.name.replace(/ \(\d+\)$/, '');
			userEditedName.value = !(
				NodeHelpers.isDefaultNodeName(
					nameForCheck,
					nodeTypeDescription.value,
					nodeData.parameters,
				) || nameForCheck === nodeTypeDescription.value.displayName
			);

			// Generate resource/operation-based automatic name for non-edited names
			if (!userEditedName.value) {
				const newName = NodeHelpers.makeNodeName(
					nodeData.parameters ?? {},
					nodeTypeDescription.value,
				);
				if (newName && newName !== nameForCheck) {
					nodeData = {
						...nodeData,
						name: makeUniqueName(newName, existingToolNames.value),
					};
				}
			}

			// Re-apply a name the user edited before hydration completed, and
			// keep it marked as edited so later auto-rename stays off.
			if (preservedName !== null && preservedName !== undefined) {
				nodeData = { ...nodeData, name: preservedName };
				userEditedName.value = true;
			}

			nodeTypeError.value = false;
			hydratedInitialNode.value = initialNodeId;
			node.value = nodeData;
		} else if (nodeTypesLoaded.value) {
			// Node types catalog loaded but this specific node type was not found
			nodeTypeError.value = true;
			node.value = nodeData;
		} else {
			// Node types catalog not loaded yet; defer hydration until loaded
			node.value = nodeData;
		}
	},
	{ immediate: true },
);

// Sync node to the isolated workflow document store only after hydration.
// Declared after the hydration watcher so that on immediate fire, node.value
// is already hydrated before being written to the document store.
watch(
	node,
	(currentNode) => {
		if (currentNode && nodeTypeDescription.value !== null) {
			toolWorkflowStore.setNodes([currentNode]);
			if (props.syncNodeToNdv) {
				toolNdvStore.setActiveNodeName(currentNode.name, 'other');
			}
		}
	},
	{ immediate: true },
);

// Auto-rename when resource/operation changes (if user hasn't manually edited)
watch(
	() => [node.value?.parameters?.resource, node.value?.parameters?.operation],
	() => {
		if (userEditedName.value || !node.value || !nodeTypeDescription.value) return;

		const newName = NodeHelpers.makeNodeName(node.value.parameters, nodeTypeDescription.value);
		if (newName) {
			const uniqueName = makeUniqueName(newName, existingToolNames.value);
			if (uniqueName !== node.value.name) {
				node.value = { ...node.value, name: uniqueName };
			}
		}
	},
);

// Emit validity and name changes
watch(isValid, (val) => {
	emit('update:valid', !!val);
});

watch(
	node,
	(updatedNode) => {
		if (updatedNode) {
			emit('update:node', updatedNode);
		}
	},
	{ immediate: true },
);

watch(
	() => node.value?.name,
	(name) => {
		if (name) {
			emit('update:node-name', name);
		}
	},
);

onMounted(async () => {
	try {
		nodeTypesLoadFailed.value = false;
		await nodeTypesStore.loadNodeTypesIfNotLoaded();
	} catch (error) {
		console.error('Failed to load node types', error);
		nodeTypesLoadFailed.value = true;
	}

	// Emit initial values
	emit('update:valid', !!isValid.value);
	if (node.value?.name) {
		emit('update:node-name', node.value.name);
	}

	// Set project context for dynamic parameter loading and credential creation.
	if (props.projectId) {
		await projectsStore.fetchAndSetProject(props.projectId);
	} else {
		// No usable project scope was provided (the agent scope id can resolve to
		// '' before project state loads). Ensure the personal project is loaded so
		// the credential fetch below has a real scope on first open.
		if (!projectsStore.personalProject) {
			await projectsStore.getPersonalProject();
		}
		if (projectsStore.personalProject) {
			projectsStore.setCurrentProject(projectsStore.personalProject);
		}
	}

	// Ensure credentials are loaded for the credentials selector to work.
	// Always refresh for the resolved project context so previously loaded
	// credentials from another project do not bleed into this tool config.
	const projectId = credentialProjectId.value;
	if (projectId) {
		await Promise.all([
			credentialsStore.fetchCredentialTypes(false),
			credentialsStore.fetchUsableCredentials({ projectId }),
		]);
	}
});

onBeforeUnmount(() => {
	// Clear current project to avoid side effects
	projectsStore.setCurrentProject(null);

	// Dispose the scoped document store and the NDV store its descendants
	// materialize — Pinia stores are not freed on unmount. The doc id is a
	// constant and only one tool-config host is mounted at a time.
	const documentStore = workflowDocumentStore.value;
	disposeNDVStore(toolNdvStore);
	disposeWorkflowDocumentStore(documentStore);
});

defineExpose({ node, isValid, nodeTypeDescription, handleChangeName });
</script>

<template>
	<div :class="$style.container">
		<N8nTabs
			v-if="tabOptions.length > 1"
			:model-value="activeTab"
			:options="tabOptions"
			:class="$style.tabs"
			@update:model-value="activeTab = $event"
		/>

		<div :class="$style.tabContent">
			<!-- Parameters Tab -->
			<div v-show="activeTab === 'params'">
				<ParameterInputList
					v-if="node && isHydrated"
					:parameters="parametersByTab.params"
					:hide-delete="true"
					:node-values="node.parameters"
					:is-read-only="false"
					:node="node"
					:parameter-issues="props.parameterIssues"
					:from-ai-disabled-parameters="props.fromAiDisabledParameters"
					@value-changed="handleChangeParameter"
				>
					<NodeCredentials
						:node="node"
						:readonly="false"
						:show-all="true"
						:project-id="credentialProjectId"
						:hide-issues="false"
						:hide-ask-assistant="props.hideAskAssistant"
						:skip-credentials-fetch="true"
						@credential-selected="handleChangeCredential"
						@value-changed="handleChangeParameter"
					/>
					<div v-if="$slots.commonSettings" :class="$style.commonSettings">
						<slot name="commonSettings" />
					</div>
				</ParameterInputList>
				<div v-else-if="nodeTypesLoadFailed" :class="$style.errorNotice">
					<N8nNotice theme="danger" :content="i18n.baseText('workflowDiff.error.loadNodeTypes')" />
				</div>
				<div v-else-if="nodeTypeError" :class="$style.errorNotice">
					<N8nNotice
						theme="warning"
						:content="
							i18n.baseText('nodeSettings.theNodeIsNotValidAsItsTypeIsUnknown', {
								interpolate: { nodeType: props.initialNode.type },
							})
						"
					/>
				</div>
				<div v-else-if="node" :class="$style.loading">
					<N8nSpinner />
				</div>
				<div v-if="node && isHydrated && showNoParametersNotice" :class="$style.noParameters">
					<N8nText>
						{{ i18n.baseText('nodeSettings.thisNodeDoesNotHaveAnyParameters') }}
					</N8nText>
				</div>
			</div>

			<!-- Settings Tab -->
			<div v-show="activeTab === 'settings'">
				<ParameterInputList
					v-if="node && isHydrated && parametersByTab.settings.length > 0"
					:parameters="parametersByTab.settings"
					:node-values="settingsNodeValues"
					:is-read-only="false"
					:hide-delete="true"
					path="parameters"
					:node="node"
					@value-changed="handleChangeSettingsValue"
				/>
				<ParameterInputList
					v-if="node && isHydrated"
					:parameters="nodeSettings"
					:hide-delete="true"
					:node-values="settingsNodeValues"
					:is-read-only="false"
					path=""
					:node="node"
					@value-changed="handleChangeSettingsValue"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	overflow: hidden;
	flex: 1;
	min-height: 0;
}

.tabs {
	flex-shrink: 0;
	margin-bottom: var(--spacing--xs);
	padding-right: var(--spacing--lg);
}

.tabContent {
	flex: 1;
	overflow-y: auto;
	min-height: 0;
	padding-right: var(--spacing--lg);
}

.noParameters {
	margin-top: var(--spacing--xs);
}

.commonSettings {
	margin-top: var(--spacing--xs);
}

.loading {
	display: flex;
	justify-content: center;
	align-items: center;
	padding: var(--spacing--xl) 0;
}

.errorNotice {
	margin-top: var(--spacing--xs);
}
</style>
