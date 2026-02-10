import type { INodeUi } from '@/Interface';
import type { IConnections } from 'n8n-workflow';
import type { SecurityFinding } from '../types';
import {
	isInputTrigger,
	isExternalService,
	isCodeNode,
	getCodeParameters,
} from '../utils/nodeClassification';

/** Dangerous function patterns in Code nodes that indicate code injection risk. */
const DANGEROUS_CODE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
	{ pattern: /\beval\s*\(/, label: 'eval()' },
	{ pattern: /\bnew\s+Function\s*\(/, label: 'new Function()' },
	{ pattern: /\bchild_process\b/, label: 'child_process' },
	{ pattern: /\brequire\s*\(\s*['"]fs['"]/, label: "require('fs')" },
	{ pattern: /\bexecSync\s*\(|\bexec\s*\(/, label: 'exec()' },
	{ pattern: /\bspawnSync\s*\(|\bspawn\s*\(/, label: 'spawn()' },
];

/** Number of external services from a single trigger that triggers a fan-out warning. */
const FAN_OUT_THRESHOLD = 5;

/**
 * Builds a set of all node names downstream from the given source nodes,
 * by traversing the connections graph.
 */
function getDownstreamNodes(sourceNames: Set<string>, connections: IConnections): Set<string> {
	const visited = new Set<string>();
	const queue = [...sourceNames];

	while (queue.length > 0) {
		const current = queue.pop()!;
		if (visited.has(current)) continue;
		visited.add(current);

		const nodeConnections = connections[current];
		if (!nodeConnections) continue;

		for (const connectionType of Object.values(nodeConnections)) {
			for (const outputConnections of connectionType) {
				if (!outputConnections) continue;
				for (const connection of outputConnections) {
					if (!visited.has(connection.node)) {
						queue.push(connection.node);
					}
				}
			}
		}
	}

	return visited;
}

/**
 * Detects data exposure risks: webhook data flowing to external services,
 * and Code nodes using console.log.
 */
export function checkDataExposure(nodes: INodeUi[], connections: IConnections): SecurityFinding[] {
	const findings: SecurityFinding[] = [];
	let counter = 0;

	const nodesByName = new Map(nodes.map((n) => [n.name, n]));

	// Find input trigger nodes
	const triggerNames = new Set(nodes.filter((n) => isInputTrigger(n)).map((n) => n.name));

	if (triggerNames.size > 0) {
		// Find which nodes are downstream from triggers
		const downstream = getDownstreamNodes(triggerNames, connections);

		// Check if any external service node receives trigger data
		for (const nodeName of downstream) {
			const node = nodesByName.get(nodeName);
			if (!node) continue;

			if (isExternalService(node) && !triggerNames.has(node.name)) {
				const triggerList = [...triggerNames].join(', ');
				findings.push({
					id: `exposure-${++counter}`,
					category: 'data-exposure',
					severity: 'info',
					title: `External input flows to ${node.type.replace('n8n-nodes-base.', '')}`,
					description: `Data from ${triggerList} reaches this node. Ensure sensitive input data is filtered before sending externally.`,
					nodeName: node.name,
					nodeId: node.id,
				});
			}
		}
	}

	// Check Code nodes for console.log and dangerous functions
	for (const node of nodes) {
		if (isCodeNode(node) && node.parameters) {
			const codeParamNames = getCodeParameters(node);
			for (const paramName of codeParamNames) {
				const code = String((node.parameters as Record<string, unknown>)[paramName] ?? '');
				if (!code) continue;

				if (code.includes('console.log')) {
					findings.push({
						id: `exposure-${++counter}`,
						category: 'data-exposure',
						severity: 'info',
						title: 'console.log in Code node',
						description:
							'console.log may expose sensitive data in server logs. Remove logging before production use.',
						nodeName: node.name,
						nodeId: node.id,
						parameterPath: paramName,
					});
				}

				// Code injection: detect dangerous functions
				for (const { pattern, label } of DANGEROUS_CODE_PATTERNS) {
					if (pattern.test(code)) {
						findings.push({
							id: `exposure-${++counter}`,
							category: 'data-exposure',
							severity: 'warning',
							title: `Dangerous "${label}" usage in Code node "${node.name}"`,
							description: `The Code node uses "${label}" which can execute arbitrary code or access the server. This is a code injection risk if the node processes user-controlled input.`,
							nodeName: node.name,
							nodeId: node.id,
							parameterPath: paramName,
						});
					}
				}
			}
		}
	}

	// Fan-out blast radius: flag triggers that reach many external services
	if (triggerNames.size > 0) {
		for (const triggerName of triggerNames) {
			const triggerDownstream = getDownstreamNodes(new Set([triggerName]), connections);
			let externalCount = 0;
			for (const nodeName of triggerDownstream) {
				if (nodeName === triggerName) continue;
				const node = nodesByName.get(nodeName);
				if (node && isExternalService(node)) externalCount++;
			}
			if (externalCount >= FAN_OUT_THRESHOLD) {
				findings.push({
					id: `exposure-${++counter}`,
					category: 'data-exposure',
					severity: 'warning',
					title: `High fan-out: "${triggerName}" reaches ${externalCount} external services`,
					description: `A single trigger fans out to ${externalCount} external services. A compromised input could affect all of them. Consider reducing the blast radius.`,
					nodeName: triggerName,
					nodeId: nodesByName.get(triggerName)?.id ?? triggerName,
				});
			}
		}
	}

	return findings;
}
