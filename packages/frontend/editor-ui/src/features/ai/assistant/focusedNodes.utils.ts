import type { IConnections, INodeIssues } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import type { FocusedNode, FocusedNodesContextPayload } from './focusedNodes.types';

/**
 * Builds the context payload for focused nodes to send to the AI backend.
 * Looks up full node data from the workflow, traverses connections, and
 * extracts node issues into an API-ready payload.
 */
export function buildFocusedNodesPayload(
	confirmedNodes: FocusedNode[],
	allNodes: INodeUi[],
	connectionsByDestination: IConnections,
	connectionsBySource: IConnections,
): FocusedNodesContextPayload[] {
	if (confirmedNodes.length === 0) {
		return [];
	}

	const nodeById = new Map(allNodes.map((n) => [n.id, n]));

	return confirmedNodes.map((focusedNode) => {
		const node = nodeById.get(focusedNode.nodeId);
		if (!node) {
			return {
				name: focusedNode.nodeName,
				incomingConnections: [],
				outgoingConnections: [],
			};
		}

		const incomingConnections: string[] = [];
		const nodeConnections = connectionsByDestination[node.name];
		if (nodeConnections?.main) {
			for (const inputConnections of nodeConnections.main) {
				if (inputConnections) {
					for (const conn of inputConnections) {
						if (conn.node && !incomingConnections.includes(conn.node)) {
							incomingConnections.push(conn.node);
						}
					}
				}
			}
		}

		const outgoingConnections: string[] = [];
		const sourceConnections = connectionsBySource[node.name];
		if (sourceConnections?.main) {
			for (const outputConnections of sourceConnections.main) {
				if (outputConnections) {
					for (const conn of outputConnections) {
						if (conn.node && !outgoingConnections.includes(conn.node)) {
							outgoingConnections.push(conn.node);
						}
					}
				}
			}
		}

		let issues: Record<string, string[]> | undefined;
		if (node.issues) {
			issues = {};
			const nodeIssues = node.issues as INodeIssues;
			if (nodeIssues.parameters) {
				for (const [param, paramIssues] of Object.entries(nodeIssues.parameters)) {
					if (Array.isArray(paramIssues)) {
						issues[param] = paramIssues;
					}
				}
			}
			if (nodeIssues.credentials) {
				for (const [cred, credIssues] of Object.entries(nodeIssues.credentials)) {
					if (Array.isArray(credIssues)) {
						issues[`credential:${cred}`] = credIssues;
					}
				}
			}
			if (Object.keys(issues).length === 0) {
				issues = undefined;
			}
		}

		return {
			name: node.name,
			issues,
			incomingConnections,
			outgoingConnections,
		};
	});
}
