/**
 * Code generator for creating TypeScript SDK code from workflow JSON.
 */
import type { WorkflowJSON, NodeJSON, IConnection } from './types/base';

// AI connection types and their corresponding subnode factory functions
const AI_CONNECTION_TYPES = new Map<string, { factory: string; configKey: string }>([
	['ai_languageModel', { factory: 'languageModel', configKey: 'model' }],
	['ai_memory', { factory: 'memory', configKey: 'memory' }],
	['ai_tool', { factory: 'tool', configKey: 'tools' }],
	['ai_outputParser', { factory: 'outputParser', configKey: 'outputParser' }],
	['ai_embedding', { factory: 'embedding', configKey: 'embedding' }],
	['ai_vectorStore', { factory: 'vectorStore', configKey: 'vectorStore' }],
	['ai_retriever', { factory: 'retriever', configKey: 'retriever' }],
	['ai_document', { factory: 'documentLoader', configKey: 'documentLoader' }],
	['ai_textSplitter', { factory: 'textSplitter', configKey: 'textSplitter' }],
]);

/**
 * Escapes a string for use in a single-quoted TypeScript string literal.
 * Returns empty string if input is null/undefined.
 */
function escapeString(str: string | null | undefined): string {
	if (str == null) return '';
	return str
		.replace(/\\/g, '\\\\')
		.replace(/'/g, "\\'")
		.replace(/\n/g, '\\n')
		.replace(/\r/g, '\\r');
}

/**
 * Generate the default node name from a type string.
 * This must match the logic in node-builder.ts generateNodeName().
 */
function generateDefaultNodeName(type: string): string {
	// Extract the node name after the package prefix
	const parts = type.split('.');
	const nodeName = parts[parts.length - 1];

	// Convert camelCase/PascalCase to Title Case with spaces
	return nodeName
		.replace(/([a-z])([A-Z])/g, '$1 $2') // Insert space before capitals
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') // Handle consecutive capitals
		.replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
		.replace(/Http/g, 'HTTP') // Fix common acronyms
		.replace(/Api/g, 'API')
		.replace(/Url/g, 'URL')
		.replace(/Id/g, 'ID')
		.replace(/Json/g, 'JSON')
		.replace(/Xml/g, 'XML')
		.replace(/Sql/g, 'SQL')
		.replace(/Ai/g, 'AI')
		.replace(/Aws/g, 'AWS')
		.replace(/Gcp/g, 'GCP')
		.replace(/Ssh/g, 'SSH')
		.replace(/Ftp/g, 'FTP')
		.replace(/Csv/g, 'CSV');
}

/**
 * Formats a value as TypeScript code.
 */
function formatValue(value: unknown, indent: number = 0): string {
	const spaces = '  '.repeat(indent);
	const nextSpaces = '  '.repeat(indent + 1);

	if (value === null) return 'null';
	if (value === undefined) return 'undefined';
	if (typeof value === 'string') return `'${escapeString(value)}'`;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);

	if (Array.isArray(value)) {
		if (value.length === 0) return '[]';
		const items = value.map((v) => formatValue(v, indent + 1));
		if (items.join(', ').length < 60 && !items.some((i) => i.includes('\n'))) {
			return `[${items.join(', ')}]`;
		}
		return `[\n${nextSpaces}${items.join(`,\n${nextSpaces}`)}\n${spaces}]`;
	}

	if (typeof value === 'object') {
		const entries = Object.entries(value);
		if (entries.length === 0) return '{}';

		const formatted = entries.map(([k, v]) => {
			const key = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : `'${escapeString(k)}'`;
			return `${key}: ${formatValue(v, indent + 1)}`;
		});

		if (formatted.join(', ').length < 60 && !formatted.some((f) => f.includes('\n'))) {
			return `{ ${formatted.join(', ')} }`;
		}
		return `{\n${nextSpaces}${formatted.join(`,\n${nextSpaces}`)}\n${spaces}}`;
	}

	return String(value);
}

/**
 * Determines if a node is a trigger node.
 */
function isTriggerNode(node: NodeJSON): boolean {
	const type = node.type.toLowerCase();
	// Check for explicit trigger types
	if (type.includes('trigger') || type === 'n8n-nodes-base.start') {
		return true;
	}
	// Webhook is a trigger, but respondToWebhook is an action node
	if (type === 'n8n-nodes-base.webhook') {
		return true;
	}
	return false;
}

/**
 * Determines if a node is a sticky note.
 */
function isStickyNote(node: NodeJSON): boolean {
	return node.type === 'n8n-nodes-base.stickyNote';
}

interface SubnodeConnection {
	/** The subnode (source of AI connection) */
	subnodeName: string;
	/** The AI connection type (e.g., 'ai_languageModel') */
	connectionType: string;
}

interface NodeInfo {
	node: NodeJSON;
	varName: string;
	incomingConnections: { from: string; outputIndex: number; inputIndex: number }[];
	outgoingConnections: Map<number, { to: string; inputIndex: number }[]>;
	/** Subnodes connected to this node via AI connections */
	subnodes: SubnodeConnection[];
	/** If this node is a subnode, the parent node name */
	isSubnodeOf?: string;
	/** If this node is a subnode, the AI connection type */
	subnodeConnectionType?: string;
	/** If this node is part of a composite pattern (merge source, if branch, switch case) */
	isPartOfComposite?: boolean;
}

/**
 * Determines if a node is a Merge node.
 */
function isMergeNode(node: NodeJSON): boolean {
	return node.type === 'n8n-nodes-base.merge';
}

/**
 * Determines if a node is an IF node.
 */
function isIfNode(node: NodeJSON): boolean {
	return node.type === 'n8n-nodes-base.if';
}

/**
 * Determines if a node is a Switch node.
 */
function isSwitchNode(node: NodeJSON): boolean {
	return node.type === 'n8n-nodes-base.switch';
}

/**
 * Determines if a node is a SplitInBatches node.
 * SplitInBatches has 2 outputs: done (0) and loop (1).
 */
function isSplitInBatchesNode(node: NodeJSON): boolean {
	return node.type === 'n8n-nodes-base.splitInBatches';
}

/**
 * Determines if a node has error output enabled (onError: 'continueErrorOutput')
 */
function hasErrorOutput(node: NodeJSON): boolean {
	return node.onError === 'continueErrorOutput';
}

/**
 * Calculate the error output index for a node.
 * Error outputs are always the last output after regular outputs.
 */
function getErrorOutputIndex(node: NodeJSON): number {
	if (isIfNode(node)) {
		return 2; // IF: true=0, false=1, error=2
	}
	if (isSwitchNode(node)) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const params = node.parameters as Record<string, any> | undefined;
		const numberOutputs = params?.numberOutputs ?? params?.rules?.rules?.length ?? 4;
		return numberOutputs;
	}
	return 1; // Regular nodes: main=0, error=1
}

interface MergePattern {
	mergeNode: string;
	sources: { nodeName: string; inputIndex: number }[];
}

/**
 * Tracks nodes that should be generated as variables for branch convergence.
 */
interface ConvergenceContext {
	/** Set of node names that are convergence points */
	convergenceNodes: Set<string>;
	/** Map from node name to its variable name for convergence nodes */
	convergenceVars: Map<string, string>;
}

/**
 * Information about cycles detected in the workflow graph.
 */
interface CycleInfo {
	/** Nodes that are targets of backward edges (cycle entry points) */
	cycleTargetNodes: Set<string>;
	/** Map of source node name -> array of cycle target node names */
	cycleEdges: Map<string, string[]>;
}

/**
 * Detect cycles in the workflow graph using DFS.
 * Returns information about which nodes are cycle targets and which edges are backward edges.
 */
function detectCycles(nodeInfoMap: Map<string, NodeInfo>): CycleInfo {
	const cycleTargetNodes = new Set<string>();
	const cycleEdges = new Map<string, string[]>();
	const visiting = new Set<string>();
	const visited = new Set<string>();

	function dfs(nodeName: string, ancestors: Set<string>): void {
		if (visited.has(nodeName)) return;
		if (visiting.has(nodeName)) return;

		visiting.add(nodeName);
		const newAncestors = new Set(ancestors);
		newAncestors.add(nodeName);

		const nodeInfo = nodeInfoMap.get(nodeName);
		if (!nodeInfo) {
			visiting.delete(nodeName);
			visited.add(nodeName);
			return;
		}

		// Skip subnodes - they use AI connections, not main connections
		if (nodeInfo.isSubnodeOf) {
			visiting.delete(nodeName);
			visited.add(nodeName);
			return;
		}

		for (const [, targets] of nodeInfo.outgoingConnections) {
			for (const target of targets) {
				if (newAncestors.has(target.to)) {
					// Found cycle edge: nodeName -> target.to
					cycleTargetNodes.add(target.to);
					const edges = cycleEdges.get(nodeName) ?? [];
					edges.push(target.to);
					cycleEdges.set(nodeName, edges);
				} else {
					dfs(target.to, newAncestors);
				}
			}
		}

		visiting.delete(nodeName);
		visited.add(nodeName);
	}

	// Start DFS from all root nodes (triggers and orphans)
	for (const [name, info] of nodeInfoMap) {
		if (info.incomingConnections.length === 0 && !info.isSubnodeOf) {
			dfs(name, new Set());
		}
	}

	return { cycleTargetNodes, cycleEdges };
}

/**
 * Generates TypeScript SDK code from a workflow JSON.
 */
