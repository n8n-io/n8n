import { defineStore, getActivePinia } from 'pinia';
import { STORES } from '@n8n/stores';
import { inject } from 'vue';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import { useWorkflowDocumentActive } from './workflowDocument/useWorkflowDocumentActive';
import { useWorkflowDocumentHomeProject } from './workflowDocument/useWorkflowDocumentHomeProject';
import { useWorkflowDocumentSharedWithProjects } from './workflowDocument/useWorkflowDocumentSharedWithProjects';
import { useWorkflowDocumentChecksum } from './workflowDocument/useWorkflowDocumentChecksum';
import { useWorkflowDocumentDescription } from './workflowDocument/useWorkflowDocumentDescription';
import { useWorkflowDocumentMeta } from './workflowDocument/useWorkflowDocumentMeta';
import { useWorkflowDocumentPinData } from './workflowDocument/useWorkflowDocumentPinData';
import { useWorkflowDocumentScopes } from './workflowDocument/useWorkflowDocumentScopes';
import {
	useWorkflowDocumentSettings,
	DEFAULT_SETTINGS,
} from './workflowDocument/useWorkflowDocumentSettings';
import { useWorkflowDocumentTags } from './workflowDocument/useWorkflowDocumentTags';
import { useWorkflowDocumentIsArchived } from './workflowDocument/useWorkflowDocumentIsArchived';
import { useWorkflowDocumentTimestamps } from './workflowDocument/useWorkflowDocumentTimestamps';
import { useWorkflowDocumentParentFolder } from './workflowDocument/useWorkflowDocumentParentFolder';
import { useWorkflowDocumentUsedCredentials } from './workflowDocument/useWorkflowDocumentUsedCredentials';
import { useWorkflowDocumentNodes } from './workflowDocument/useWorkflowDocumentNodes';
import { useWorkflowDocumentVersionData } from './workflowDocument/useWorkflowDocumentVersionData';
import { useWorkflowDocumentViewport } from './workflowDocument/useWorkflowDocumentViewport';
import { useWorkflowDocumentConnections } from './workflowDocument/useWorkflowDocumentConnections';
import { useWorkflowDocumentGraph } from './workflowDocument/useWorkflowDocumentGraph';
import { useWorkflowDocumentExpression } from './workflowDocument/useWorkflowDocumentExpression';
import { useWorkflowDocumentName } from './workflowDocument/useWorkflowDocumentName';
import { useWorkflowDocumentWorkflowObject } from './workflowDocument/useWorkflowDocumentWorkflowObject';
import { useWorkflowDocumentNodeMetadata } from './workflowDocument/useWorkflowDocumentNodeMetadata';
import { useWorkflowDocumentNodesIssues } from './workflowDocument/useWorkflowDocumentNodesIssues';
import { useUIStore } from '@/app/stores/ui.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { serializeNode } from '@/app/utils/nodes/nodeTransforms';
import type { WorkflowObjectAccessors } from '../types';
import type { IWorkflowDb } from '@/Interface';
import type { INode, IPinData } from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';
import type { WorkflowData } from '@n8n/rest-api-client/api/workflows';

export {
	getPinDataSize,
	pinDataToExecutionData,
} from './workflowDocument/useWorkflowDocumentPinData';

// ---------------------------------------------------------------------------
// Compile-time guard: detect key collisions between composable return types.
// If two composables export the same key, the spread pattern silently
// overwrites. This utility type makes that a compile error instead.
// ---------------------------------------------------------------------------

// Keys that are intentionally shared across composables (destructured before
// spreading in the store factory). Exclude them from collision checks.
type SharedKeys = 'onStateDirty';

type CommonKeys<A, B> = Exclude<keyof A & keyof B, SharedKeys>;

/**
 * Evaluates to `true` when A and B share no keys (ignoring SharedKeys),
 * otherwise produces a readable compile error listing the colliding keys.
 */
