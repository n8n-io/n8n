import type { CRDTDoc, CRDTMap, Unsubscribe } from '@n8n/crdt';
import type { IConnections, INode, Workflow } from 'n8n-workflow';

/**
 * Synchronizes a Workflow instance with a CRDT document.
 *
 * This function subscribes to changes in the CRDT document and updates
 * the Workflow instance accordingly. The Workflow's nodes and connections
 * are updated via its setNodes and setConnections methods.
 *
 * @param doc - The CRDT document to sync from
 * @param workflow - The Workflow instance to keep in sync
 * @returns An unsubscribe function to stop syncing
 */
export function syncWorkflowWithDoc(doc: CRDTDoc, workflow: Workflow): Unsubscribe {
	const meta = doc.getMap<unknown>('meta');
	const nodesMap = doc.getMap<unknown>('nodes');
	const connectionsMap = doc.getMap<unknown>('connections');

	// Sync meta changes (name, settings)
	const metaUnsub = meta.onDeepChange(() => {
		const name = meta.get('name') as string | undefined;
		if (name !== undefined) {
			workflow.name = name;
		}
		const settings = meta.get('settings');
		if (settings !== undefined) {
			workflow.setSettings(settings as typeof workflow.settings);
		}
	});

	// Sync nodes changes
	const nodesUnsub = nodesMap.onDeepChange(() => {
		const nodes = extractNodes(nodesMap);
		workflow.setNodes(nodes);
	});

	// Sync connections changes
	const connectionsUnsub = connectionsMap.onDeepChange(() => {
		const connections = connectionsMap.toJSON() as IConnections;
		workflow.setConnections(connections);
	});

	// Return combined unsubscribe function
	return () => {
		metaUnsub();
		nodesUnsub();
		connectionsUnsub();
	};
}

/**
 * Extract nodes from a CRDT nodes map as an array.
 */
function extractNodes(nodesMap: CRDTMap<unknown>): INode[] {
	const nodes: INode[] = [];

	for (const [, nodeValue] of nodesMap.entries()) {
		let node: INode;
		// Handle CRDTMap (nested structure) or plain object
		if (nodeValue && typeof nodeValue === 'object' && 'toJSON' in nodeValue) {
			node = (nodeValue as { toJSON(): INode }).toJSON();
		} else {
			node = nodeValue as INode;
		}

		if (node && node.id) {
			nodes.push(node);
		}
	}

	return nodes;
}