export function generateWorkflowCode(json: WorkflowJSON): string {
	const lines: string[] = [];

	// Build node info map
	const nodeInfoMap = new Map<string, NodeInfo>();
	const nodesByName = new Map<string, NodeJSON>();
	let unnamedCounter = 0;

	for (const nodeJson of json.nodes) {
		// Use node name, falling back to id or generated name for nodes without names
		const nodeName = nodeJson.name ?? nodeJson.id ?? `__unnamed_${unnamedCounter++}`;
		nodesByName.set(nodeName, nodeJson);
		nodeInfoMap.set(nodeName, {
			node: { ...nodeJson, name: nodeName }, // Ensure name is set
			varName: generateVarName(nodeName),
			incomingConnections: [],
			outgoingConnections: new Map(),
			subnodes: [],
		});
	}

	// Parse connections (both main and AI connections)
	for (const [sourceName, connectionTypes] of Object.entries(json.connections)) {
		const sourceInfo = nodeInfoMap.get(sourceName);
		if (!sourceInfo) continue;

		for (const [connType, outputs] of Object.entries(connectionTypes)) {
			if (!Array.isArray(outputs)) continue;

			// Check if this is an AI connection type
			const isAiConnection = AI_CONNECTION_TYPES.has(connType);

			outputs.forEach((targets: IConnection[] | null, outputIndex: number) => {
				if (!Array.isArray(targets)) return;

				for (const target of targets) {
					const targetInfo = nodeInfoMap.get(target.node);
					if (!targetInfo) continue;

					if (isAiConnection) {
						// This is an AI connection - mark source as subnode of target
						sourceInfo.isSubnodeOf = target.node;
						sourceInfo.subnodeConnectionType = connType;

						// Add to target's subnodes list
						targetInfo.subnodes.push({
							subnodeName: sourceName,
							connectionType: connType,
						});
					} else {
						// Regular 'main' connection
						const targetList = sourceInfo.outgoingConnections.get(outputIndex) ?? [];
						targetList.push({ to: target.node, inputIndex: target.index ?? 0 });
						sourceInfo.outgoingConnections.set(outputIndex, targetList);

						targetInfo.incomingConnections.push({
							from: sourceName,
							outputIndex,
							inputIndex: target.index ?? 0,
						});
					}
				}
			});
		}
	}

	// Detect cycles in the workflow graph
	const cycleInfo = detectCycles(nodeInfoMap);

	// Generate variable declarations for cycle target nodes
	const cycleNodeVars = new Map<string, string>();
	const cycleVarLines: string[] = [];

	for (const nodeName of cycleInfo.cycleTargetNodes) {
		const nodeInfo = nodeInfoMap.get(nodeName);
		if (!nodeInfo || nodeInfo.isSubnodeOf || isStickyNote(nodeInfo.node)) continue;

		const varName = generateVarName(nodeName);
		cycleNodeVars.set(nodeName, varName);

		// Generate the node call (without chain - chain handled in main flow)
		const nodeCall = generateNodeCall(nodeInfo.node, nodeInfoMap);
		cycleVarLines.push(`const ${varName} = ${nodeCall};`);
	}

	// Find root nodes (triggers or nodes with no incoming connections)
	// Subnodes are NOT considered orphans - they're connected via AI connections
	const triggers: NodeInfo[] = [];
	const stickyNotes: NodeInfo[] = [];
	const orphanNodes: NodeInfo[] = [];

	// First pass: identify triggers
	for (const info of nodeInfoMap.values()) {
		if (isTriggerNode(info.node)) {
			triggers.push(info);
		}
	}

	// Detect nodes that are targets of multiple triggers (shared entry points)
	// These need variable declarations so subsequent triggers can reference them
	const sharedNodeVars = new Map<string, string>();
	const sharedVarLines: string[] = [];

	// Count how many triggers connect to each node
	const triggerTargetCount = new Map<string, number>();
	for (const triggerInfo of triggers) {
		const outputs = triggerInfo.outgoingConnections.get(0);
		if (outputs) {
			for (const target of outputs) {
				const count = triggerTargetCount.get(target.to) ?? 0;
				triggerTargetCount.set(target.to, count + 1);
			}
		}
	}

	// Create variables for nodes targeted by multiple triggers
	for (const [nodeName, count] of triggerTargetCount.entries()) {
		if (count > 1) {
			const nodeInfo = nodeInfoMap.get(nodeName);
			if (!nodeInfo || nodeInfo.isSubnodeOf || isStickyNote(nodeInfo.node)) continue;

			const varName = generateVarName(nodeName);
			sharedNodeVars.set(nodeName, varName);
			cycleNodeVars.set(nodeName, varName); // Add to cycleNodeVars so generateChain can use it

			// Generate just the node call (without chain - chain handled in main flow from first trigger)
			const nodeCall = generateNodeCall(nodeInfo.node, nodeInfoMap);
			sharedVarLines.push(`const ${varName} = ${nodeCall};`);
		}
	}

	// Add shared node variable declarations before cycle variables (or as separate section)
	if (sharedVarLines.length > 0) {
		lines.push('// Shared entry point nodes (targeted by multiple triggers)');
		lines.push(...sharedVarLines);
		lines.push('');
	}

	for (const info of nodeInfoMap.values()) {
		if (isStickyNote(info.node)) {
			stickyNotes.push(info);
		} else if (info.isSubnodeOf) {
			// Skip subnodes - they will be included in their parent's config
			continue;
		} else if (isTriggerNode(info.node)) {
			// Triggers already collected in first pass above
			continue;
		} else if (info.incomingConnections.length === 0) {
			orphanNodes.push(info);
		}
	}

	// Add cycle variable declarations at the top of generated code
	if (cycleVarLines.length > 0) {
		lines.push('// Cycle target nodes (referenced by backward edges)');
		lines.push(...cycleVarLines);
		lines.push('');
	}

	// Generate settings string
	let settingsStr = '';
	if (json.settings && Object.keys(json.settings).length > 0) {
		settingsStr = `, ${formatValue(json.settings, 1)}`;
	}

	// Generate workflow declaration
	lines.push(
		`return workflow('${escapeString(json.id)}', '${escapeString(json.name)}'${settingsStr})`,
	);

	// Track which nodes have been added
	const addedNodes = new Set<string>();

	// Generate node chains starting from each trigger
	for (const triggerInfo of triggers) {
		lines.push(`  .add(${generateNodeCall(triggerInfo.node, nodeInfoMap)})`);
		addedNodes.add(triggerInfo.node.name);
		generateChain(triggerInfo, nodeInfoMap, addedNodes, lines, 1, cycleNodeVars);
	}

	// Add orphan nodes (nodes not connected to any trigger)
	for (const orphanInfo of orphanNodes) {
		if (addedNodes.has(orphanInfo.node.name)) continue;

		// Check if orphan is an IF node with branches - use ifBranch() composite
		if (isIfNode(orphanInfo.node)) {
			const ifResult = generateIfBranchCall(
				orphanInfo,
				nodeInfoMap,
				addedNodes,
				undefined,
				undefined,
				cycleNodeVars,
			);
			if (ifResult) {
				lines.push(`  .add(${ifResult.call})`);
				addedNodes.add(orphanInfo.node.name);
				// Generate downstream chains for each branch
				for (const branchName of ifResult.branchNames) {
					const branchInfo = nodeInfoMap.get(branchName);
					if (branchInfo) {
						generateChain(branchInfo, nodeInfoMap, addedNodes, lines, 1, cycleNodeVars);
					}
				}
				continue;
			}
		}

		// Check if orphan is a Switch node with cases - use switchCase() composite
		if (isSwitchNode(orphanInfo.node)) {
			const switchResult = generateSwitchCaseCall(
				orphanInfo,
				nodeInfoMap,
				addedNodes,
				undefined,
				cycleNodeVars,
			);
			if (switchResult) {
				lines.push(`  .add(${switchResult.call})`);
				addedNodes.add(orphanInfo.node.name);
				// Generate downstream chains for each case (convergence downstream is already included)
				for (const caseName of switchResult.caseNames) {
					const caseInfo = nodeInfoMap.get(caseName);
					if (caseInfo) {
						generateChain(caseInfo, nodeInfoMap, addedNodes, lines, 1, cycleNodeVars);
					}
				}
				continue;
			}
		}

		lines.push(`  .add(${generateNodeCall(orphanInfo.node, nodeInfoMap)})`);
		addedNodes.add(orphanInfo.node.name);
		generateChain(orphanInfo, nodeInfoMap, addedNodes, lines, 1, cycleNodeVars);
	}

	// Add any remaining nodes that weren't reached
	// Skip subnodes - they're emitted as part of their parent's config
	for (const info of nodeInfoMap.values()) {
		if (addedNodes.has(info.node.name) || isStickyNote(info.node) || info.isSubnodeOf) continue;
		lines.push(`  // Disconnected: ${info.node.name}`);
		lines.push(`  .add(${generateNodeCall(info.node, nodeInfoMap)})`);
		addedNodes.add(info.node.name);
	}

	// Add sticky notes
	for (const stickyInfo of stickyNotes) {
		lines.push(`  .add(${generateStickyCall(stickyInfo.node)})`);
	}

	return lines.join('\n');
}

/**
 * JavaScript reserved keywords and SDK function names that cannot be used as variable names.
 */
const RESERVED_KEYWORDS = new Set([
	// JavaScript reserved keywords
	'break',
	'case',
	'catch',
	'class',
	'const',
	'continue',
	'debugger',
	'default',
	'delete',
	'do',
	'else',
	'enum',
	'export',
	'extends',
	'false',
	'finally',
	'for',
	'function',
	'if',
	'import',
	'in',
	'instanceof',
	'let',
	'new',
	'null',
	'return',
	'static',
	'super',
	'switch',
	'this',
	'throw',
	'true',
	'try',
	'typeof',
	'undefined',
	'var',
	'void',
	'while',
	'with',
	'yield',
	// Future reserved keywords
	'await',
	'implements',
	'interface',
	'package',
	'private',
	'protected',
	'public',
	// SDK function names that would shadow the API
	'workflow',
	'trigger',
	'node',
	'merge',
	'ifbranch',
	'switchcase',
	'sticky',
	'splitinbatches',
	'languagemodel',
	'tool',
	'memory',
	'outputparser',
	'embedding',
	'vectorstore',
	'retriever',
	'documentloader',
	'textsplitter',
	'placeholder',
	'newcredential',
]);

/**
 * Generates a variable name from a node name.
 * Appends '_node' suffix if the name is a JavaScript reserved keyword.
 */
function generateVarName(nodeName: string | null | undefined): string {
	const name = nodeName ?? 'unnamed';
	let varName = name
		.replace(/[^a-zA-Z0-9]/g, '_') // Replace special chars with underscores
		.replace(/_+/g, '_') // Collapse multiple underscores
		.replace(/_$/g, '') // Remove trailing underscores only
		.toLowerCase();

	// Ensure variable name doesn't start with a digit (invalid in JavaScript)
	if (/^\d/.test(varName)) {
		varName = 'n_' + varName;
	}

	// Remove leading underscore only if name doesn't start with digit
	varName = varName.replace(/^_(?!\d)/, '');

	// Avoid JavaScript reserved keywords
	if (RESERVED_KEYWORDS.has(varName)) {
		varName = varName + '_node';
	}

	return varName;
}

/**
 * Check if targetNode is reachable from startNode by following the chain.
 */