type AssertNoOverlap<A, B> = CommonKeys<A, B> extends never
	? true
	: { error: 'Key collision between composables'; keys: CommonKeys<A, B> };

// Return types of each composable. Only composables with mutation/query
// methods need checking — simple value composables are unlikely to collide.
type NodesReturn = ReturnType<typeof useWorkflowDocumentNodes>;
type ConnectionsReturn = ReturnType<typeof useWorkflowDocumentConnections>;
type GraphReturn = ReturnType<typeof useWorkflowDocumentGraph>;
type ExpressionReturn = ReturnType<typeof useWorkflowDocumentExpression>;
type MetaReturn = ReturnType<typeof useWorkflowDocumentMeta>;
type PinDataReturn = ReturnType<typeof useWorkflowDocumentPinData>;
type SettingsReturn = ReturnType<typeof useWorkflowDocumentSettings>;
type NodeMetadataReturn = ReturnType<typeof useWorkflowDocumentNodeMetadata>;
type NodesIssuesReturn = ReturnType<typeof useWorkflowDocumentNodesIssues>;

// Pairwise collision checks — add new composables here when they are created.
// If any pair shares a key, the corresponding tuple slot becomes an error type
// and the 'true' assertion below fails at compile time.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
void (0 as unknown as [
	AssertNoOverlap<NodesReturn, GraphReturn>,
	AssertNoOverlap<NodesReturn, ExpressionReturn>,
	AssertNoOverlap<NodesReturn, ConnectionsReturn>,
	AssertNoOverlap<ConnectionsReturn, GraphReturn>,
	AssertNoOverlap<ConnectionsReturn, ExpressionReturn>,
	AssertNoOverlap<GraphReturn, ExpressionReturn>,
	AssertNoOverlap<MetaReturn, NodesReturn>,
	AssertNoOverlap<MetaReturn, ConnectionsReturn>,
	AssertNoOverlap<PinDataReturn, NodesReturn>,
	AssertNoOverlap<SettingsReturn, NodesReturn>,
	AssertNoOverlap<NodeMetadataReturn, NodesReturn>,
	AssertNoOverlap<NodeMetadataReturn, ConnectionsReturn>,
	AssertNoOverlap<NodeMetadataReturn, GraphReturn>,
	AssertNoOverlap<NodeMetadataReturn, PinDataReturn>,
	AssertNoOverlap<NodeMetadataReturn, MetaReturn>,
	AssertNoOverlap<NodeMetadataReturn, SettingsReturn>,
	AssertNoOverlap<NodesIssuesReturn, NodesReturn>,
	AssertNoOverlap<NodesIssuesReturn, ConnectionsReturn>,
	AssertNoOverlap<NodesIssuesReturn, GraphReturn>,
]);

export type WorkflowDocumentId = `${string}@${string}`;

export function createWorkflowDocumentId(
	workflowId: string,
	version: string = 'latest',
): WorkflowDocumentId {
	return `${workflowId}@${version}`;
}

/**
 * Gets the store ID for a workflow document store.
 */
export function getWorkflowDocumentStoreId(id: string) {
	return `${STORES.WORKFLOW_DOCUMENTS}/${id}`;
}

/**
 * Creates a workflow document store for a specific workflow ID.
 *
 * Note: We use a factory function rather than a module-level cache because
 * Pinia store instances must be tied to the active Pinia instance. A module-level
 * cache would cause test isolation issues where stale store references persist
 * across test runs with different Pinia instances.
 *
 * Pinia internally handles store deduplication per-instance via the store ID.
 */
