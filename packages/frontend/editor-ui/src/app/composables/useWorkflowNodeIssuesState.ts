import { EnterpriseEditionFeature } from '@/app/constants';

import { NodeHelpers } from 'n8n-workflow';
import type {
	INodeProperties,
	INodeCredentialDescription,
	INodeTypeDescription,
	INodeIssues,
	ICredentialType,
	INodeIssueObjectProperty,
	INodeInputConfiguration,
	Workflow,
	INodeCredentialsDetails,
	NodeConnectionType,
	INodeIssueData,
	INodeCredentials,
	INodeParameters,
} from 'n8n-workflow';

import type { ICredentialsResponse } from '@/features/credentials/credentials.types';
import type { INodeUi } from '@/Interface';

import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@/app/stores/settings.store';
import { hasPermission } from '@/app/utils/rbac/permissions';
import { hasProxyAuth, displayParameter } from '@/app/utils/nodeIssueUtils';

declare namespace HttpRequestNode {
	namespace V2 {
		type AuthParams = {
			authentication: 'none' | 'genericCredentialType' | 'predefinedCredentialType';
			genericAuthType: string;
			nodeCredentialType: string;
		};
	}
}

type UpdateNodeAtIndexFn = (nodeIndex: number, nodeData: Partial<INodeUi>) => boolean;

interface UseWorkflowNodeIssuesStateOptions {
	updateNodeAtIndex: UpdateNodeAtIndexFn;
}