function isNodeReachableFrom(
	startNodeName: string,
	targetNodeName: string,
	nodeInfoMap: Map<string, NodeInfo>,
	addedNodes: Set<string>,
): boolean {
	const visited = new Set<string>();
	const stack = [startNodeName];

	while (stack.length > 0) {
		const current = stack.pop()!;
		if (current === targetNodeName) return true;
		if (visited.has(current)) continue;
		visited.add(current);

		const currentInfo = nodeInfoMap.get(current);
		if (!currentInfo || currentInfo.isSubnodeOf) continue;

		for (const [, targets] of currentInfo.outgoingConnections) {
			for (const target of targets) {
				if (!visited.has(target.to) && !addedNodes.has(target.to)) {
					stack.push(target.to);
				}
			}
		}
	}
	return false;
}

/**
 * Generate a node call with chain, but use shared variable references for certain nodes.
 * Handles IF/Switch nodes' multi-output structure properly.
 */
function generateNodeCallWithChainUsingSharedVars(
	startInfo: NodeInfo,
	nodeInfoMap: Map<string, NodeInfo>,
	addedNodes: Set<string>,
	sharedVars: Map<string, string>,
	cycleNodeVars?: Map<string, string>,
): string {
	// Handle IF node specially - check if any branch connects to shared var
	if (isIfNode(startInfo.node)) {
		const outputs = startInfo.outgoingConnections;
		const trueTargets = outputs.get(0) ?? [];
		const falseTargets = outputs.get(1) ?? [];

		// Check if either branch connects to a shared variable
		const trueToShared = trueTargets.length > 0 && sharedVars.has(trueTargets[0].to);
		const falseToShared = falseTargets.length > 0 && sharedVars.has(falseTargets[0].to);

		if (trueToShared || falseToShared) {
			// Generate ifBranch with appropriate branches
			const trueCall = trueToShared ? sharedVars.get(trueTargets[0].to)! : 'null';
			const falseCall = falseToShared ? sharedVars.get(falseTargets[0].to)! : 'null';

			const configParts: string[] = [];
			if (startInfo.node.typeVersion != null) {
				configParts.push(`version: ${startInfo.node.typeVersion}`);
			}
			if (startInfo.node.parameters && Object.keys(startInfo.node.parameters).length > 0) {
				configParts.push(`parameters: ${formatValue(startInfo.node.parameters, 2)}`);
			}
			if (startInfo.node.name !== 'IF') {
				configParts.push(`name: '${escapeString(startInfo.node.name)}'`);
			}
			const configStr = configParts.length > 0 ? `, { ${configParts.join(', ')} }` : '';
			return `ifBranch([${trueCall}, ${falseCall}]${configStr})`;
		}
	}

	// Handle Switch node specially
	if (isSwitchNode(startInfo.node)) {
		const outputs = Array.from(startInfo.outgoingConnections.entries()).sort(([a], [b]) => a - b);
		const hasSharedTarget = outputs.some(
			([, targets]) => targets.length > 0 && sharedVars.has(targets[0].to),
		);

		if (hasSharedTarget) {
			const caseCalls: string[] = [];
			for (const [, targets] of outputs) {
				if (targets.length === 0) {
					caseCalls.push('null');
				} else if (sharedVars.has(targets[0].to)) {
					caseCalls.push(sharedVars.get(targets[0].to)!);
				} else {
					caseCalls.push('null');
				}
			}

			const configParts: string[] = [];
			if (startInfo.node.typeVersion != null) {
				configParts.push(`version: ${startInfo.node.typeVersion}`);
			}
			if (startInfo.node.parameters && Object.keys(startInfo.node.parameters).length > 0) {
				configParts.push(`parameters: ${formatValue(startInfo.node.parameters, 2)}`);
			}
			if (startInfo.node.name !== 'Switch') {
				configParts.push(`name: '${escapeString(startInfo.node.name)}'`);
			}
			const configStr = configParts.length > 0 ? `, { ${configParts.join(', ')} }` : '';
			return `switchCase([${caseCalls.join(', ')}]${configStr})`;
		}
	}

	let call = generateNodeCall(startInfo.node, nodeInfoMap);
	let currentInfo: NodeInfo | undefined = startInfo;

	while (currentInfo) {
		const outputs = Array.from(currentInfo.outgoingConnections.entries());
		if (outputs.length !== 1) break;

		const [, outputTargets] = outputs[0];
		if (outputTargets.length !== 1) break;

		const target = outputTargets[0];
		const targetInfo = nodeInfoMap.get(target.to);
		if (!targetInfo || targetInfo.isSubnodeOf) break;

		// If target is a shared variable, reference it and stop
		if (sharedVars.has(target.to)) {
			call += `.then(${sharedVars.get(target.to)})`;
			break;
		}

		// If target is already added, check for cycle variable
		if (addedNodes.has(target.to)) {
			if (cycleNodeVars?.has(target.to)) {
				call += `.then(${cycleNodeVars.get(target.to)})`;
			}
			break;
		}

		addedNodes.add(target.to);
		call += `.then(${generateNodeCall(targetInfo.node, nodeInfoMap)})`;
		currentInfo = targetInfo;
	}

	return call;
}

/**
 * Generates the chain of nodes following from a starting node.
 */
