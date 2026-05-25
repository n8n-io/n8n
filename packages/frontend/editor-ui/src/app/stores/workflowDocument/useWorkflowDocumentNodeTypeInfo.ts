import { effectScope, shallowReactive, type ComputedRef, type Ref, type ShallowRef } from 'vue';
import { structuralComputed } from '@n8n/composables/structuralComputed';
import isEqual from 'lodash/isEqual';
import type { INodeTypeDescription, Workflow } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import type { WorkflowObjectAccessors } from '@/app/types';
import {
	CUSTOM_API_CALL_KEY,
	SIMULATE_NODE_TYPE,
	SIMULATE_TRIGGER_NODE_TYPE,
} from '@/app/constants';
import { CHANGE_ACTION } from './types';
import type {
	NodeAddedPayload,
	NodeRemovedPayload,
	NodesChangeEvent,
	NodesSetPayload,
} from './useWorkflowDocumentNodes';

export type WorkflowDocumentNodeTypeInfoDeps = {
	nodesById: ShallowRef<Map<string, INodeUi>>;
	onNodesChange: (cb: (event: NodesChangeEvent) => void) => void;
	workflowObject: Ref<Workflow>;
	getNodeType: (typeName: string, version?: number) => INodeTypeDescription | null;
	communityNodeType: (
		typeName: string,
	) => { nodeDescription?: INodeTypeDescription | null } | null | undefined;
	isTriggerNode: (typeName: string) => boolean;
	getNodeSubtitle: (
		node: INodeUi,
		nodeType: INodeTypeDescription,
		workflow: WorkflowObjectAccessors,
	) => string | undefined;
};

/**
 * Per-node-id derivations from the workflow document, keyed by node id.
 *
 * Each map is a `shallowReactive<Map<id, ComputedRef<T>>>` where every entry
 * is a `structuralComputed` running in its own `effectScope`. Reads inside
 * the derivation track dependencies (node parameters, type, workflowObject)
 * so updates re-evaluate that entry lazily; `isEqual` gates downstream
 * propagation. Map identity stays stable across in-place node updates so
 * unrelated entries do not re-evaluate.
 *
 * Lifecycle is driven by `onNodesChange`:
 *   ADD    → create entries for the new node
 *   DELETE → tear down the node's effectScope and drop the map entries
 *   SET    → reconcile against the full id set (used by hydrate/reset)
 *   UPDATE → no-op; per-entry computeds re-evaluate on next read
 */
export function useWorkflowDocumentNodeTypeInfo(deps: WorkflowDocumentNodeTypeInfoDeps) {
	const nodeTypeDescriptionByNodeId = shallowReactive(
		new Map<string, ComputedRef<INodeTypeDescription | null>>(),
	);
	const isTriggerByNodeId = shallowReactive(new Map<string, ComputedRef<boolean>>());
	const subtitleByNodeId = shallowReactive(new Map<string, ComputedRef<string>>());
	const simulatedNodeTypeDescriptionByNodeId = shallowReactive(
		new Map<string, ComputedRef<INodeTypeDescription | null>>(),
	);

	const scopes = new Map<string, () => void>();

	function computeNodeTypeDescription(nodeId: string): INodeTypeDescription | null {
		const node = deps.nodesById.value.get(nodeId);
		if (!node) return null;
		return (
			deps.getNodeType(node.type, node.typeVersion) ??
			deps.communityNodeType(node.type)?.nodeDescription ??
			null
		);
	}

	function computeIsTrigger(nodeId: string): boolean {
		const node = deps.nodesById.value.get(nodeId);
		if (!node) return false;
		return deps.isTriggerNode(node.type);
	}

	function computeSubtitle(nodeId: string): string {
		const node = deps.nodesById.value.get(nodeId);
		if (!node) return '';
		try {
			const nodeTypeDescription = computeNodeTypeDescription(nodeId);
			if (!nodeTypeDescription) return '';

			const subtitle = deps.getNodeSubtitle(node, nodeTypeDescription, deps.workflowObject.value);
			if (subtitle === undefined) return '';
			// Subtitles that resolve to the "custom API call" placeholder are noise — hide them.
			if (subtitle.includes(CUSTOM_API_CALL_KEY)) return '';
			return subtitle;
		} catch {
			return '';
		}
	}

	function computeSimulatedNodeTypeDescription(nodeId: string): INodeTypeDescription | null {
		const node = deps.nodesById.value.get(nodeId);
		if (!node) return null;
		if (node.type !== SIMULATE_NODE_TYPE && node.type !== SIMULATE_TRIGGER_NODE_TYPE) return null;

		const icon = node.parameters?.icon as string;
		const iconValue = deps.workflowObject.value.expression.getSimpleParameterValue(
			node,
			icon,
			'internal',
			{},
		);
		if (iconValue && typeof iconValue === 'string') {
			return deps.getNodeType(iconValue) ?? null;
		}
		return null;
	}

	function applyAddEntry(nodeId: string) {
		if (scopes.has(nodeId)) return;
		const scope = effectScope();
		scope.run(() => {
			nodeTypeDescriptionByNodeId.set(
				nodeId,
				structuralComputed(() => computeNodeTypeDescription(nodeId), isEqual),
			);
			isTriggerByNodeId.set(
				nodeId,
				structuralComputed(() => computeIsTrigger(nodeId)),
			);
			subtitleByNodeId.set(
				nodeId,
				structuralComputed(() => computeSubtitle(nodeId)),
			);
			simulatedNodeTypeDescriptionByNodeId.set(
				nodeId,
				structuralComputed(() => computeSimulatedNodeTypeDescription(nodeId), isEqual),
			);
		});
		scopes.set(nodeId, () => scope.stop());
	}

	function applyRemoveEntry(nodeId: string) {
		scopes.get(nodeId)?.();
		scopes.delete(nodeId);
		nodeTypeDescriptionByNodeId.delete(nodeId);
		isTriggerByNodeId.delete(nodeId);
		subtitleByNodeId.delete(nodeId);
		simulatedNodeTypeDescriptionByNodeId.delete(nodeId);
	}

	function applyReconcileEntries(nodeIds: string[]) {
		const nextIds = new Set(nodeIds);
		for (const oldId of scopes.keys()) {
			if (!nextIds.has(oldId)) applyRemoveEntry(oldId);
		}
		for (const id of nodeIds) applyAddEntry(id);
	}

	deps.onNodesChange((event) => {
		switch (event.action) {
			case CHANGE_ACTION.ADD: {
				const { node } = event.payload as NodeAddedPayload;
				applyAddEntry(node.id);
				break;
			}
			case CHANGE_ACTION.DELETE: {
				const payload = event.payload as NodeRemovedPayload;
				if (payload.id) {
					applyRemoveEntry(payload.id);
				} else {
					// removeAllNodes fires DELETE with empty payload
					applyReconcileEntries([]);
				}
				break;
			}
			case CHANGE_ACTION.SET: {
				const { nodeIds } = event.payload as NodesSetPayload;
				applyReconcileEntries(nodeIds);
				break;
			}
		}
	});

	// Initial reconciliation for nodes that exist before event subscription.
	applyReconcileEntries(Array.from(deps.nodesById.value.keys()));

	return {
		nodeTypeDescriptionByNodeId,
		isTriggerByNodeId,
		subtitleByNodeId,
		simulatedNodeTypeDescriptionByNodeId,
	};
}