export function useWorkflowNodeIssuesState(options: UseWorkflowNodeIssuesStateOptions) {
	const { updateNodeAtIndex } = options;
	const credentialsStore = useCredentialsStore();
	const nodeTypesStore = useNodeTypesStore();
	const workflowsStore = useWorkflowsStore();
	const settingsStore = useSettingsStore();
	const i18n = useI18n();

	function setNodeIssue(nodeIssueData: INodeIssueData): void {
		const nodeIndex = workflowsStore.workflow.nodes.findIndex((node) => {
			return node.name === nodeIssueData.node;
		});
		if (nodeIndex === -1) {
			return;
		}

		const node = workflowsStore.workflow.nodes[nodeIndex];

		if (nodeIssueData.value === null) {
			// Remove the value if one exists
			if (node.issues?.[nodeIssueData.type] === undefined) {
				// No values for type exist so nothing has to get removed
				return;
			}

			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { [nodeIssueData.type]: _removedNodeIssue, ...remainingNodeIssues } = node.issues;
			updateNodeAtIndex(nodeIndex, {
				issues: remainingNodeIssues,
			});
		} else {
			updateNodeAtIndex(nodeIndex, {
				issues: {
					...node.issues,
					[nodeIssueData.type]: nodeIssueData.value as INodeIssueObjectProperty,
				},
			});
		}
	}

	/**
	 * Returns a list of credential IDs that the current user does not have access to,
	 * if the Sharing feature is enabled.
	 *
	 * These are considered "foreign" credentials: the user can't view or manage them,
	 * but can still execute workflows that use them.
	 */
	function getForeignCredentialsIfSharingEnabled(
		credentials: INodeCredentials | undefined,
	): string[] {
		if (
			!credentials ||
			!settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Sharing]
		) {
			return [];
		}

		const usedCredentials = workflowsStore.usedCredentials;

		return Object.values(credentials)
			.map(({ id }) => id)
			.filter((id) => id !== null)
			.filter((id) => id in usedCredentials && !usedCredentials[id]?.currentUserHasAccess);
	}

	function getNodeIssues(
		nodeType: INodeTypeDescription | null,
		node: INodeUi,
		workflow: Workflow,
		ignoreIssues?: string[],
	): INodeIssues | null {
		const pinDataNodeNames = Object.keys(workflowsStore.pinnedWorkflowData ?? {});

		let nodeIssues: INodeIssues | null = null;
		ignoreIssues = ignoreIssues ?? [];

		if (node.disabled === true || pinDataNodeNames.includes(node.name)) {
			// Ignore issues on disabled and pindata nodes
			return null;
		}

		if (nodeType === null) {
			// Node type is not known
			if (!ignoreIssues.includes('typeUnknown')) {
				nodeIssues = {
					typeUnknown: true,
				};
			}
		} else {
			// Node type is known

			// Add potential parameter issues
			if (!ignoreIssues.includes('parameters')) {
				nodeIssues = NodeHelpers.getNodeParametersIssues(nodeType.properties, node, nodeType);
			}

			if (!ignoreIssues.includes('credentials')) {
				// Add potential credential issues
				const nodeCredentialIssues = getNodeCredentialIssues(node, nodeType);
				if (nodeIssues === null) {
					nodeIssues = nodeCredentialIssues;
				} else {
					NodeHelpers.mergeIssues(nodeIssues, nodeCredentialIssues);
				}
			}

			const nodeInputIssues = getNodeInputIssues(workflow, node, nodeType);
			if (nodeIssues === null) {
				nodeIssues = nodeInputIssues;
			} else {
				NodeHelpers.mergeIssues(nodeIssues, nodeInputIssues);
			}
		}

		if (hasNodeExecutionIssues(node) && !ignoreIssues.includes('execution')) {
			if (nodeIssues === null) {
				nodeIssues = {};
			}
			nodeIssues.execution = true;
		}

		return nodeIssues;
	}

	// Set the status on all the nodes which produced an error so that it can be
	// displayed in the node-view
	function hasNodeExecutionIssues(node: INodeUi): boolean {
		const workflowResultData = workflowsStore.getWorkflowRunData;

		if (!workflowResultData?.hasOwnProperty(node.name)) {
			return false;
		}

		for (const taskData of workflowResultData[node.name]) {
			if (taskData.error !== undefined) {
				return true;
			}
		}

		return false;
	}

	function reportUnsetCredential(credentialType: ICredentialType) {
		return {
			credentials: {
				[credentialType.name]: [
					i18n.baseText('nodeHelpers.credentialsUnset', {
						interpolate: {
							credentialType: credentialType.displayName,
						},
					}),
				],
			},
		};
	}

	function updateNodeInputIssues(node: INodeUi): void {
		const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
		if (!nodeType) {
			return;
		}

		const nodeInputIssues = getNodeInputIssues(
			workflowsStore.workflowObject as Workflow,
			node,
			nodeType,
		);

		setNodeIssue({
			node: node.name,
			type: 'input',
			value: nodeInputIssues?.input ? nodeInputIssues.input : null,
		});
	}

	function updateNodesInputIssues() {
		const nodes = workflowsStore.allNodes;

		for (const node of nodes) {
			updateNodeInputIssues(node);
		}
	}

	function updateNodesExecutionIssues() {
		const nodes = workflowsStore.allNodes;

		for (const node of nodes) {
			setNodeIssue({
				node: node.name,
				type: 'execution',
				value: hasNodeExecutionIssues(node) ? true : null,
			});
		}
	}

	function updateNodesParameterIssues() {
		const nodes = workflowsStore.allNodes;

		for (const node of nodes) {
			updateNodeParameterIssues(node);
		}
	}

	function updateNodeCredentialIssuesByName(name: string): void {
		const node = workflowsStore.getNodeByName(name);

		if (node) {
			updateNodeCredentialIssues(node);
		}
	}

	function updateNodeCredentialIssues(node: INodeUi): void {
		const fullNodeIssues: INodeIssues | null = getNodeCredentialIssues(node);

		let newIssues: INodeIssueObjectProperty | null = null;
		if (fullNodeIssues !== null) {
			newIssues = fullNodeIssues.credentials!;
		}

		setNodeIssue({
			node: node.name,
			type: 'credentials',
			value: newIssues,
		});
	}

	function updateNodeParameterIssuesByName(name: string): void {
		const node = workflowsStore.getNodeByName(name);

		if (node) {
			updateNodeParameterIssues(node);
		}
	}

	function updateNodeParameterIssues(node: INodeUi, nodeType?: INodeTypeDescription | null): void {
		const localNodeType = nodeType ?? nodeTypesStore.getNodeType(node.type, node.typeVersion);

		if (localNodeType === null) {
			// Could not find localNodeType so can not update issues
			return;
		}

		// All data got updated everywhere so update now the issues
		const fullNodeIssues: INodeIssues | null = NodeHelpers.getNodeParametersIssues(
			localNodeType.properties,
			node,
			localNodeType,
		);

		let newIssues: INodeIssueObjectProperty | null = null;
		if (fullNodeIssues !== null) {
			newIssues = fullNodeIssues.parameters!;
		}

		setNodeIssue({
			node: node.name,
			type: 'parameters',
			value: newIssues,
		});
	}

	function getNodeInputIssues(
		workflow: Workflow,
		node: INodeUi,
		nodeType?: INodeTypeDescription,
	): INodeIssues | null {
		const foundIssues: INodeIssueObjectProperty = {};

		const workflowNode = workflow.getNode(node.name);
		let inputs: Array<NodeConnectionType | INodeInputConfiguration> = [];
		if (nodeType && workflowNode) {
			inputs = NodeHelpers.getNodeInputs(workflow, workflowNode, nodeType);
		}

		inputs.forEach((input) => {
			if (typeof input === 'string' || input.required !== true) {
				return;
			}

			const parentNodes = workflow.getParentNodes(node.name, input.type, 1);

			if (parentNodes.length === 0) {
				foundIssues[input.type] = [
					i18n.baseText('nodeIssues.input.missing', {
						interpolate: { inputName: input.displayName || input.type },
					}),
				];
			}
		});

		if (Object.keys(foundIssues).length) {
			return {
				input: foundIssues,
			};
		}

		return null;
	}

	function getNodeCredentialIssues(
		node: INodeUi,
		nodeType?: INodeTypeDescription,
	): INodeIssues | null {
		const localNodeType = nodeType ?? nodeTypesStore.getNodeType(node.type, node.typeVersion);
		if (node.disabled) {
			// Node is disabled
			return null;
		}
		if (!localNodeType?.credentials) {
			// Node does not need any credentials or nodeType could not be found
			return null;
		}

		const foundIssues: INodeIssueObjectProperty = {};

		let userCredentials: ICredentialsResponse[] | null;
		let credentialType: ICredentialType | undefined;
		let credentialDisplayName: string;
		let selectedCredentials: INodeCredentialsDetails;

		const { authentication, genericAuthType, nodeCredentialType } =
			node.parameters as HttpRequestNode.V2.AuthParams;

		if (
			authentication === 'genericCredentialType' &&
			genericAuthType !== '' &&
			selectedCredsAreUnusable(node, genericAuthType)
		) {
			const credential = credentialsStore.getCredentialTypeByName(genericAuthType);
			return credential ? reportUnsetCredential(credential) : null;
		}

		if (
			hasProxyAuth(node) &&
			authentication === 'predefinedCredentialType' &&
			nodeCredentialType !== '' &&
			node.credentials !== undefined
		) {
			const stored = credentialsStore.getCredentialsByType(nodeCredentialType);
			// Prevents HTTP Request node from being unusable if a sharee does not have direct
			// access to a credential
			const isCredentialUsedInWorkflow =
				workflowsStore.usedCredentials?.[node.credentials?.[nodeCredentialType]?.id as string];

			if (
				selectedCredsDoNotExist(node, nodeCredentialType, stored) &&
				!isCredentialUsedInWorkflow
			) {
				const credential = credentialsStore.getCredentialTypeByName(nodeCredentialType);
				return credential ? reportUnsetCredential(credential) : null;
			}
		}

		if (
			hasProxyAuth(node) &&
			authentication === 'predefinedCredentialType' &&
			nodeCredentialType !== '' &&
			selectedCredsAreUnusable(node, nodeCredentialType)
		) {
			const credential = credentialsStore.getCredentialTypeByName(nodeCredentialType);
			return credential ? reportUnsetCredential(credential) : null;
		}

		for (const credentialTypeDescription of localNodeType.credentials) {
			// Check if credentials should be displayed else ignore
			const nodeTypeDescription = nodeTypesStore.getNodeType(node.type, node.typeVersion);
			if (
				!displayParameter(node.parameters, credentialTypeDescription, '', node, nodeTypeDescription)
			) {
				continue;
			}

			// Get the display name of the credential type
			credentialType = credentialsStore.getCredentialTypeByName(credentialTypeDescription.name);
			if (!credentialType) {
				credentialDisplayName = credentialTypeDescription.name;
			} else {
				credentialDisplayName = credentialType.displayName;
			}

			if (!node.credentials?.[credentialTypeDescription.name]) {
				// Credentials are not set
				if (credentialTypeDescription.required) {
					foundIssues[credentialTypeDescription.name] = [
						i18n.baseText('nodeIssues.credentials.notSet', {
							interpolate: { type: localNodeType.displayName },
						}),
					];
				}
			} else {
				// If they are set check if the value is valid
				selectedCredentials = node.credentials[credentialTypeDescription.name];
				if (typeof selectedCredentials === 'string') {
					selectedCredentials = {
						id: null,
						name: selectedCredentials,
					};
				}

				userCredentials = credentialsStore.getCredentialsByType(credentialTypeDescription.name);

				if (userCredentials === null) {
					userCredentials = [];
				}

				if (selectedCredentials.id) {
					const idMatch = userCredentials.find(
						(credentialData) => credentialData.id === selectedCredentials.id,
					);
					if (idMatch) {
						continue;
					}
				}

				const nameMatches = userCredentials.filter(
					(credentialData) => credentialData.name === selectedCredentials.name,
				);
				if (nameMatches.length > 1) {
					foundIssues[credentialTypeDescription.name] = [
						i18n.baseText('nodeIssues.credentials.notIdentified', {
							interpolate: { name: selectedCredentials.name, type: credentialDisplayName },
						}),
						i18n.baseText('nodeIssues.credentials.notIdentified.hint'),
					];
					continue;
				}

				if (nameMatches.length === 0) {
					const isCredentialUsedInWorkflow =
						workflowsStore.usedCredentials?.[selectedCredentials.id as string];

					if (
						!isCredentialUsedInWorkflow &&
						!hasPermission(['rbac'], { rbac: { scope: 'credential:read' } })
					) {
						foundIssues[credentialTypeDescription.name] = [
							i18n.baseText('nodeIssues.credentials.doNotExist', {
								interpolate: { name: selectedCredentials.name, type: credentialDisplayName },
							}),
							i18n.baseText('nodeIssues.credentials.doNotExist.hint'),
						];
					}
				}
			}
		}

		// TODO: Could later check also if the node has access to the credentials
		if (Object.keys(foundIssues).length === 0) {
			return null;
		}

		return {
			credentials: foundIssues,
		};
	}

	/**
	 * Whether the node has no selected credentials, or none of the node's
	 * selected credentials are of the specified type.
	 */
	function selectedCredsAreUnusable(node: INodeUi, credentialType: string) {
		return !node.credentials || !Object.keys(node.credentials).includes(credentialType);
	}

	/**
	 * Whether the node's selected credentials of the specified type
	 * can no longer be found in the database.
	 */
	function selectedCredsDoNotExist(
		node: INodeUi,
		nodeCredentialType: string,
		storedCredsByType: ICredentialsResponse[] | null,
	) {
		if (!node.credentials || !storedCredsByType) return false;

		const selectedCredsByType = node.credentials[nodeCredentialType];

		if (!selectedCredsByType) return false;

		return !storedCredsByType.find((c) => c.id === selectedCredsByType.id);
	}

	function updateNodesCredentialsIssues() {
		const nodes = workflowsStore.allNodes;
		let issues: INodeIssues | null;

		for (const node of nodes) {
			issues = getNodeCredentialIssues(node);

			setNodeIssue({
				node: node.name,
				type: 'credentials',
				value: issues?.credentials ?? null,
			});
		}
	}

	/**
	 * Wrapper for displayParameter that fetches nodeTypeDescription automatically.
	 * Maintains backward compatibility with the original 5-arg signature.
	 */
	function displayParameterWithNodeType(
		nodeValues: INodeParameters,
		parameter: INodeProperties | INodeCredentialDescription,
		path: string,
		node: INodeUi | null,
		displayKey: 'displayOptions' | 'disabledOptions' = 'displayOptions',
	): boolean {
		const nodeTypeDescription = node?.type
			? nodeTypesStore.getNodeType(node.type, node.typeVersion)
			: null;
		return displayParameter(nodeValues, parameter, path, node, nodeTypeDescription, displayKey);
	}

	return {
		// Issue checking
		getNodeIssues,
		hasNodeExecutionIssues,
		getNodeInputIssues,
		getNodeCredentialIssues,
		selectedCredsAreUnusable,
		selectedCredsDoNotExist,
		reportUnsetCredential,
		getForeignCredentialsIfSharingEnabled,

		// Issue updates (single node)
		setNodeIssue,
		updateNodeInputIssues,
		updateNodeCredentialIssues,
		updateNodeCredentialIssuesByName,
		updateNodeParameterIssues,
		updateNodeParameterIssuesByName,

		// Issue updates (all nodes)
		updateNodesInputIssues,
		updateNodesExecutionIssues,
		updateNodesParameterIssues,
		updateNodesCredentialsIssues,

		// Parameter display utility
		displayParameter: displayParameterWithNodeType,

		// Re-export pure utilities for convenience
		hasProxyAuth,
	};
}

export type WorkflowNodeIssuesState = ReturnType<typeof useWorkflowNodeIssuesState>;