function generateChain(
	startInfo: NodeInfo,
	nodeInfoMap: Map<string, NodeInfo>,
	addedNodes: Set<string>,
	lines: string[],
	depth: number,
	cycleNodeVars?: Map<string, string>,
): void {
	const outputs = Array.from(startInfo.outgoingConnections.entries()).sort((a, b) => a[0] - b[0]);

	if (outputs.length === 0) return;

	// Single output - check for fan-out (multiple targets on same output)
	if (outputs.length === 1) {
		const [_outputIndex, targets] = outputs[0];

		// Single target - simple .then() chain
		if (targets.length === 1) {
			const target = targets[0];
			const targetInfo = nodeInfoMap.get(target.to);

			// Handle cycle connection: if target is already added but is a cycle target, emit the connection
			if (targetInfo && addedNodes.has(target.to) && cycleNodeVars?.has(target.to)) {
				const varName = cycleNodeVars.get(target.to)!;
				lines.push(`  .then(${varName})`);
				// Don't recurse - target is already fully generated
				return;
			}

			// Skip subnodes - they're included in parent config
			if (targetInfo && !addedNodes.has(target.to) && !targetInfo.isSubnodeOf) {
				// Check if target is a Merge node - use merge() composite
				if (isMergeNode(targetInfo.node)) {
					const mergeCall = generateMergeCall(targetInfo, nodeInfoMap, addedNodes);
					if (mergeCall) {
						lines.push(`  .then(${mergeCall})`);
						addedNodes.add(target.to);
						generateChain(targetInfo, nodeInfoMap, addedNodes, lines, depth, cycleNodeVars);
						return;
					}
				}

				// Check if target is an IF node with both branches - use ifBranch() composite
				// BUT if the IF node is a cycle target, use variable reference instead
				if (isIfNode(targetInfo.node) && !cycleNodeVars?.has(target.to)) {
					const ifResult = generateIfBranchCall(
						targetInfo,
						nodeInfoMap,
						addedNodes,
						undefined,
						undefined,
						cycleNodeVars,
					);
					if (ifResult) {
						lines.push(`  .then(${ifResult.call})`);
						addedNodes.add(target.to);
						// Generate downstream chains for each branch
						for (const branchName of ifResult.branchNames) {
							const branchInfo = nodeInfoMap.get(branchName);
							if (branchInfo) {
								generateChain(branchInfo, nodeInfoMap, addedNodes, lines, depth + 1, cycleNodeVars);
							}
						}
						return;
					}
				}

				// Check if target is a Switch node with outputs - use switchCase() composite
				// BUT if the Switch node is a cycle target, use variable reference instead
				if (isSwitchNode(targetInfo.node) && !cycleNodeVars?.has(target.to)) {
					const switchResult = generateSwitchCaseCall(
						targetInfo,
						nodeInfoMap,
						addedNodes,
						undefined,
						cycleNodeVars,
					);
					if (switchResult) {
						lines.push(`  .then(${switchResult.call})`);
						addedNodes.add(target.to);
						// Generate downstream chains for each case (convergence downstream is already included)
						for (const caseName of switchResult.caseNames) {
							const caseInfo = nodeInfoMap.get(caseName);
							if (caseInfo) {
								generateChain(caseInfo, nodeInfoMap, addedNodes, lines, depth + 1, cycleNodeVars);
							}
						}
						return;
					}
				}

				// Check if target is a cycle target node - use variable reference
				if (cycleNodeVars?.has(target.to)) {
					const varName = cycleNodeVars.get(target.to)!;
					addedNodes.add(target.to);

					// For IF/Switch/SplitInBatches cycle targets, first connect to the node, then generate branches
					if (
						isIfNode(targetInfo.node) ||
						isSwitchNode(targetInfo.node) ||
						isSplitInBatchesNode(targetInfo.node)
					) {
						const outputs = Array.from(targetInfo.outgoingConnections.entries()).sort(
							([a], [b]) => a - b,
						);
						if (outputs.length > 0) {
							// First connect to the IF/Switch/SplitInBatches node
							lines.push(`  .then(${varName})`);
							// Then generate branches as array
							const branchCalls: string[] = [];
							for (const [_outputIndex, branchTargets] of outputs) {
								if (branchTargets.length === 0) {
									branchCalls.push('null');
								} else {
									const branchTarget = branchTargets[0];
									const branchInfo = nodeInfoMap.get(branchTarget.to);
									if (!branchInfo || branchInfo.isSubnodeOf) {
										branchCalls.push('null');
									} else if (addedNodes.has(branchTarget.to)) {
										// Branch target already added - check if it's a cycle target
										if (cycleNodeVars?.has(branchTarget.to)) {
											branchCalls.push(cycleNodeVars.get(branchTarget.to)!);
										} else {
											branchCalls.push('null');
										}
									} else if (branchTarget.to === targetInfo.node.name) {
										// Self-loop (SplitInBatches loop back) - use variable reference
										branchCalls.push(varName);
									} else {
										addedNodes.add(branchTarget.to);
										branchCalls.push(
											generateNodeCallWithChain(
												branchInfo,
												nodeInfoMap,
												addedNodes,
												undefined,
												new Set([targetInfo.node.name]),
												cycleNodeVars,
											),
										);
									}
								}
							}
							lines.push(`  .then([${branchCalls.join(', ')}])`);
						} else {
							lines.push(`  .then(${varName})`);
						}
					} else {
						lines.push(`  .then(${varName})`);
						generateChain(targetInfo, nodeInfoMap, addedNodes, lines, depth, cycleNodeVars);
					}
					return;
				}

				lines.push(`  .then(${generateNodeCall(targetInfo.node, nodeInfoMap)})`);
				addedNodes.add(target.to);
				generateChain(targetInfo, nodeInfoMap, addedNodes, lines, depth, cycleNodeVars);
			}
			return;
		}

		// Multiple targets on same output - fan-out pattern
		if (targets.length > 1) {
			// First check if this is a direct merge pattern (all targets feed directly into same merge)
			const mergePattern = detectMergePattern(targets, nodeInfoMap, addedNodes);
			if (mergePattern) {
				// Generate merge() call for all branches
				const branchCalls = mergePattern.sources.map((s) => {
					const info = nodeInfoMap.get(s.nodeName);
					return info ? generateNodeCall(info.node, nodeInfoMap) : '';
				});

				const mergeInfo = nodeInfoMap.get(mergePattern.mergeNode);
				if (mergeInfo) {
					const configParts: string[] = [];
					if (mergeInfo.node.typeVersion != null) {
						configParts.push(`version: ${mergeInfo.node.typeVersion}`);
					}
					if (mergeInfo.node.parameters && Object.keys(mergeInfo.node.parameters).length > 0) {
						configParts.push(`parameters: ${formatValue(mergeInfo.node.parameters, 2)}`);
					}
					if (mergeInfo.node.name !== 'Merge') {
						configParts.push(`name: '${escapeString(mergeInfo.node.name)}'`);
					}
					const configStr = configParts.length > 0 ? `, { ${configParts.join(', ')} }` : '';

					lines.push(`  .then(merge([${branchCalls.join(', ')}]${configStr}))`);

					for (const source of mergePattern.sources) {
						addedNodes.add(source.nodeName);
					}
					addedNodes.add(mergePattern.mergeNode);

					generateChain(mergeInfo, nodeInfoMap, addedNodes, lines, depth + 1, cycleNodeVars);
					return;
				}
			}

			// Check if all fan-out targets eventually converge at the same merge node (deeper search)
			const convergeMergeName = findFanOutMergeConvergence(targets, nodeInfoMap, addedNodes);
			if (convergeMergeName) {
				const mergeInfo = nodeInfoMap.get(convergeMergeName);
				if (mergeInfo) {
					// Generate chains up to (but not including) the merge for each target
					const branchCalls: string[] = [];
					for (const target of targets) {
						const targetInfo = nodeInfoMap.get(target.to);
						if (!targetInfo || addedNodes.has(target.to) || targetInfo.isSubnodeOf) continue;

						addedNodes.add(target.to);
						// Generate chain stopping before the merge
						const chainCall = generateChainUpToMerge(
							targetInfo,
							nodeInfoMap,
							addedNodes,
							convergeMergeName,
							undefined,
							cycleNodeVars,
						);
						branchCalls.push(chainCall);
					}

					// Generate the merge call with inline branches
					addedNodes.add(convergeMergeName);
					const configParts: string[] = [];
					if (mergeInfo.node.typeVersion != null) {
						configParts.push(`version: ${mergeInfo.node.typeVersion}`);
					}
					if (mergeInfo.node.parameters && Object.keys(mergeInfo.node.parameters).length > 0) {
						configParts.push(`parameters: ${formatValue(mergeInfo.node.parameters, 2)}`);
					}
					if (mergeInfo.node.name !== 'Merge') {
						configParts.push(`name: '${escapeString(mergeInfo.node.name)}'`);
					}
					const configStr = configParts.length > 0 ? `, { ${configParts.join(', ')} }` : '';

					lines.push(`  .then(merge([${branchCalls.join(', ')}]${configStr}))`);

					generateChain(mergeInfo, nodeInfoMap, addedNodes, lines, depth + 1, cycleNodeVars);
					return;
				}
			}

			// Not a merge pattern - generate .then([a, b]) for fan-out with inline chains
			// But first check if any target is downstream of another target (shared node pattern)
			// e.g., Settings -> [Send Typing, Merge] where Send Typing -> Merge
			// In this case, Merge should be a variable so both branches can reference it

			// Find targets that are also downstream of other targets
			const sharedTargets = new Map<string, string>(); // nodeName -> varName
			for (const target of targets) {
				const targetInfo = nodeInfoMap.get(target.to);
				if (!targetInfo || addedNodes.has(target.to) || targetInfo.isSubnodeOf) continue;

				// Check if this target is reachable from any other target
				for (const otherTarget of targets) {
					if (otherTarget.to === target.to) continue;
					const otherInfo = nodeInfoMap.get(otherTarget.to);
					if (!otherInfo || addedNodes.has(otherTarget.to) || otherInfo.isSubnodeOf) continue;

					// Check if target.to is reachable from otherTarget.to
					if (isNodeReachableFrom(otherTarget.to, target.to, nodeInfoMap, addedNodes)) {
						// target.to is a shared node - generate it as a variable
						if (!sharedTargets.has(target.to)) {
							sharedTargets.set(target.to, generateVarName(target.to));
							// Also add to cycleNodeVars so other code paths can reference it
							if (cycleNodeVars) {
								cycleNodeVars.set(target.to, generateVarName(target.to));
							}
						}
					}
				}
			}

			// Generate variable declarations for shared targets BEFORE the workflow chain
			// We need to insert these at the beginning of lines array
			if (sharedTargets.size > 0) {
				const varLines: string[] = [];
				for (const [nodeName, varName] of sharedTargets) {
					const nodeInfo = nodeInfoMap.get(nodeName);
					if (!nodeInfo) continue;
					addedNodes.add(nodeName);
					// Generate the shared node as a simple node() call with its downstream chain
					// Don't use generateNodeCallWithChain because it would wrap merge nodes in merge([...])
					let chainCall = generateNodeCall(nodeInfo.node, nodeInfoMap);
					// Follow downstream chain
					let currentInfo: NodeInfo | undefined = nodeInfo;
					while (currentInfo) {
						const nodeOutputs = Array.from(currentInfo.outgoingConnections.entries());
						if (nodeOutputs.length !== 1) break;
						const [, nodeTargets] = nodeOutputs[0];
						if (nodeTargets.length !== 1) break;
						const nextTarget = nodeTargets[0];
						const nextInfo = nodeInfoMap.get(nextTarget.to);
						if (!nextInfo || nextInfo.isSubnodeOf || addedNodes.has(nextTarget.to)) break;
						addedNodes.add(nextTarget.to);
						chainCall += `.then(${generateNodeCall(nextInfo.node, nodeInfoMap)})`;
						currentInfo = nextInfo;
					}
					varLines.push(`const ${varName} = ${chainCall};`);
				}
				// Insert at the beginning (after any existing variable declarations)
				// Find the position of "return workflow(" to insert before it
				const workflowLineIdx = lines.findIndex((l) => l.includes('return workflow('));
				if (workflowLineIdx >= 0) {
					lines.splice(workflowLineIdx, 0, '// Shared fan-out target nodes', ...varLines, '');
				}
			}

			const targetCalls: string[] = [];

			for (const target of targets) {
				const targetInfo = nodeInfoMap.get(target.to);
				if (!targetInfo || targetInfo.isSubnodeOf) continue;

				// If this target is a shared node, just reference the variable
				if (sharedTargets.has(target.to)) {
					targetCalls.push(sharedTargets.get(target.to)!);
					continue;
				}

				// Skip if already added (but not a shared target variable)
				if (addedNodes.has(target.to)) continue;

				addedNodes.add(target.to);
				// Generate full chain for each target
				// Use the shared vars function only if there are shared targets to reference
				if (sharedTargets.size > 0) {
					targetCalls.push(
						generateNodeCallWithChainUsingSharedVars(
							targetInfo,
							nodeInfoMap,
							addedNodes,
							sharedTargets,
							cycleNodeVars,
						),
					);
				} else {
					// No shared targets - use the full generateNodeCallWithChain which has
					// proper handling for Switch/IF/Merge nodes
					targetCalls.push(
						generateNodeCallWithChain(
							targetInfo,
							nodeInfoMap,
							addedNodes,
							undefined,
							undefined,
							cycleNodeVars,
						),
					);
				}
			}

			if (targetCalls.length > 0) {
				if (targetCalls.length === 1) {
					// Only one valid target after filtering
					lines.push(`  .then(${targetCalls[0]})`);
				} else {
					// Multiple targets - use array syntax
					lines.push(`  .then([${targetCalls.join(', ')}])`);
				}
			}
			return;
		}
	}

	// Multiple outputs (branching) - check for special patterns first
	// Check if all targets from a single output feed into the same merge node
	for (const [_outputIndex, targets] of outputs) {
		if (targets.length === 0) continue;

		// Check if all targets feed into the same merge node
		if (targets.length >= 2) {
			const mergePattern = detectMergePattern(targets, nodeInfoMap, addedNodes);
			if (mergePattern) {
				// Generate merge() call for all branches
				const branchCalls = mergePattern.sources.map((s) => {
					const info = nodeInfoMap.get(s.nodeName);
					return info ? generateNodeCall(info.node, nodeInfoMap) : '';
				});

				const mergeInfo = nodeInfoMap.get(mergePattern.mergeNode);
				if (mergeInfo) {
					const configParts: string[] = [];
					// Always include version to preserve original node version
					if (mergeInfo.node.typeVersion != null) {
						configParts.push(`version: ${mergeInfo.node.typeVersion}`);
					}
					if (mergeInfo.node.parameters && Object.keys(mergeInfo.node.parameters).length > 0) {
						configParts.push(`parameters: ${formatValue(mergeInfo.node.parameters, 2)}`);
					}
					if (mergeInfo.node.name !== 'Merge') {
						configParts.push(`name: '${escapeString(mergeInfo.node.name)}'`);
					}
					const configStr = configParts.length > 0 ? `, { ${configParts.join(', ')} }` : '';

					lines.push(`  .then(merge([${branchCalls.join(', ')}]${configStr}))`);

					// Mark all source nodes and merge as added
					for (const source of mergePattern.sources) {
						addedNodes.add(source.nodeName);
					}
					addedNodes.add(mergePattern.mergeNode);

					// Continue chain from merge node
					generateChain(mergeInfo, nodeInfoMap, addedNodes, lines, depth + 1, cycleNodeVars);
				}
				continue; // Don't process these targets individually
			}
		}

		// Multi-output branching - add nodes directly (connections established via node.then())
		for (const target of targets) {
			const targetInfo = nodeInfoMap.get(target.to);
			// Skip subnodes - they're included in parent config
			if (!targetInfo || addedNodes.has(target.to) || targetInfo.isSubnodeOf) continue;

			// For multi-output nodes, just add the node - connections are declared via node.then()
			lines.push(`  .add(${generateNodeCall(targetInfo.node, nodeInfoMap)})`);
			addedNodes.add(target.to);
			generateChain(targetInfo, nodeInfoMap, addedNodes, lines, depth + 1, cycleNodeVars);
		}
	}
}