export function useWorkflowDocumentStore(id: WorkflowDocumentId) {
	return defineStore(getWorkflowDocumentStoreId(id), () => {
		const [workflowId, workflowVersion] = id.split('@');

		const nodeTypesStore = useNodeTypesStore();
		const nodeHelpers = useNodeHelpers();

		const { cloneWorkflowObject, createWorkflowObject, ...workflowDocumentWorkflowObject } =
			useWorkflowDocumentWorkflowObject({ workflowId });

		const workflowDocumentName = useWorkflowDocumentName({
			syncWorkflowObject: (name) => workflowDocumentWorkflowObject.syncWorkflowObjectName(name),
		});
		const workflowDocumentActive = useWorkflowDocumentActive();
		const workflowDocumentHomeProject = useWorkflowDocumentHomeProject();
		const workflowDocumentSharedWithProjects = useWorkflowDocumentSharedWithProjects();
		const workflowDocumentChecksum = useWorkflowDocumentChecksum();
		const workflowDocumentDescription = useWorkflowDocumentDescription();
		const workflowDocumentMeta = useWorkflowDocumentMeta();
		const workflowDocumentTags = useWorkflowDocumentTags();
		const workflowDocumentIsArchived = useWorkflowDocumentIsArchived();
		const workflowDocumentPinData = useWorkflowDocumentPinData();
		const workflowDocumentScopes = useWorkflowDocumentScopes();
		const workflowDocumentTimestamps = useWorkflowDocumentTimestamps();
		const workflowDocumentSettings = useWorkflowDocumentSettings({
			syncWorkflowObject: (settings) =>
				workflowDocumentWorkflowObject.syncWorkflowObjectSettings(settings),
		});
		const workflowDocumentParentFolder = useWorkflowDocumentParentFolder();
		const workflowDocumentUsedCredentials = useWorkflowDocumentUsedCredentials();
		const workflowDocumentVersionData = useWorkflowDocumentVersionData();
		const workflowDocumentViewport = useWorkflowDocumentViewport();
		const workflowDocumentNodeMetadata = useWorkflowDocumentNodeMetadata();
		const { onStateDirty: onNodesStateDirty, ...workflowDocumentNodes } = useWorkflowDocumentNodes({
			getNodeType: (typeName, version) => nodeTypesStore.getNodeType(typeName, version),
			nodeMetadata: workflowDocumentNodeMetadata,
			assignNodeId: (node) => nodeHelpers.assignNodeId(node),
			syncWorkflowObject: (nodes) => workflowDocumentWorkflowObject.syncWorkflowObjectNodes(nodes),
			unpinNodeData: (name) => workflowDocumentPinData.unpinNodeData(name),
		});
		const { onStateDirty: onConnectionsStateDirty, ...workflowDocumentConnections } =
			useWorkflowDocumentConnections({
				getNodeById: (id) => workflowDocumentNodes.getNodeById(id),
				syncWorkflowObject: (connections) =>
					workflowDocumentWorkflowObject.syncWorkflowObjectConnections(connections),
			});
		const workflowDocumentGraph = useWorkflowDocumentGraph(
			workflowDocumentWorkflowObject.workflowObject,
		);
		const workflowDocumentExpression = useWorkflowDocumentExpression(
			workflowDocumentWorkflowObject.workflowObject,
		);
		const workflowDocumentNodesIssues = useWorkflowDocumentNodesIssues({
			allNodes: workflowDocumentNodes.allNodes,
			outgoingConnectionsByNodeName: workflowDocumentConnections.outgoingConnectionsByNodeName,
			incomingConnectionsByNodeName: workflowDocumentConnections.incomingConnectionsByNodeName,
		});

		// --- Cross-cut orchestration ---
		// Each composable is self-contained and unaware of its siblings. This
		// store is where cross-concern side effects are wired. When adding new
		// composables, check workflowsStore for hidden cross-cuts that need to
		// surface here.

		onNodesStateDirty(() => useUIStore().markStateDirty());
		onConnectionsStateDirty(() => useUIStore().markStateDirty());

		function removeAllNodes() {
			workflowDocumentNodes.removeAllNodes();
			workflowDocumentConnections.removeAllConnections();
			workflowDocumentPinData.setPinData({});
		}

		function serialize(): WorkflowData {
			const nodes: INode[] = workflowDocumentNodes.allNodes.value.map((node) =>
				serializeNode(nodeTypesStore, node),
			);

			// Deep-copy connections to create an in-time snapshot consistent with nodes.
			// Without this, connections is a reference to the reactive store object, so
			// mutations between now and request serialization can include connections to
			// nodes not present in the nodes snapshot, violating a BE invariant.
			const connections = deepCopy(workflowDocumentConnections.connectionsBySourceNode.value);

			const data: WorkflowData = {
				name: workflowDocumentName.name.value,
				nodes,
				pinData: workflowDocumentPinData.getPinDataSnapshot() as IPinData,
				connections,
				active: workflowDocumentActive.active.value,
				settings: workflowDocumentSettings.settings.value,
				tags: [...workflowDocumentTags.tags.value],
				versionId: workflowDocumentVersionData.versionId.value,
				meta: workflowDocumentMeta.meta.value,
			};

			if (workflowId) {
				data.id = workflowId;
			}

			return data;
		}

		function hydrate(workflow: IWorkflowDb) {
			if (workflow.id !== workflowId) {
				throw new Error(
					`workflowDocumentStore(${id}).hydrate(): workflow id mismatch — ` +
						`expected "${workflowId}", got "${workflow.id}"`,
				);
			}
			if (workflowVersion !== 'latest' && workflow.versionId !== workflowVersion) {
				throw new Error(
					`workflowDocumentStore(${id}).hydrate(): workflow version mismatch — ` +
						`expected "${workflowVersion}", got "${workflow.versionId}"`,
				);
			}

			workflowDocumentName.setName(workflow.name ?? '');
			workflowDocumentDescription.setDescription(workflow.description ?? '');
			workflowDocumentActive.setActiveState({
				activeVersionId: workflow.activeVersionId ?? null,
				activeVersion: workflow.activeVersion ?? null,
			});
			workflowDocumentIsArchived.setIsArchived(workflow.isArchived ?? false);
			workflowDocumentHomeProject.setHomeProject(workflow.homeProject ?? null);
			workflowDocumentSharedWithProjects.setSharedWithProjects(workflow.sharedWithProjects ?? []);
			workflowDocumentScopes.setScopes(workflow.scopes ?? []);
			workflowDocumentTags.setTags(workflow.tags ?? []);
			workflowDocumentMeta.setMeta(workflow.meta ?? {});
			workflowDocumentSettings.setSettings(workflow.settings ?? { ...DEFAULT_SETTINGS });
			workflowDocumentParentFolder.setParentFolder(workflow.parentFolder ?? null);
			workflowDocumentUsedCredentials.setUsedCredentials(workflow.usedCredentials ?? []);
			workflowDocumentTimestamps.setCreatedAt(workflow.createdAt);
			workflowDocumentTimestamps.setUpdatedAt(workflow.updatedAt);
			workflowDocumentChecksum.setChecksum(workflow.checksum ?? '');
			workflowDocumentVersionData.setVersionData({
				versionId: workflow.versionId,
				name: workflow.name ?? null,
				description: workflow.description ?? null,
			});
			workflowDocumentNodes.setNodes(workflow.nodes ?? []);
			workflowDocumentConnections.setConnections(workflow.connections ?? {});
			workflowDocumentPinData.setPinData(workflow.pinData ?? {});

			workflowDocumentWorkflowObject.initWorkflowObject({
				id: workflow.id,
				name: workflow.name,
				nodes: workflow.nodes,
				connections: workflow.connections,
				settings: workflow.settings ?? { ...DEFAULT_SETTINGS },
				pinData: workflow.pinData ?? {},
			});
		}

		function reset() {
			workflowDocumentName.setName('');
			workflowDocumentDescription.setDescription('');
			workflowDocumentActive.setActiveState({ activeVersionId: null, activeVersion: null });
			workflowDocumentIsArchived.setIsArchived(false);
			workflowDocumentHomeProject.setHomeProject(null);
			workflowDocumentSharedWithProjects.setSharedWithProjects([]);
			workflowDocumentScopes.setScopes([]);
			workflowDocumentTags.setTags([]);
			workflowDocumentMeta.setMeta({});
			workflowDocumentSettings.setSettings({ ...DEFAULT_SETTINGS });
			workflowDocumentParentFolder.setParentFolder(null);
			workflowDocumentUsedCredentials.setUsedCredentials([]);
			workflowDocumentTimestamps.setCreatedAt(-1);
			workflowDocumentTimestamps.setUpdatedAt(-1);
			workflowDocumentChecksum.setChecksum('');
			workflowDocumentVersionData.setVersionData({
				versionId: '',
				name: null,
				description: null,
			});
			workflowDocumentNodes.setNodes([]);
			workflowDocumentConnections.setConnections({});
			workflowDocumentPinData.setPinData({});
			workflowDocumentViewport.setViewport(null);

			workflowDocumentWorkflowObject.initWorkflowObject({
				id: workflowId,
				name: '',
				nodes: [],
				connections: {},
				settings: { ...DEFAULT_SETTINGS },
				pinData: {},
			});
		}

		function getSnapshot(): WorkflowObjectAccessors {
			return {
				id: workflowId,
				connectionsBySourceNode: workflowDocumentConnections.connectionsBySourceNode.value,
				pinData: workflowDocumentPinData.pinData.value as IPinData,
				expression: workflowDocumentExpression.getExpressionHandler(),
				getNode: workflowDocumentNodes.getNodeByName,
				getParentNodes: workflowDocumentGraph.getParentNodes,
				getNodeConnectionIndexes: workflowDocumentGraph.getNodeConnectionIndexes,
				getParentMainInputNode: workflowDocumentGraph.getParentMainInputNode,
				getChildNodes: workflowDocumentGraph.getChildNodes,
				getParentNodesByDepth: workflowDocumentGraph.getParentNodesByDepth,
			};
		}

		return {
			workflowId,
			workflowVersion,
			...workflowDocumentName,
			...workflowDocumentActive,
			...workflowDocumentHomeProject,
			...workflowDocumentSharedWithProjects,
			...workflowDocumentChecksum,
			...workflowDocumentDescription,
			...workflowDocumentIsArchived,
			...workflowDocumentMeta,
			...workflowDocumentSettings,
			...workflowDocumentTags,
			...workflowDocumentPinData,
			...workflowDocumentScopes,
			...workflowDocumentTimestamps,
			...workflowDocumentParentFolder,
			...workflowDocumentUsedCredentials,
			...workflowDocumentVersionData,
			...workflowDocumentViewport,
			...workflowDocumentNodes,
			...workflowDocumentConnections,
			...workflowDocumentGraph,
			...workflowDocumentExpression,
			...workflowDocumentNodeMetadata,
			...workflowDocumentNodesIssues,
			removeAllNodes,
			hydrate,
			reset,
			getSnapshot,
			serialize,
			cloneWorkflowObject,
			createWorkflowObject,
		};
	})();
}

/**
 * Disposes a workflow document store instance.
 * Call this when a workflow document is unloaded (e.g., when navigating away from NodeView).
 *
 * Pinia's $dispose removes the store from its registry, but not from pinia.state.
 * Remove the state entry as well so recreating this scoped store starts clean.
 */
export function disposeWorkflowDocumentStore(store: ReturnType<typeof useWorkflowDocumentStore>) {
	const pinia = getActivePinia();
	store.$dispose();

	if (pinia) {
		delete pinia.state.value[store.$id];
	}
}

/**
 * Injects the workflow document store from the current component tree.
 * Returns null if not within a component context that has provided the store.
 *
 * Use this in composables/stores that need to interact with the current workflow's
 * document store but may be called outside of the NodeView tree.
 */
export function injectWorkflowDocumentStore() {
	return inject(WorkflowDocumentStoreKey, null);
}