/**
 * Detect if targets all feed into the same merge node.
 * Returns the merge pattern if found, null otherwise.
 */
function detectMergePattern(
	targets: { to: string; inputIndex: number }[],
	nodeInfoMap: Map<string, NodeInfo>,
	addedNodes: Set<string>,
): MergePattern | null {
	// Check where each target's output goes
	let mergeNode: string | null = null;
	const sources: { nodeName: string; inputIndex: number }[] = [];

	for (const target of targets) {
		const targetInfo = nodeInfoMap.get(target.to);
		if (!targetInfo || addedNodes.has(target.to)) return null;

		// Don't treat IF, Switch, or SplitInBatches as simple merge branches
		// These nodes have semantic multi-output structure that should be preserved
		if (
			isIfNode(targetInfo.node) ||
			isSwitchNode(targetInfo.node) ||
			isSplitInBatchesNode(targetInfo.node)
		) {
			return null;
		}

		// Check if this target has exactly one output that goes to a merge node
		const targetOutputs = Array.from(targetInfo.outgoingConnections.entries());
		if (targetOutputs.length !== 1) return null;

		const [_outIdx, targetTargets] = targetOutputs[0];
		if (targetTargets.length !== 1) return null;

		const nextTarget = targetTargets[0];
		const nextInfo = nodeInfoMap.get(nextTarget.to);
		if (!nextInfo || !isMergeNode(nextInfo.node)) return null;

		// All targets must feed into the same merge node
		if (mergeNode === null) {
			mergeNode = nextTarget.to;
		} else if (mergeNode !== nextTarget.to) {
			return null;
		}

		sources.push({
			nodeName: target.to,
			inputIndex: nextTarget.inputIndex,
		});
	}

	if (!mergeNode || sources.length < 2) return null;

	// Sort sources by input index
	sources.sort((a, b) => a.inputIndex - b.inputIndex);

	return { mergeNode, sources };
}

/**
 * Collect all nodes reachable from a starting node following the chain.
 * Stops at already-added nodes or convergence nodes.
 */
function collectReachableNodes(
	startInfo: NodeInfo,
	nodeInfoMap: Map<string, NodeInfo>,
	addedNodes: Set<string>,
	convergenceNodes: Set<string>,
): Set<string> {
	const reachable = new Set<string>();
	const stack: NodeInfo[] = [startInfo];

	while (stack.length > 0) {
		const current = stack.pop()!;
		const nodeName = current.node.name;

		// Don't recurse into already-added or convergence nodes
		if (addedNodes.has(nodeName) || convergenceNodes.has(nodeName)) continue;
		if (reachable.has(nodeName)) continue;

		reachable.add(nodeName);

		// Follow all outputs
		for (const [_outputIdx, targets] of current.outgoingConnections.entries()) {
			for (const target of targets) {
				const targetInfo = nodeInfoMap.get(target.to);
				if (targetInfo && !targetInfo.isSubnodeOf) {
					stack.push(targetInfo);
				}
			}
		}
	}

	return reachable;
}

/**
 * Find the PRIMARY convergence nodes - nodes that are the first shared point
 * reachable from multiple branches. We don't include downstream nodes of
 * convergence points, as those should be generated naturally as part of the
 * chain from the convergence node.
 */
function findConvergenceNodes(
	branchInfos: (NodeInfo | null)[],
	nodeInfoMap: Map<string, NodeInfo>,
	addedNodes: Set<string>,
): Set<string> {
	// Count how many branches can reach each node
	const nodeReachCount = new Map<string, number>();

	for (const branchInfo of branchInfos) {
		if (!branchInfo) continue;

		const reachable = collectReachableNodes(branchInfo, nodeInfoMap, addedNodes, new Set());
		for (const nodeName of reachable) {
			nodeReachCount.set(nodeName, (nodeReachCount.get(nodeName) ?? 0) + 1);
		}
	}

	// Find all nodes reachable from multiple branches
	const allConvergence = new Set<string>();
	for (const [nodeName, count] of nodeReachCount.entries()) {
		if (count > 1) {
			allConvergence.add(nodeName);
		}
	}

	// Now filter to only include PRIMARY convergence nodes
	// A node is primary if it's a convergence node but none of its ancestors are
	const primaryConvergence = new Set<string>();
	for (const nodeName of allConvergence) {
		const nodeInfo = nodeInfoMap.get(nodeName);
		if (!nodeInfo) continue;

		// Check if any incoming connection is from a convergence node
		let hasConvergenceAncestor = false;
		for (const incoming of nodeInfo.incomingConnections) {
			if (allConvergence.has(incoming.from)) {
				hasConvergenceAncestor = true;
				break;
			}
		}

		if (!hasConvergenceAncestor) {
			primaryConvergence.add(nodeName);
		}
	}

	return primaryConvergence;
}

/**
 * Find if multiple fan-out targets all converge at the same merge node.
 * Returns the merge node name if all targets converge, or null otherwise.
 *
 * NOTE: Returns null if any target IS the merge node directly. In that case,
 * the fan-out pattern should be used instead to preserve the direct connection.
 */
function findFanOutMergeConvergence(
	targets: Array<{ to: string; inputIndex: number }>,
	nodeInfoMap: Map<string, NodeInfo>,
	addedNodes: Set<string>,
): string | null {
	// For each target, trace the chain until we find a merge or dead end
	const mergeNodes = new Set<string>();

	for (const target of targets) {
		const targetInfo = nodeInfoMap.get(target.to);
		if (!targetInfo || addedNodes.has(target.to) || targetInfo.isSubnodeOf) continue;

		// If any target IS a merge node directly, don't use this pattern.
		// The direct-to-merge connection would be lost if we try to use the
		// fan-out-to-merge convergence pattern. Fall back to regular fan-out.
		if (isMergeNode(targetInfo.node)) {
			return null;
		}

		// Don't treat IF, Switch, or SplitInBatches as simple chain nodes
		// These have semantic multi-output structure that must be preserved
		if (
			isIfNode(targetInfo.node) ||
			isSwitchNode(targetInfo.node) ||
			isSplitInBatchesNode(targetInfo.node)
		) {
			return null;
		}

		// Follow the chain from this target
		let currentInfo: NodeInfo | undefined = targetInfo;
		let foundMerge = false;

		while (currentInfo) {
			// Check if current node is a merge
			if (isMergeNode(currentInfo.node)) {
				mergeNodes.add(currentInfo.node.name);
				foundMerge = true;
				break;
			}

			// Don't follow through IF, Switch, or SplitInBatches nodes
			// These have semantic multi-output structure
			if (
				isIfNode(currentInfo.node) ||
				isSwitchNode(currentInfo.node) ||
				isSplitInBatchesNode(currentInfo.node)
			) {
				break;
			}

			// Get the next node in the chain (single output, single target only)
			const outputs = Array.from(currentInfo.outgoingConnections.entries());
			if (outputs.length !== 1) break;

			const [, outputTargets] = outputs[0];
			if (outputTargets.length !== 1) break;

			const nextTarget = outputTargets[0];
			const nextInfo = nodeInfoMap.get(nextTarget.to);
			if (!nextInfo || nextInfo.isSubnodeOf) break;

			currentInfo = nextInfo;
		}

		// If any target doesn't reach a merge, convergence fails
		if (!foundMerge) return null;
	}

	// If all targets converge to the same merge node, return it
	if (mergeNodes.size === 1) {
		return Array.from(mergeNodes)[0];
	}

	return null;
}

/**
 * Generate a chain of nodes from startInfo up to (but not including) the merge node.
 * Used for generating inline merge branches.
 */
function generateChainUpToMerge(
	startInfo: NodeInfo,
	nodeInfoMap: Map<string, NodeInfo>,
	addedNodes: Set<string>,
	mergeNodeName: string,
	convergenceCtx?: ConvergenceContext,
	cycleNodeVars?: Map<string, string>,
): string {
	let call = generateNodeCall(startInfo.node, nodeInfoMap);
	let currentInfo: NodeInfo | undefined = startInfo;

	while (currentInfo) {
		const outputs = Array.from(currentInfo.outgoingConnections.entries());
		if (outputs.length !== 1) break;

		const [, outputTargets] = outputs[0];
		if (outputTargets.length !== 1) break;

		const target = outputTargets[0];
		const targetInfo = nodeInfoMap.get(target.to);
		if (!targetInfo || targetInfo.isSubnodeOf) break;

		// Stop when we reach the merge node
		if (target.to === mergeNodeName) break;

		// Check if already added - but check for cycle connections
		if (addedNodes.has(target.to)) {
			if (cycleNodeVars?.has(target.to)) {
				const varName = cycleNodeVars.get(target.to)!;
				call += `.then(${varName})`;
			}
			break;
		}

		// Check for convergence node
		if (convergenceCtx?.convergenceVars.has(target.to)) {
			const varName = convergenceCtx.convergenceVars.get(target.to)!;
			call += `.then(${varName})`;
			break;
		}

		// Handle composites
		if (isIfNode(targetInfo.node)) {
			const ifResult = generateIfBranchCall(
				targetInfo,
				nodeInfoMap,
				addedNodes,
				undefined,
				undefined,
				cycleNodeVars,
			);
			if (ifResult) {
				addedNodes.add(target.to);
				call += `.then(${ifResult.call})`;
				currentInfo = targetInfo;
				continue;
			}
			break;
		}

		if (isSwitchNode(targetInfo.node)) {
			const switchResult = generateSwitchCaseCall(
				targetInfo,
				nodeInfoMap,
				addedNodes,
				undefined,
				cycleNodeVars,
			);
			if (switchResult) {
				addedNodes.add(target.to);
				call += `.then(${switchResult.call})`;
				currentInfo = targetInfo;
				continue;
			}
			break;
		}

		// Add regular node to chain
		addedNodes.add(target.to);
		call += `.then(${generateNodeCall(targetInfo.node, nodeInfoMap)})`;
		currentInfo = targetInfo;
	}

	return call;
}

/**
 * Generate a merge() call for a Merge node.
 * Returns the merge call string, or null if pattern doesn't match.
 *
 * When the merge node is encountered as part of a chain (i.e., all sources
 * are already added to the workflow), returns a simple node() call instead
 * of the merge([...]) composite, since the connections are already established.
 */
function generateMergeCall(
	mergeInfo: NodeInfo,
	nodeInfoMap: Map<string, NodeInfo>,
	addedNodes: Set<string>,
): string | null {
	// Collect ALL nodes that connect to this merge, sorted by input index
	// Include already-added nodes since they're part of the merge pattern
	const sources: { node: NodeJSON; inputIndex: number; alreadyAdded: boolean }[] = [];

	for (const [sourceName, sourceInfo] of nodeInfoMap.entries()) {
		// Skip subnodes and sticky notes
		if (sourceInfo.isSubnodeOf || isStickyNote(sourceInfo.node)) continue;

		for (const [_outputIdx, targets] of sourceInfo.outgoingConnections.entries()) {
			for (const target of targets) {
				if (target.to === mergeInfo.node.name) {
					sources.push({
						node: sourceInfo.node,
						inputIndex: target.inputIndex,
						alreadyAdded: addedNodes.has(sourceName),
					});
				}
			}
		}
	}

	// Need at least 2 sources for a merge pattern
	if (sources.length < 2) return null;

	// Sort by input index
	sources.sort((a, b) => a.inputIndex - b.inputIndex);

	// If ALL sources are already added, the connections to the merge are
	// already established by the current chain. Just return a simple node()
	// call for the merge instead of the merge([...]) composite.
	const newSources = sources.filter((s) => !s.alreadyAdded);
	if (newSources.length === 0) {
		// All sources already in chain - emit merge as regular node
		return generateNodeCall(mergeInfo.node, nodeInfoMap);
	}

	// Mark source nodes as added (those that weren't already)
	for (const source of sources) {
		addedNodes.add(source.node.name);
	}

	// Generate the merge call with only NEW sources as branches
	// Already-added sources have their connections established by the chain
	const branchCalls = newSources.map((s) => generateNodeCall(s.node, nodeInfoMap));
	const configParts: string[] = [];

	// Always include version to preserve original node version
	if (mergeInfo.node.typeVersion != null) {
		configParts.push(`version: ${mergeInfo.node.typeVersion}`);
	}
	if (mergeInfo.node.parameters && Object.keys(mergeInfo.node.parameters).length > 0) {
		configParts.push(`parameters: ${formatValue(mergeInfo.node.parameters, 2)}`);
	}
	if (mergeInfo.node.name !== 'Merge') {
		configParts.push(`name: '${escapeString(mergeInfo.node.name)}'`);
	}

	const configStr = configParts.length > 0 ? `, { ${configParts.join(', ')} }` : '';
	return `merge([${branchCalls.join(', ')}]${configStr})`;
}

/**
 * Generate a node call WITH its downstream chain using .then() chaining.
 * This is used for branch nodes in ifBranch() and switchCase() to include
 * the entire downstream chain inline.
 *
 * Recursively handles IF, Switch, and Merge nodes to prevent them from
 * becoming disconnected.
 *
 * @param convergenceCtx Optional context with convergence node variables.
 *        When a chain reaches a convergence node, it references the variable
 *        instead of generating the node inline.
 * @param processingStack Set of node names currently being processed in the call stack.
 *        Used for cycle detection to prevent infinite recursion.
 * @param cycleNodeVars Map from node name to variable name for cycle target nodes.
 *        When a chain reaches a cycle target, it references the variable to preserve
 *        the backward connection.
 * @returns The node call string with chained .then() calls for downstream nodes
 */
function generateNodeCallWithChain(
	startInfo: NodeInfo,
	nodeInfoMap: Map<string, NodeInfo>,
	addedNodes: Set<string>,
	convergenceCtx?: ConvergenceContext,
	processingStack?: Set<string>,
	cycleNodeVars?: Map<string, string>,
): string {
	// Cycle detection: if this node is already being processed, skip it
	if (processingStack?.has(startInfo.node.name)) {
		// If this is a known cycle target with a variable, reference it
		if (cycleNodeVars?.has(startInfo.node.name)) {
			return cycleNodeVars.get(startInfo.node.name)!;
		}
		// Otherwise return a comment (shouldn't happen if cycle detection is correct)
		return `/* cycle: ${startInfo.node.name} */`;
	}

	// For IF/Switch nodes that are cycle targets, we can't use ifBranch/switchCase
	// because those create new nodes. Instead, use the variable reference and
	// let the branches be connected via .then([...]) syntax.
	// This is handled below by the cycleNodeVars check at line ~1295.

	// Check if the START node itself is a composite pattern (IF, Switch, Merge)
	// If so, generate the composite call instead of a regular node call
	// BUT skip this if the node is a cycle target (we use variable reference instead)
	if (isIfNode(startInfo.node) && !cycleNodeVars?.has(startInfo.node.name)) {
		const ifResult = generateIfBranchCall(
			startInfo,
			nodeInfoMap,
			addedNodes,
			convergenceCtx,
			processingStack,
			cycleNodeVars,
		);
		if (ifResult) {
			return ifResult.call;
		}
	}

	if (isSwitchNode(startInfo.node) && !cycleNodeVars?.has(startInfo.node.name)) {
		const switchResult = generateSwitchCaseCall(
			startInfo,
			nodeInfoMap,
			addedNodes,
			processingStack,
			cycleNodeVars,
		);
		if (switchResult) {
			return switchResult.call;
		}
	}

	if (isMergeNode(startInfo.node)) {
		const mergeCall = generateMergeCall(startInfo, nodeInfoMap, addedNodes);
		if (mergeCall) {
			return mergeCall;
		}
	}

	// Check if the START node is a convergence node - if so, reference its variable
	if (convergenceCtx?.convergenceVars.has(startInfo.node.name)) {
		const varName = convergenceCtx.convergenceVars.get(startInfo.node.name)!;
		return varName;
	}

	// Check if the START node is a cycle target node - if so, use variable reference
	// and continue with downstream chain generation
	let call: string;
	if (cycleNodeVars?.has(startInfo.node.name)) {
		call = cycleNodeVars.get(startInfo.node.name)!;

		// For IF/Switch cycle targets, generate branches using .then([branch1, branch2]) syntax
		if (isIfNode(startInfo.node) || isSwitchNode(startInfo.node)) {
			const outputs = Array.from(startInfo.outgoingConnections.entries()).sort(([a], [b]) => a - b);
			if (outputs.length > 0) {
				const branchCalls: string[] = [];
				const newProcessingStack = new Set(processingStack);
				newProcessingStack.add(startInfo.node.name);

				for (const [_outputIndex, targets] of outputs) {
					if (targets.length === 0) {
						branchCalls.push('null');
					} else {
						const target = targets[0];
						const targetInfo = nodeInfoMap.get(target.to);
						if (!targetInfo || targetInfo.isSubnodeOf) {
							branchCalls.push('null');
						} else if (addedNodes.has(target.to)) {
							// Target already added - check if it's a cycle target
							if (cycleNodeVars?.has(target.to)) {
								branchCalls.push(cycleNodeVars.get(target.to)!);
							} else {
								branchCalls.push('null');
							}
						} else {
							addedNodes.add(target.to);
							branchCalls.push(
								generateNodeCallWithChain(
									targetInfo,
									nodeInfoMap,
									addedNodes,
									convergenceCtx,
									newProcessingStack,
									cycleNodeVars,
								),
							);
						}
					}
				}
				call += `.then([${branchCalls.join(', ')}])`;
			}
			return call;
		}
	} else {
		call = generateNodeCall(startInfo.node, nodeInfoMap);
	}

	// Get downstream nodes (single output, single target chains only)
	// We follow the chain as long as there's exactly one output with exactly one target
	let currentInfo: NodeInfo | undefined = startInfo;

	while (currentInfo) {
		const outputs = Array.from(currentInfo.outgoingConnections.entries());

		// Stop if no outputs or multiple outputs (branching)
		if (outputs.length !== 1) break;

		const [_outputIndex, targets] = outputs[0];

		// Stop if no targets
		if (targets.length === 0) break;

		// Handle fan-out (multiple targets on same output)
		if (targets.length > 1) {
			// Check if all fan-out targets converge at a single merge node
			const convergeMergeName = findFanOutMergeConvergence(targets, nodeInfoMap, addedNodes);

			if (convergeMergeName) {
				// Generate merge with inline chains for each target
				const mergeInfo = nodeInfoMap.get(convergeMergeName);
				if (mergeInfo) {
					// Generate chains up to (but not including) the merge for each target
					const branchCalls: string[] = [];
					for (const target of targets) {
						const targetInfo = nodeInfoMap.get(target.to);
						if (!targetInfo || addedNodes.has(target.to) || targetInfo.isSubnodeOf) continue;

						addedNodes.add(target.to);
						// Generate chain stopping before the merge
						const chainCall = generateChainUpToMerge(
							targetInfo,
							nodeInfoMap,
							addedNodes,
							convergeMergeName,
							convergenceCtx,
							cycleNodeVars,
						);
						branchCalls.push(chainCall);
					}

					// Generate the merge call with inline branches
					addedNodes.add(convergeMergeName);
					const configParts: string[] = [];
					if (mergeInfo.node.typeVersion != null) {
						configParts.push(`version: ${mergeInfo.node.typeVersion}`);
					}
					if (mergeInfo.node.parameters && Object.keys(mergeInfo.node.parameters).length > 0) {
						configParts.push(`parameters: ${formatValue(mergeInfo.node.parameters, 2)}`);
					}
					if (mergeInfo.node.name !== 'Merge') {
						configParts.push(`name: '${escapeString(mergeInfo.node.name)}'`);
					}
					const configStr = configParts.length > 0 ? `, { ${configParts.join(', ')} }` : '';
					call += `.then(merge([${branchCalls.join(', ')}]${configStr}))`;

					// Continue chain from merge node
					currentInfo = mergeInfo;
					continue;
				}
			}

			// No merge convergence - use standard fan-out
			const targetCalls: string[] = [];
			for (const target of targets) {
				const targetInfo = nodeInfoMap.get(target.to);
				if (!targetInfo || addedNodes.has(target.to) || targetInfo.isSubnodeOf) continue;

				// Check for convergence node
				if (convergenceCtx?.convergenceVars.has(target.to)) {
					targetCalls.push(convergenceCtx.convergenceVars.get(target.to)!);
				} else {
					addedNodes.add(target.to);
					// Recursively generate the chain for each target
					targetCalls.push(
						generateNodeCallWithChain(
							targetInfo,
							nodeInfoMap,
							addedNodes,
							convergenceCtx,
							processingStack,
							cycleNodeVars,
						),
					);
				}
			}
			if (targetCalls.length > 0) {
				if (targetCalls.length === 1) {
					call += `.then(${targetCalls[0]})`;
				} else {
					call += `.then([${targetCalls.join(', ')}])`;
				}
			}
			break; // Fan-out ends the chain
		}

		const target = targets[0];
		const targetInfo = nodeInfoMap.get(target.to);

		// Stop if target not found or is a subnode
		if (!targetInfo || targetInfo.isSubnodeOf) break;

		// Check if this is a convergence node - if so, reference the variable
		// This check must come BEFORE the addedNodes check since convergence nodes
		// are pre-added but we still want to connect to them via their variable
		if (convergenceCtx?.convergenceVars.has(target.to)) {
			const varName = convergenceCtx.convergenceVars.get(target.to)!;
			call += `.then(${varName})`;
			// Don't add to addedNodes here - the variable was already created
			break;
		}

		// Check if this is a cycle target node - if so, reference the variable
		// This preserves backward edges in polling loops
		if (addedNodes.has(target.to)) {
			if (cycleNodeVars?.has(target.to)) {
				const varName = cycleNodeVars.get(target.to)!;
				call += `.then(${varName})`;
			}
			break;
		}

		// Handle composite patterns recursively (IF, Switch, Merge)
		if (isIfNode(targetInfo.node)) {
			const ifResult = generateIfBranchCall(
				targetInfo,
				nodeInfoMap,
				addedNodes,
				convergenceCtx,
				processingStack,
				cycleNodeVars,
			);
			if (ifResult) {
				addedNodes.add(target.to);
				call += `.then(${ifResult.call})`;
				// Continue from the IF node to see if there's more downstream
				currentInfo = targetInfo;
				continue;
			}
			break;
		}

		if (isSwitchNode(targetInfo.node)) {
			const switchResult = generateSwitchCaseCall(
				targetInfo,
				nodeInfoMap,
				addedNodes,
				processingStack,
				cycleNodeVars,
			);
			if (switchResult) {
				addedNodes.add(target.to);
				call += `.then(${switchResult.call})`;
				// Continue from the Switch node
				currentInfo = targetInfo;
				continue;
			}
			break;
		}

		if (isMergeNode(targetInfo.node)) {
			const mergeCall = generateMergeCall(targetInfo, nodeInfoMap, addedNodes);
			if (mergeCall) {
				addedNodes.add(target.to);
				call += `.then(${mergeCall})`;
				// Continue from the Merge node
				currentInfo = targetInfo;
				continue;
			}
			break;
		}

		// Add the downstream node to the chain
		addedNodes.add(target.to);
		call += `.then(${generateNodeCall(targetInfo.node, nodeInfoMap)})`;
		currentInfo = targetInfo;
	}

	return call;
}

/**
 * Generate an ifBranch() call for an IF node.
 * Supports both full IF nodes (both branches) and single-branch IF nodes.
 * Returns the ifBranch call string, or null if no branches connected.
 * Note: branchNames is kept for backward compatibility but downstream nodes
 * are now included inline via .then() chaining.
 *
 * When both branches converge to the same downstream node(s), those convergence
 * nodes are generated as variables before the ifBranch call, and both branches
 * reference the variable to preserve both connections.
 */
function generateIfBranchCall(
	ifInfo: NodeInfo,
	nodeInfoMap: Map<string, NodeInfo>,
	addedNodes: Set<string>,
	parentConvergenceCtx?: ConvergenceContext,
	parentProcessingStack?: Set<string>,
	cycleNodeVars?: Map<string, string>,
): { call: string; branchNames: string[] } | null {
	// Check if this IF node is already being processed (cycle detected)
	// This prevents infinite recursion for cycles like: IF -> A -> IF
	// Return null to skip generating .then() call (backward connections to IF nodes
	// cannot be represented in the SDK)
	if (parentProcessingStack?.has(ifInfo.node.name)) {
		return null;
	}

	const outputs = ifInfo.outgoingConnections;

	// Get true (output 0) and false (output 1) branches - may be error output at index 2
	const errorOutputIndex = hasErrorOutput(ifInfo.node) ? getErrorOutputIndex(ifInfo.node) : -1;
	const trueBranch = outputs.get(0)?.[0];
	const falseBranch = outputs.get(1)?.[0];

	// Need at least one branch (true or false, but not just error)
	if (!trueBranch && !falseBranch) return null;

	const trueInfo = trueBranch ? nodeInfoMap.get(trueBranch.to) : null;
	const falseInfo = falseBranch ? nodeInfoMap.get(falseBranch.to) : null;

	// If we have a branch but can't find its info, skip
	if ((trueBranch && !trueInfo) || (falseBranch && !falseInfo)) return null;

	// Create/extend processing stack to track this IF node (prevents infinite recursion)
	const processingStack = new Set(parentProcessingStack);
	processingStack.add(ifInfo.node.name);

	// branchNames is now empty since downstream nodes are included inline
	const branchNames: string[] = [];

	// Find convergence nodes (nodes reachable from both branches)
	const branchInfos = [trueInfo, falseInfo].filter((info): info is NodeInfo => info !== null);
	const localConvergenceNodes = findConvergenceNodes(branchInfos, nodeInfoMap, addedNodes);

	// Merge local convergence nodes with parent context
	const convergenceNodes = new Set(localConvergenceNodes);
	if (parentConvergenceCtx) {
		for (const nodeName of parentConvergenceCtx.convergenceNodes) {
			convergenceNodes.add(nodeName);
		}
	}

	// Build convergence context with variable names for convergence nodes
	// Start with parent context entries
	const convergenceVars = new Map<string, string>();
	if (parentConvergenceCtx) {
		for (const [name, varName] of parentConvergenceCtx.convergenceVars) {
			convergenceVars.set(name, varName);
		}
	}
	const convergenceCtx: ConvergenceContext = {
		convergenceNodes,
		convergenceVars,
	};

	// Generate variable declarations for LOCAL convergence nodes only
	// (parent nodes already have variables declared)
	const varDeclarations: string[] = [];
	for (const nodeName of localConvergenceNodes) {
		const nodeInfo = nodeInfoMap.get(nodeName);
		if (!nodeInfo || addedNodes.has(nodeName)) continue;
		// Skip if already in parent context
		if (parentConvergenceCtx?.convergenceVars.has(nodeName)) continue;

		const varName = nodeInfo.varName;
		convergenceCtx.convergenceVars.set(nodeName, varName);
		addedNodes.add(nodeName);

		// Generate the convergence node WITH its downstream chain
		// This ensures the full chain from the convergence point is included
		const chainCall = generateNodeCallWithChain(
			nodeInfo,
			nodeInfoMap,
			addedNodes,
			undefined,
			processingStack,
			cycleNodeVars,
		);
		varDeclarations.push(`const ${varName} = ${chainCall}`);
	}

	// Mark branch nodes as added
	if (trueBranch && trueInfo) {
		addedNodes.add(trueBranch.to);
	}
	if (falseBranch && falseInfo) {
		addedNodes.add(falseBranch.to);
	}

	// Generate the ifBranch call with inline downstream chains
	// Pass convergence context so chains reference variables instead of inlining
	const trueCall = trueInfo
		? generateNodeCallWithChain(
				trueInfo,
				nodeInfoMap,
				addedNodes,
				convergenceCtx,
				processingStack,
				cycleNodeVars,
			)
		: 'null';
	const falseCall = falseInfo
		? generateNodeCallWithChain(
				falseInfo,
				nodeInfoMap,
				addedNodes,
				convergenceCtx,
				processingStack,
				cycleNodeVars,
			)
		: 'null';

	// Now mark convergence nodes as added so they aren't generated again
	for (const nodeName of convergenceCtx.convergenceVars.keys()) {
		addedNodes.add(nodeName);
	}

	const configParts: string[] = [];
	// Always include version to preserve original node version
	if (ifInfo.node.typeVersion != null) {
		configParts.push(`version: ${ifInfo.node.typeVersion}`);
	}
	if (ifInfo.node.parameters && Object.keys(ifInfo.node.parameters).length > 0) {
		configParts.push(`parameters: ${formatValue(ifInfo.node.parameters, 2)}`);
	}
	if (ifInfo.node.name !== 'IF') {
		configParts.push(`name: '${escapeString(ifInfo.node.name)}'`);
	}
	// Include onError if set
	if (ifInfo.node.onError) {
		configParts.push(`onError: '${ifInfo.node.onError}'`);
	}

	const configStr = configParts.length > 0 ? `, { ${configParts.join(', ')} }` : '';

	// Check for error output connection
	let errorHandlerCall = '';
	if (errorOutputIndex >= 0) {
		const errorTargets = outputs.get(errorOutputIndex);
		if (errorTargets && errorTargets.length > 0) {
			const errorTarget = errorTargets[0];
			const errorInfo = nodeInfoMap.get(errorTarget.to);
			if (errorInfo && !addedNodes.has(errorTarget.to)) {
				// We'll need to handle error output separately via a variable
				addedNodes.add(errorTarget.to);
				errorHandlerCall = `\n  // Error handler connected via ifNode.onError(errorHandler)`;
			}
		}
	}

	// Build the final call with variable declarations prepended
	let finalCall = `ifBranch([${trueCall}, ${falseCall}]${configStr})${errorHandlerCall}`;
	if (varDeclarations.length > 0) {
		// Wrap in IIFE to scope variables
		finalCall = `(() => {\n${varDeclarations.join(';\n')};\nreturn ${finalCall};\n})()`;
	}

	return {
		call: finalCall,
		branchNames,
	};
}

/**
 * Generate a switchCase() call for a Switch node.
 * Returns the switchCase call string and case names, or null if pattern doesn't match.
 */
function generateSwitchCaseCall(
	switchInfo: NodeInfo,
	nodeInfoMap: Map<string, NodeInfo>,
	addedNodes: Set<string>,
	parentProcessingStack?: Set<string>,
	cycleNodeVars?: Map<string, string>,
): { call: string; caseNames: string[]; convergenceNames: string[] } | null {
	// Check if this Switch node is already being processed (cycle detected)
	// Return null to skip generating .then() call (backward connections to Switch nodes
	// cannot be represented in the SDK)
	if (parentProcessingStack?.has(switchInfo.node.name)) {
		return null;
	}

	const outputs = Array.from(switchInfo.outgoingConnections.entries()).sort((a, b) => a[0] - b[0]);

	// Need at least one output
	if (outputs.length === 0) return null;

	// Create/extend processing stack to track this Switch node (prevents infinite recursion)
	const processingStack = new Set(parentProcessingStack);
	processingStack.add(switchInfo.node.name);

	// Collect case branch start nodes for convergence detection
	const branchInfos: (NodeInfo | null)[] = [];
	for (const [_outputIndex, targets] of outputs) {
		if (targets.length === 0) {
			branchInfos.push(null);
			continue;
		}
		const target = targets[0];
		const targetInfo = nodeInfoMap.get(target.to);
		branchInfos.push(targetInfo ?? null);
	}

	// Find nodes that are reachable from multiple case branches (convergence points)
	const convergenceNodes = findConvergenceNodes(branchInfos, nodeInfoMap, addedNodes);

	// Create convergence context if there are convergence nodes
	let convergenceCtx: ConvergenceContext | undefined;
	const prefixLines: string[] = [];

	if (convergenceNodes.size > 0) {
		const convergenceVars = new Map<string, string>();

		// Generate variable declarations for each convergence node WITH its downstream chain
		for (const nodeName of convergenceNodes) {
			const nodeInfo = nodeInfoMap.get(nodeName);
			if (!nodeInfo || addedNodes.has(nodeName)) continue;

			const varName = generateVarName(nodeName);
			addedNodes.add(nodeName);
			// Generate the convergence node WITH its downstream chain
			// This ensures the downstream path is included in the variable declaration
			const chainCall = generateNodeCallWithChain(
				nodeInfo,
				nodeInfoMap,
				addedNodes,
				undefined,
				processingStack,
				cycleNodeVars,
			);
			prefixLines.push(`const ${varName} = ${chainCall};`);
			convergenceVars.set(nodeName, varName);
		}

		convergenceCtx = { convergenceNodes, convergenceVars };
	}

	// Collect case nodes in order, including their downstream chains
	const caseCalls: string[] = [];
	const caseNames: string[] = [];
	for (const [_outputIndex, targets] of outputs) {
		if (targets.length === 0) continue;
		const target = targets[0];
		const targetInfo = nodeInfoMap.get(target.to);
		if (!targetInfo) continue;

		// Mark this case node as added before generating its chain
		addedNodes.add(target.to);
		// Generate the case node WITH its downstream chain (not just a single node)
		caseCalls.push(
			generateNodeCallWithChain(
				targetInfo,
				nodeInfoMap,
				addedNodes,
				convergenceCtx,
				processingStack,
				cycleNodeVars,
			),
		);
		caseNames.push(target.to);
	}

	if (caseCalls.length === 0) return null;

	// Generate the switchCase call
	const configParts: string[] = [];
	// Always include version to preserve original node version
	if (switchInfo.node.typeVersion != null) {
		configParts.push(`version: ${switchInfo.node.typeVersion}`);
	}
	if (switchInfo.node.parameters && Object.keys(switchInfo.node.parameters).length > 0) {
		configParts.push(`parameters: ${formatValue(switchInfo.node.parameters, 2)}`);
	}
	if (switchInfo.node.name !== 'Switch') {
		configParts.push(`name: '${escapeString(switchInfo.node.name)}'`);
	}

	const configStr = configParts.length > 0 ? `, { ${configParts.join(', ')} }` : '';

	// Build the final call with variable declarations
	let finalCall = `switchCase([${caseCalls.join(', ')}]${configStr})`;
	if (prefixLines.length > 0) {
		// Wrap in IIFE to scope variables
		finalCall = `(() => {\n${prefixLines.join(';\n')};\nreturn ${finalCall};\n})()`;
	}

	return {
		call: finalCall,
		caseNames,
		convergenceNames: Array.from(convergenceNodes),
	};
}

/**
 * Generates a subnode factory call (e.g., languageModel({...}), tool({...}))
 * Recursively handles nested subnodes (subnodes that have their own subnodes)
 */
function generateSubnodeCall(
	nodeJson: NodeJSON,
	factoryName: string,
	nodeInfoMap: Map<string, NodeInfo>,
): string {
	const configParts: string[] = [];

	// Parameters
	if (nodeJson.parameters && Object.keys(nodeJson.parameters).length > 0) {
		configParts.push(`parameters: ${formatValue(nodeJson.parameters, 4)}`);
	}

	// Credentials
	if (nodeJson.credentials && Object.keys(nodeJson.credentials).length > 0) {
		configParts.push(`credentials: ${formatValue(nodeJson.credentials, 4)}`);
	}

	// Check if this subnode has its own subnodes (nested hierarchy)
	const nodeInfo = nodeInfoMap.get(nodeJson.name);
	if (nodeInfo && nodeInfo.subnodes.length > 0) {
		const subnodesConfig = generateSubnodesConfig(nodeInfo.subnodes, nodeInfoMap);
		if (subnodesConfig) {
			configParts.push(subnodesConfig);
		}
	}

	// Name (if different from type)
	const defaultName = generateDefaultNodeName(nodeJson.type);
	if (nodeJson.name !== defaultName) {
		configParts.push(`name: '${escapeString(nodeJson.name)}'`);
	}

	const configStr = configParts.length > 0 ? `{ ${configParts.join(', ')} }` : '{}';

	return `${factoryName}({ type: '${escapeString(nodeJson.type)}', version: ${nodeJson.typeVersion}, config: ${configStr} })`;
}

/**
 * Generates the subnodes config object for a node that has AI subnodes attached
 */
function generateSubnodesConfig(
	subnodes: SubnodeConnection[],
	nodeInfoMap: Map<string, NodeInfo>,
): string {
	if (subnodes.length === 0) return '';

	const parts: string[] = [];

	// Group subnodes by config key
	const byConfigKey = new Map<string, { factory: string; nodes: NodeJSON[] }>();

	for (const sub of subnodes) {
		const subInfo = nodeInfoMap.get(sub.subnodeName);
		if (!subInfo) continue;

		const aiConfig = AI_CONNECTION_TYPES.get(sub.connectionType);
		if (!aiConfig) continue;

		const existing = byConfigKey.get(aiConfig.configKey);
		if (existing) {
			existing.nodes.push(subInfo.node);
		} else {
			byConfigKey.set(aiConfig.configKey, {
				factory: aiConfig.factory,
				nodes: [subInfo.node],
			});
		}
	}

	// Generate each subnode config entry
	for (const [configKey, { factory, nodes }] of byConfigKey) {
		if (configKey === 'tools' || nodes.length > 1) {
			// Tools is always an array, other types become arrays when multiple nodes are connected
			const calls = nodes.map((n) => generateSubnodeCall(n, factory, nodeInfoMap));
			parts.push(`${configKey}: [${calls.join(', ')}]`);
		} else {
			// Single subnode
			parts.push(`${configKey}: ${generateSubnodeCall(nodes[0], factory, nodeInfoMap)}`);
		}
	}

	return parts.length > 0 ? `subnodes: { ${parts.join(', ')} }` : '';
}

/**
 * Generates a node() or trigger() call for a node.
 */
function generateNodeCall(nodeJson: NodeJSON, nodeInfoMap?: Map<string, NodeInfo>): string {
	const configParts: string[] = [];

	// Parameters
	if (nodeJson.parameters && Object.keys(nodeJson.parameters).length > 0) {
		configParts.push(`parameters: ${formatValue(nodeJson.parameters, 2)}`);
	}

	// Credentials
	if (nodeJson.credentials && Object.keys(nodeJson.credentials).length > 0) {
		configParts.push(`credentials: ${formatValue(nodeJson.credentials, 2)}`);
	}

	// Subnodes (if any)
	if (nodeInfoMap) {
		const nodeInfo = nodeInfoMap.get(nodeJson.name);
		if (nodeInfo && nodeInfo.subnodes.length > 0) {
			const subnodesConfig = generateSubnodesConfig(nodeInfo.subnodes, nodeInfoMap);
			if (subnodesConfig) {
				configParts.push(subnodesConfig);
			}
		}
	}

	// Position (only if non-zero)
	if (nodeJson.position && (nodeJson.position[0] !== 0 || nodeJson.position[1] !== 0)) {
		configParts.push(`position: [${nodeJson.position[0]}, ${nodeJson.position[1]}]`);
	}

	// Name (if different from type)
	const defaultName = generateDefaultNodeName(nodeJson.type);
	if (nodeJson.name !== defaultName) {
		configParts.push(`name: '${escapeString(nodeJson.name)}'`);
	}

	const fn = isTriggerNode(nodeJson) ? 'trigger' : 'node';
	const configStr = configParts.length > 0 ? `{ ${configParts.join(', ')} }` : '{}';

	return `${fn}({ type: '${escapeString(nodeJson.type)}', version: ${nodeJson.typeVersion}, config: ${configStr} })`;
}

/**
 * Generates a sticky() call for a sticky note.
 */
function generateStickyCall(nodeJson: NodeJSON): string {
	const content = (nodeJson.parameters?.content as string) ?? '';
	const options: string[] = [];

	// Always include name to preserve it across roundtrips
	// (sticky notes now generate unique default names like "Sticky Note abc12345")
	if (nodeJson.name) {
		options.push(`name: '${escapeString(nodeJson.name)}'`);
	}
	if (nodeJson.parameters?.color !== undefined) {
		options.push(`color: ${nodeJson.parameters.color}`);
	}
	if (nodeJson.position && (nodeJson.position[0] !== 0 || nodeJson.position[1] !== 0)) {
		options.push(`position: [${nodeJson.position[0]}, ${nodeJson.position[1]}]`);
	}
	if (nodeJson.parameters?.width !== undefined) {
		options.push(`width: ${nodeJson.parameters.width}`);
	}
	if (nodeJson.parameters?.height !== undefined) {
		options.push(`height: ${nodeJson.parameters.height}`);
	}

	const optionsStr = options.length > 0 ? `, { ${options.join(', ')} }` : '';
	return `sticky('${escapeString(content)}'${optionsStr})`;
}
