/**
 * Simplified Code Generator
 *
 * Generates simplified JS DSL code from a composite tree.
 * This is the inverse direction of the compiler (compiler.ts).
 *
 * Pipeline:
 *   WorkflowJSON → buildSemanticGraph → annotateGraph → buildCompositeTree
 *   → generateSimplifiedCode → Simplified JS
 */

import type {
	CompositeTree,
	CompositeNode,
	ChainNode,
	LeafNode,
	IfElseCompositeNode,
	SwitchCaseCompositeNode,
	SplitInBatchesCompositeNode,
	VariableReference,
} from './composite-tree';
import type { SemanticGraph, SemanticNode } from './types';
import type { WorkflowJSON } from '../types/base';
import { CREDENTIAL_TO_AUTH_TYPE } from '../shared/credential-mapping';
import { fromScheduleRule } from '../shared/schedule-mapping';
import { NODE_TYPE_TO_TRIGGER, TRIGGER_TYPES } from '../shared/trigger-mapping';
import { buildSemanticGraph } from './semantic-graph';
import { annotateGraph } from './graph-annotator';
import { buildCompositeTree } from './composite-builder';

// ─── Context ─────────────────────────────────────────────────────────────────

interface SubFunctionInfo {
	name: string;
	params: string[];
	body: string;
	setNodeNames: Set<string>;
	execNodeNames: Set<string>;
}

/** Maps exec node name → function name for quick lookup */
type ExecToFuncMap = Map<string, string>;

/** Maps exec node name → decompiled loop body code for _loop_ sub-workflows */
interface LoopBodyInfo {
	loopVar: string;
	body: string;
	execNodeName: string;
}

/** Maps exec node name → decompiled try body code for __tryCatch_ sub-workflows */
interface TryCatchBodyInfo {
	body: string;
	execNodeName: string;
	setNodeNames: Set<string>;
}

interface SimplifiedGenContext {
	indent: number;
	lines: string[];
	graph: SemanticGraph;
	nodeNameToVarName: Map<string, string>;
	triggerType: 'manual' | 'webhook' | 'schedule' | 'error' | '';
	codeNodeVars: Set<string>;
	subFunctions: Map<string, SubFunctionInfo>;
	execToFunc: ExecToFuncMap;
	/** Maps exec node name → loop body info for _loop_ sub-workflows */
	loopBodies: Map<string, LoopBodyInfo>;
	/** Maps exec node name → try/catch body info for __tryCatch_ sub-workflows */
	tryCatchBodies: Map<string, TryCatchBodyInfo>;
	/** Set by visitLeaf to suppress inner try/catch in emitHttpNode/emitAiNode */
	suppressTryCatch: boolean;
	/** Workflow-level pin data keyed by node name */
	workflowPinData: Record<string, unknown[]>;
}

function emit(ctx: SimplifiedGenContext, text: string): void {
	if (text === '') {
		ctx.lines.push('');
	} else {
		ctx.lines.push('\t'.repeat(ctx.indent) + text);
	}
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

export function generateSimplifiedCode(
	tree: CompositeTree,
	_json: WorkflowJSON,
	graph: SemanticGraph,
	options?: { preSeededVarNames?: Map<string, string> },
): string {
	const nodeNameToVarName = computeVariableAssignments(graph);
	if (options?.preSeededVarNames) {
		for (const [k, v] of options.preSeededVarNames) {
			nodeNameToVarName.set(k, v);
		}
	}
	const codeNodeVars = collectCodeNodeVars(graph);
	const { subFunctions, execToFunc, loopBodies, tryCatchBodies } = detectSubFunctions(graph);

	const ctx: SimplifiedGenContext = {
		indent: 0,
		lines: [],
		graph,
		nodeNameToVarName,
		triggerType: '',
		codeNodeVars,
		subFunctions,
		execToFunc,
		loopBodies,
		tryCatchBodies,
		suppressTryCatch: false,
		workflowPinData: (_json.pinData as Record<string, unknown[]>) ?? {},
	};

	// Emit sub-function declarations first
	for (const fn of subFunctions.values()) {
		emitSubFunctionDeclaration(fn, ctx);
		ctx.lines.push('');
	}

	// Detect shared pipeline: multiple trigger roots converging on same downstream chain
	const sharedPipeline = detectSharedPipeline(tree);

	if (sharedPipeline) {
		// Emit the shared chain as a function declaration
		const { functionName, fullChainRoot, triggerRoots } = sharedPipeline;
		emit(ctx, `async function ${functionName}() {`);
		ctx.indent++;
		// Emit the body (chain nodes after the trigger)
		const chain = fullChainRoot as ChainNode;
		emitChainBody(chain.nodes, 1, ctx); // skip trigger (index 0)
		ctx.indent--;
		emit(ctx, '}');
		ctx.lines.push('');

		// Emit each trigger callback calling the shared function
		for (let i = 0; i < triggerRoots.length; i++) {
			if (i > 0) ctx.lines.push('');
			const root = triggerRoots[i] as ChainNode;
			const triggerLeaf = root.nodes[0] as LeafNode;
			setTriggerType(triggerLeaf.node, ctx);
			emitTriggerHeader(triggerLeaf.node, ctx, false);
			ctx.indent++;
			emit(ctx, `await ${functionName}();`);
			ctx.indent--;
			emit(ctx, '});');
		}
	} else {
		for (let i = 0; i < tree.roots.length; i++) {
			if (i > 0) ctx.lines.push('');
			visitComposite(tree.roots[i], ctx);
		}
	}

	const code = ctx.lines.join('\n');
	return code.endsWith('\n') ? code : `${code}\n`;
}

// ─── Shared Pipeline Detection ───────────────────────────────────────────────

interface SharedPipelineInfo {
	functionName: string;
	/** The root that has the full chain (trigger + pipeline nodes) */
	fullChainRoot: CompositeNode;
	/** All trigger roots in order (including the full chain root) */
	triggerRoots: CompositeNode[];
}

/**
 * Detect shared pipeline: multiple trigger roots converging on the same downstream chain.
 *
 * Pattern: root A is Chain([Trigger, ...pipeline nodes])
 *          root B is Chain([Trigger, VarRef(X)]) where X is the first pipeline node in root A
 *
 * When detected, the pipeline body should be extracted as an async function
 * and each trigger callback should call it.
 */
function detectSharedPipeline(tree: CompositeTree): SharedPipelineInfo | null {
	if (tree.roots.length < 2) return null;

	// Find the "full chain" root: a chain starting with a trigger and having 2+ nodes
	let fullChainRoot: ChainNode | null = null;
	let fullChainIndex = -1;
	let firstPipelineNodeName = '';

	for (let i = 0; i < tree.roots.length; i++) {
		const root = tree.roots[i];
		if (root.kind !== 'chain') continue;
		const chain = root as ChainNode;
		if (chain.nodes.length < 2) continue;
		const first = chain.nodes[0];
		if (first.kind !== 'leaf' || !isTrigger(first.node)) continue;
		// This is a trigger chain with downstream nodes - candidate for full chain
		const second = chain.nodes[1];
		if (second.kind === 'leaf') {
			fullChainRoot = chain;
			fullChainIndex = i;
			firstPipelineNodeName = second.node.name;
			break;
		}
	}

	if (!fullChainRoot || !firstPipelineNodeName) return null;

	// Check other roots: they must be Chain([Trigger, VarRef(firstPipelineNodeName)])
	const varRefRoots: number[] = [];
	for (let i = 0; i < tree.roots.length; i++) {
		if (i === fullChainIndex) continue;
		const root = tree.roots[i];
		if (root.kind !== 'chain') return null; // all roots must be chains
		const chain = root as ChainNode;
		if (chain.nodes.length !== 2) return null;
		const first = chain.nodes[0];
		if (first.kind !== 'leaf' || !isTrigger(first.node)) return null;
		const second = chain.nodes[1];
		if (second.kind !== 'varRef') return null;
		if ((second as VariableReference).nodeName !== firstPipelineNodeName) return null;
		varRefRoots.push(i);
	}

	if (varRefRoots.length === 0) return null;

	// Collect all trigger roots in order (full chain first, then varRef roots)
	const triggerRoots: CompositeNode[] = [tree.roots[fullChainIndex]];
	for (const idx of varRefRoots) {
		triggerRoots.push(tree.roots[idx]);
	}

	return {
		functionName: 'pipeline',
		fullChainRoot,
		triggerRoots,
	};
}

// ─── Sub-Function Detection ──────────────────────────────────────────────────

function detectSubFunctions(graph: SemanticGraph): {
	subFunctions: Map<string, SubFunctionInfo>;
	execToFunc: ExecToFuncMap;
	loopBodies: Map<string, LoopBodyInfo>;
	tryCatchBodies: Map<string, TryCatchBodyInfo>;
} {
	const subFunctions = new Map<string, SubFunctionInfo>();
	const execToFunc: ExecToFuncMap = new Map();
	const loopBodies = new Map<string, LoopBodyInfo>();
	const tryCatchBodies = new Map<string, TryCatchBodyInfo>();

	for (const node of graph.nodes.values()) {
		if (node.type !== 'n8n-nodes-base.executeWorkflow') continue;
		const params = node.json.parameters ?? {};
		if (params.source !== 'parameter') continue;
		const workflowJsonStr = params.workflowJson as string | undefined;
		if (!workflowJsonStr || typeof workflowJsonStr !== 'string') continue;

		let innerJson: WorkflowJSON;
		try {
			innerJson = JSON.parse(workflowJsonStr) as WorkflowJSON;
		} catch {
			continue;
		}

		// Use inner workflow id as the canonical function name (stable across deduped node names)
		const funcName = innerJson.id ?? node.name;

		// Check if this is a compiler-generated loop body sub-workflow
		if (funcName.startsWith('_loop_')) {
			const loopVar = funcName.replace('_loop_', '');

			// Decompile the sub-workflow body, pre-seeding the trigger node → loop variable mapping
			const innerGraph = buildSemanticGraph(innerJson);
			annotateGraph(innerGraph);
			const innerTree = buildCompositeTree(innerGraph, { extractBranchDownstream: true });
			const preSeededVarNames = new Map([['When Executed by Another Workflow', loopVar]]);
			const innerCode = generateSimplifiedCode(innerTree, innerJson, innerGraph, {
				preSeededVarNames,
			});
			const body = stripTriggerWrapper(innerCode.trim());

			loopBodies.set(node.name, {
				loopVar,
				body,
				execNodeName: node.name,
			});
			continue;
		}

		// Check if this is a compiler-generated try/catch body sub-workflow
		if (funcName.startsWith('__tryCatch_')) {
			const innerGraph = buildSemanticGraph(innerJson);
			annotateGraph(innerGraph);
			const innerTree = buildCompositeTree(innerGraph, { extractBranchDownstream: true });
			const innerCode = generateSimplifiedCode(innerTree, innerJson, innerGraph);
			const body = stripTriggerWrapper(innerCode.trim());

			// Collect Set node names for this try/catch exec node
			const setNodeNames = new Set<string>();
			collectSetNodeNames(node, graph, setNodeNames);

			tryCatchBodies.set(node.name, {
				body,
				execNodeName: node.name,
				setNodeNames,
			});
			continue;
		}

		execToFunc.set(node.name, funcName);

		if (subFunctions.has(funcName)) {
			// Already processed — just register this call site
			const fn = subFunctions.get(funcName)!;
			fn.execNodeNames.add(node.name);
			collectSetNodeNames(node, graph, fn.setNodeNames);
			continue;
		}

		// Parse inner workflow and decompile recursively
		const innerGraph = buildSemanticGraph(innerJson);
		annotateGraph(innerGraph);
		const innerTree = buildCompositeTree(innerGraph, { extractBranchDownstream: true });
		const innerCode = generateSimplifiedCode(innerTree, innerJson, innerGraph);

		// Strip trigger wrapper from inner code
		const body = stripTriggerWrapper(innerCode.trim());

		// Find the preceding Set node to extract parameter names
		const fnParams: string[] = [];
		const setNodeNames = new Set<string>();
		collectSetNodeNames(node, graph, setNodeNames);

		// Extract param names from the first Set node found
		for (const setName of setNodeNames) {
			const setNode = graph.nodes.get(setName);
			if (!setNode) continue;
			const assignments = (
				setNode.json.parameters?.assignments as {
					assignments?: Array<{ name: string }>;
				}
			)?.assignments;
			if (assignments) {
				for (const a of assignments) {
					fnParams.push(a.name);
				}
			}
			break; // Only need params from one call site
		}

		subFunctions.set(funcName, {
			name: funcName,
			params: fnParams,
			body,
			setNodeNames,
			execNodeNames: new Set([node.name]),
		});
	}

	return { subFunctions, execToFunc, loopBodies, tryCatchBodies };
}

function isSubFunctionSetNode(setNodeName: string): boolean {
	// Match "Set <funcName> params" or "Set <funcName> params 1" (deduped)
	// Also matches "Set __tryCatch_N params" for try/catch sub-workflows
	return /^Set .+ params( \d+)?$/.test(setNodeName);
}

function collectSetNodeNames(
	execNode: SemanticNode,
	graph: SemanticGraph,
	setNodeNames: Set<string>,
): void {
	for (const sources of execNode.inputSources.values()) {
		for (const source of sources) {
			const predNode = graph.nodes.get(source.from);
			if (!predNode || predNode.type !== 'n8n-nodes-base.set') continue;
			if (isSubFunctionSetNode(predNode.name)) {
				setNodeNames.add(predNode.name);
			}
		}
	}
}

function stripTriggerWrapper(code: string): string {
	// Find the trigger wrapper — may have function declarations before it
	const triggerIdx = code.search(/^on\w+\(/m);
	if (triggerIdx === -1) return code;

	// Extract any function declarations before the trigger
	const prefix = code.slice(0, triggerIdx).trim();
	const triggerPart = code.slice(triggerIdx);

	// Match onManual/onWebhook/onSchedule/onError(async (...) => {\n...\n});
	const wrapperPattern = /^on\w+\([^)]*(?:\([^)]*\))?\s*=>\s*\{([\s\S]*)\}\);?\s*$/;
	const match = wrapperPattern.exec(triggerPart);
	if (!match) return code;

	// De-indent the body by one level
	const bodyLines = match[1].split('\n');
	const stripped: string[] = [];
	for (const line of bodyLines) {
		if (line.startsWith('\t')) {
			stripped.push(line.slice(1));
		} else {
			stripped.push(line);
		}
	}

	const body = stripped.join('\n').trim();
	return prefix ? `${prefix}\n${body}` : body;
}

function emitSubFunctionDeclaration(fn: SubFunctionInfo, ctx: SimplifiedGenContext): void {
	// Extract nested function declarations to hoist them before this function
	const { nestedFunctions, bodyWithoutNested } = extractNestedFunctions(fn.body);

	// Emit nested functions first (hoisted to top level)
	for (const nested of nestedFunctions) {
		for (const line of nested.split('\n')) {
			emit(ctx, line);
		}
		ctx.lines.push('');
	}

	const paramStr = fn.params.join(', ');
	emit(ctx, `async function ${fn.name}(${paramStr}) {`);
	ctx.indent++;

	// Strip base indentation but preserve relative indentation (like emitCodeNode)
	const bodyLines = bodyWithoutNested.split('\n');
	let minIndent = Infinity;
	for (const line of bodyLines) {
		if (!line.trim()) continue;
		const leadingTabs = line.match(/^\t*/)?.[0].length ?? 0;
		if (leadingTabs < minIndent) minIndent = leadingTabs;
	}
	if (!Number.isFinite(minIndent)) minIndent = 0;

	for (const line of bodyLines) {
		if (line.trim()) {
			emit(ctx, line.slice(minIndent));
		} else {
			emit(ctx, '');
		}
	}

	ctx.indent--;
	emit(ctx, '}');
}

function extractNestedFunctions(body: string): {
	nestedFunctions: string[];
	bodyWithoutNested: string;
} {
	const lines = body.split('\n');
	const nestedFunctions: string[] = [];
	const remainingLines: string[] = [];
	let i = 0;

	while (i < lines.length) {
		if (/^async function \w+\(/.test(lines[i].trim())) {
			// Collect the entire function declaration
			const funcLines: string[] = [lines[i]];
			let braceDepth = 0;
			for (const ch of lines[i]) {
				if (ch === '{') braceDepth++;
				if (ch === '}') braceDepth--;
			}
			i++;
			while (i < lines.length && braceDepth > 0) {
				funcLines.push(lines[i]);
				for (const ch of lines[i]) {
					if (ch === '{') braceDepth++;
					if (ch === '}') braceDepth--;
				}
				i++;
			}
			nestedFunctions.push(funcLines.join('\n'));
		} else {
			remainingLines.push(lines[i]);
			i++;
		}
	}

	return { nestedFunctions, bodyWithoutNested: remainingLines.join('\n').trim() };
}

// ─── Variable Assignment Pre-computation ─────────────────────────────────────

function computeVariableAssignments(graph: SemanticGraph): Map<string, string> {
	const nodeNameToVarName = new Map<string, string>();
	const usedNames = new Map<string, number>();

	function pickUniqueName(baseName: string): string {
		const count = usedNames.get(baseName) ?? 0;
		usedNames.set(baseName, count + 1);
		return count === 0 ? baseName : `${baseName}${count + 1}`;
	}

	// First pass: collect code node imports to determine upstream variable names
	// e.g. const tickers = $('GET api...').all().map(i => i.json)
	const codeImportNames = new Map<string, string>(); // node name → local var name
	const importPattern = /const (\w+) = \$\('([^']+)'\)\.all\(\)\.map\(i => i\.json\)/g;
	for (const node of graph.nodes.values()) {
		if (node.type !== 'n8n-nodes-base.code') continue;
		const jsCode = (node.json.parameters?.jsCode as string) ?? '';
		let importMatch: RegExpExecArray | null;
		while ((importMatch = importPattern.exec(jsCode)) !== null) {
			codeImportNames.set(importMatch[2], importMatch[1]);
		}
	}

	// Scan all node parameters for $('NodeName') references
	const refPattern = /\$\('([^']+)'\)/g;
	for (const node of graph.nodes.values()) {
		const paramsStr = JSON.stringify(node.json.parameters ?? {});
		let match: RegExpExecArray | null;
		while ((match = refPattern.exec(paramsStr)) !== null) {
			const referencedName = match[1];
			if (nodeNameToVarName.has(referencedName)) continue;

			const referencedNode = graph.nodes.get(referencedName);
			if (!referencedNode || referencedNode.annotations.isTrigger) continue;

			// Derive variable name from the Set node assignment or a default
			if (referencedNode.type === 'n8n-nodes-base.set') {
				const assignments = (
					referencedNode.json.parameters?.assignments as {
						assignments?: Array<{ name: string }>;
					}
				)?.assignments;
				if (assignments?.length === 1) {
					nodeNameToVarName.set(referencedName, pickUniqueName(assignments[0].name));
					continue;
				}
			}

			// Check if a code node imports this with a specific variable name
			const importName = codeImportNames.get(referencedName);
			if (importName) {
				nodeNameToVarName.set(referencedName, pickUniqueName(importName));
				continue;
			}

			// Default: use 'data' for HTTP nodes, or sanitize the node name
			nodeNameToVarName.set(referencedName, pickUniqueName('data'));
		}
	}

	// Override variable names for try/catch (continueErrorOutput) nodes:
	// If the predecessor Code node has `let X = null;` then use X as the variable name
	for (const node of graph.nodes.values()) {
		const onError = node.json.onError as string | undefined;
		if (onError !== 'continueErrorOutput') continue;

		for (const sources of node.inputSources.values()) {
			for (const source of sources) {
				const predNode = graph.nodes.get(source.from);
				if (!predNode || predNode.type !== 'n8n-nodes-base.code') continue;

				const jsCode = (predNode.json.parameters?.jsCode as string) ?? '';
				const nullInitMatch = /let (\w+) = null;/.exec(jsCode);
				if (!nullInitMatch) continue;

				nodeNameToVarName.set(node.name, nullInitMatch[1]);
			}
		}
	}

	return nodeNameToVarName;
}

function collectCodeNodeVars(graph: SemanticGraph): Set<string> {
	const vars = new Set<string>();
	for (const node of graph.nodes.values()) {
		if (node.type !== 'n8n-nodes-base.code') continue;
		const jsCode = (node.json.parameters?.jsCode as string) ?? '';

		// Collect from return statements
		const returnMatch = /return \[\{ json: \{ ([^}]+) \} \}\];?$/.exec(jsCode);
		if (returnMatch) {
			for (const v of returnMatch[1].split(',')) {
				const name = v.trim();
				if (name) vars.add(name);
			}
		}

		// Collect from declarations
		const declPattern = /(?:let|var|const)\s+([^;=]+)/g;
		let declMatch: RegExpExecArray | null;
		while ((declMatch = declPattern.exec(jsCode)) !== null) {
			const declPart = declMatch[1].split('=')[0].trim();
			for (const v of declPart.split(',')) {
				const name = v.trim();
				if (name && /^\w+$/.test(name)) vars.add(name);
			}
		}
	}
	// Add all variable names from nodeNameToVarName
	return vars;
}

// ─── Visitor Dispatch ────────────────────────────────────────────────────────

function visitComposite(node: CompositeNode, ctx: SimplifiedGenContext): void {
	switch (node.kind) {
		case 'chain':
			return visitChain(node, ctx);
		case 'leaf':
			return visitLeaf(node, ctx);
		case 'ifElse':
			return visitIfElse(node, ctx);
		case 'switchCase':
			return visitSwitchCase(node, ctx);
		case 'splitInBatches':
			return visitSplitInBatches(node, ctx);
		default:
			break;
	}
}

// ─── Chain ───────────────────────────────────────────────────────────────────

function visitChain(chain: ChainNode, ctx: SimplifiedGenContext): void {
	if (chain.nodes.length === 0) return;

	const first = chain.nodes[0];
	if (first.kind === 'leaf' && isTrigger(first.node)) {
		// Detect trigger type
		setTriggerType(first.node, ctx);

		// Check if chain has respond node
		const hasRespond = chainHasRespondNode(chain, ctx);

		emitTriggerHeader(first.node, ctx, hasRespond);
		ctx.indent++;
		emitChainBody(chain.nodes, 1, ctx);
		ctx.indent--;
		emit(ctx, '});');
		return;
	}

	emitChainBody(chain.nodes, 0, ctx);
}

function emitChainBody(nodes: CompositeNode[], start: number, ctx: SimplifiedGenContext): void {
	let i = start;
	while (i < nodes.length) {
		if (i > start) {
			// Add blank line between multi-line statements
			const prev = nodes[i - 1];
			if (prev.kind === 'leaf' && isMultiLine(prev.node, ctx)) {
				emit(ctx, '');
			}
		}

		// Detect for-of loop pattern: code node with .map return followed by executeOnce nodes
		const loopInfo = detectForOfPattern(nodes, i, ctx);
		if (loopInfo) {
			// Emit the code node (without the return .map line, which was already stripped)
			visitComposite(nodes[i], ctx);
			emit(ctx, '');
			// Set the SIB-like variable mapping for the loop
			ctx.nodeNameToVarName.set(loopInfo.splitterNodeName, loopInfo.itemVar);
			emit(ctx, `for (const ${loopInfo.itemVar} of ${loopInfo.iterable}) {`);
			ctx.indent++;

			if (loopInfo.loopBodyCode) {
				// Multi-IO loop: emit decompiled sub-workflow body inline
				// Body is already at correct relative indentation from stripTriggerWrapper
				for (const line of loopInfo.loopBodyCode.split('\n')) {
					if (line.trim() === '') {
						emit(ctx, '');
					} else {
						emit(ctx, line);
					}
				}
			} else {
				// Single-IO loop: emit inline nodes
				for (let j = loopInfo.loopStart; j <= loopInfo.loopEnd; j++) {
					if (j > loopInfo.loopStart) {
						const prev = nodes[j - 1];
						if (prev.kind === 'leaf' && isMultiLine(prev.node, ctx)) {
							emit(ctx, '');
						}
					}
					visitComposite(nodes[j], ctx);
				}
			}

			ctx.indent--;
			emit(ctx, '}');
			i = loopInfo.loopEnd + 1;
			continue;
		}

		visitComposite(nodes[i], ctx);
		i++;
	}
}

function chainHasRespondNode(chain: ChainNode, _ctx: SimplifiedGenContext): boolean {
	return compositeTreeHasRespondNode(chain);
}

interface ForOfPatternInfo {
	iterable: string;
	itemVar: string;
	splitterNodeName: string;
	loopStart: number;
	loopEnd: number;
	/** If set, the loop body is an inline sub-workflow (multi-IO) */
	loopBodyCode?: string;
}

function detectForOfPattern(
	nodes: CompositeNode[],
	index: number,
	ctx: SimplifiedGenContext,
): ForOfPatternInfo | null {
	const current = nodes[index];
	if (current.kind !== 'leaf') return null;
	if (current.node.type !== 'n8n-nodes-base.code') return null;

	const jsCode = (current.node.json.parameters?.jsCode as string) ?? '';
	// Check if code ends with return items.map(x => ({ json: x })) or analysis.action_items.map(...)
	const mapReturn = /return (.+?)\.map\((\w+)\s*=>\s*\(\{ json: \2 \}\)\);?\s*$/.exec(jsCode);
	if (!mapReturn) return null;

	const iterable = mapReturn[1];
	const itemVar = mapReturn[2];

	// Loop body starts after the splitter
	if (index + 1 >= nodes.length) return null;

	// Check if next node is an Execute Workflow with a _loop_ sub-workflow
	const nextNode = nodes[index + 1];
	if (nextNode.kind === 'leaf' && nextNode.node.type === 'n8n-nodes-base.executeWorkflow') {
		const loopBody = ctx.loopBodies.get(nextNode.node.name);
		if (loopBody) {
			return {
				iterable,
				itemVar: loopBody.loopVar,
				splitterNodeName: current.node.name,
				loopStart: index + 1,
				loopEnd: index + 1,
				loopBodyCode: loopBody.body,
			};
		}
	}

	// Old pattern: loop body = consecutive non-executeOnce nodes after the splitter,
	// or nodes up to an aggregate node (legacy)
	let loopEnd = index; // default: no loop body nodes
	for (let j = index + 1; j < nodes.length; j++) {
		const n = nodes[j];
		// Aggregate nodes are legacy end-of-loop markers
		if (n.kind === 'leaf' && n.node.type === 'n8n-nodes-base.aggregate') {
			// loopEnd stays at the node before the aggregate
			break;
		}
		// Per-item nodes lack executeOnce — they're part of the loop body
		if (n.kind === 'leaf' && !n.node.json.executeOnce) {
			loopEnd = j;
		} else if (n.kind === 'ifElse' || n.kind === 'switchCase') {
			// Control flow nodes inside loops also lack executeOnce marker
			// Check if any contained node lacks executeOnce
			const ifNode = n.kind === 'ifElse' ? n.ifNode : undefined;
			if (ifNode && !ifNode.json.executeOnce) {
				loopEnd = j;
			} else {
				break;
			}
		} else {
			// Hit an executeOnce node → end of loop body
			break;
		}
	}

	if (loopEnd < index + 1) return null; // No loop body found

	return {
		iterable,
		itemVar,
		splitterNodeName: current.node.name,
		loopStart: index + 1,
		loopEnd,
	};
}

function compositeTreeHasRespondNode(node: CompositeNode): boolean {
	if (node.kind === 'leaf') {
		return node.node.type === 'n8n-nodes-base.respondToWebhook';
	}
	if (node.kind === 'chain') {
		return node.nodes.some(compositeTreeHasRespondNode);
	}
	if (node.kind === 'ifElse') {
		const inTrue = node.trueBranch
			? Array.isArray(node.trueBranch)
				? node.trueBranch.some(compositeTreeHasRespondNode)
				: compositeTreeHasRespondNode(node.trueBranch)
			: false;
		const inFalse = node.falseBranch
			? Array.isArray(node.falseBranch)
				? node.falseBranch.some(compositeTreeHasRespondNode)
				: compositeTreeHasRespondNode(node.falseBranch)
			: false;
		return inTrue || inFalse;
	}
	if (node.kind === 'switchCase') {
		return node.cases.some((c) =>
			c
				? Array.isArray(c)
					? c.some(compositeTreeHasRespondNode)
					: compositeTreeHasRespondNode(c)
				: false,
		);
	}
	return false;
}

function isMultiLine(node: SemanticNode, ctx: SimplifiedGenContext): boolean {
	if (node.type === 'n8n-nodes-base.httpRequest') {
		const params = node.json.parameters ?? {};
		const jsonBody = params.jsonBody as string | undefined;
		const hasBody = !!(jsonBody && params.sendBody);
		const hasAuth = !!reverseCredentials(node);
		const hasAssignment = ctx.nodeNameToVarName.has(node.name);
		return hasAssignment || hasBody || hasAuth;
	}
	if (node.type === 'n8n-nodes-base.code') return true;
	if (node.type === 'n8n-nodes-base.set') return true;
	return false;
}

function setTriggerType(node: SemanticNode, ctx: SimplifiedGenContext): void {
	const key = NODE_TYPE_TO_TRIGGER[node.type] ?? 'manual';
	ctx.triggerType = key as typeof ctx.triggerType;
}

// ─── Leaf ────────────────────────────────────────────────────────────────────

function visitLeaf(leaf: LeafNode, ctx: SimplifiedGenContext): void {
	const node = leaf.node;
	if (isTrigger(node)) {
		setTriggerType(node, ctx);
		emitTriggerHeader(node, ctx);
		ctx.indent++;
		ctx.indent--;
		emit(ctx, '});');
		return;
	}

	// Skip Set nodes that are sub-function parameter setups
	if (node.type === 'n8n-nodes-base.set') {
		for (const fn of ctx.subFunctions.values()) {
			if (fn.setNodeNames.has(node.name)) return;
		}
		// Skip Set nodes for try/catch sub-workflows
		for (const tc of ctx.tryCatchBodies.values()) {
			if (tc.setNodeNames.has(node.name)) return;
		}
	}

	// Skip loop body Execute Workflow nodes — handled by for-of pattern
	if (node.type === 'n8n-nodes-base.executeWorkflow' && ctx.loopBodies.has(node.name)) {
		return;
	}

	// Handle __tryCatch_ sub-workflow exec nodes: emit try { body } catch { errorHandler }
	if (node.type === 'n8n-nodes-base.executeWorkflow' && ctx.tryCatchBodies.has(node.name)) {
		const tcInfo = ctx.tryCatchBodies.get(node.name)!;
		emit(ctx, 'try {');
		ctx.indent++;
		for (const line of tcInfo.body.split('\n')) {
			if (line.trim() === '') {
				emit(ctx, '');
			} else {
				emit(ctx, line);
			}
		}
		ctx.indent--;
		if (leaf.errorHandler) {
			emit(ctx, '} catch {');
			ctx.indent++;
			visitComposite(leaf.errorHandler, ctx);
			ctx.indent--;
			emit(ctx, '}');
		} else {
			emit(ctx, '} catch {}');
		}
		return;
	}

	// Emit sub-function calls for ExecuteWorkflow nodes with inline workflowJson
	if (node.type === 'n8n-nodes-base.executeWorkflow') {
		const funcName = ctx.execToFunc.get(node.name);
		const fn = funcName ? ctx.subFunctions.get(funcName) : undefined;
		if (fn) {
			emitSubFunctionCall(node, fn, ctx);
			return;
		}
	}

	// Handle single-node try/catch with error handler at the visitLeaf level
	const onError = node.json.onError as string | undefined;
	const hasErrorHandler = leaf.errorHandler && onError === 'continueErrorOutput';

	if (hasErrorHandler) {
		// Suppress the inner try/catch wrapping in emitHttpNode/emitAiNode
		ctx.suppressTryCatch = true;

		// Emit try { <node call> } catch { <error handler> }
		const assignedVar = ctx.nodeNameToVarName.get(node.name);
		if (assignedVar && !ctx.codeNodeVars.has(assignedVar)) {
			emit(ctx, `let ${assignedVar} = null;`);
		}
		emit(ctx, 'try {');
		ctx.indent++;
		emitLeafByType(node, ctx);
		ctx.indent--;
		emit(ctx, '} catch {');
		ctx.indent++;
		visitComposite(leaf.errorHandler!, ctx);
		ctx.indent--;
		emit(ctx, '}');

		ctx.suppressTryCatch = false;
		return;
	}

	emitLeafByType(node, ctx);
}

function emitLeafByType(node: SemanticNode, ctx: SimplifiedGenContext): void {
	switch (node.type) {
		case 'n8n-nodes-base.aggregate':
			// Aggregate nodes are compiler artifacts — skip silently
			return;
		case 'n8n-nodes-base.httpRequest':
			emitHttpNode(node, ctx);
			break;
		case 'n8n-nodes-base.set':
			emitSetNode(node, ctx);
			break;
		case 'n8n-nodes-base.code':
			emitCodeNode(node, ctx);
			break;
		case 'n8n-nodes-base.respondToWebhook':
			emitRespondNode(node, ctx);
			break;
		case '@n8n/n8n-nodes-langchain.agent':
			emitAiNode(node, ctx);
			break;
		case 'n8n-nodes-base.executeWorkflow':
			emitWorkflowNode(node, ctx);
			break;
		default:
			break;
	}
}

// ─── HTTP Node ───────────────────────────────────────────────────────────────

function emitHttpNode(node: SemanticNode, ctx: SimplifiedGenContext): void {
	// Emit @example pin data annotation if present
	const pinData = ctx.workflowPinData[node.name];
	if (pinData) {
		emit(ctx, `/** @example ${JSON.stringify(pinData)} */`);
	}

	const params = node.json.parameters ?? {};
	const method = ((params.method as string) ?? 'GET').toLowerCase();
	const url = (params.url as string) ?? '';

	const assignedVar = ctx.nodeNameToVarName.get(node.name);

	const args: string[] = [`'${url}'`];

	// Body
	const jsonBody = params.jsonBody as string | undefined;
	if (jsonBody && params.sendBody) {
		args.push(formatJsonBody(jsonBody, ctx));
	}

	// Credentials
	const credStr = reverseCredentials(node);
	if (credStr) {
		args.push(credStr);
	}

	// onError annotation
	const onError = node.json.onError as string | undefined;
	const isTryCatch = onError === 'continueErrorOutput' && !ctx.suppressTryCatch;
	if (onError === 'continueRegularOutput') {
		emit(ctx, '// @onError continue');
	}

	// try/catch pattern: emit variable declaration before try block
	if (isTryCatch) {
		if (assignedVar && !ctx.codeNodeVars.has(assignedVar)) {
			emit(ctx, `let ${assignedVar} = null;`);
		}
		emit(ctx, 'try {');
		ctx.indent++;
	}

	const prefix =
		(isTryCatch || ctx.suppressTryCatch) && assignedVar
			? `${assignedVar} = await `
			: assignedVar
				? `const ${assignedVar} = await `
				: 'await ';
	const fnCall = `http.${method}`;

	const inline = `${prefix}${fnCall}(${args.join(', ')});`;
	if (inline.length < 80 && !inline.includes('\n')) {
		emit(ctx, inline);
	} else if (args.length >= 2 && jsonBody && params.sendBody) {
		emitAttachedBodyCall(ctx, prefix, fnCall, args);
	} else if (args.length === 2 && !jsonBody && credStr) {
		// URL + auth (no body) — attached options format
		const attachedFirstLine = `${prefix}${fnCall}(${args[0]}, {`;
		const totalLen = attachedFirstLine.length + ctx.indent;
		if (totalLen <= 102) {
			const inner = credStr.slice(2, -2).trim();
			emit(ctx, `${prefix}${fnCall}(${args[0]}, {`);
			ctx.indent++;
			emit(ctx, `${inner},`);
			ctx.indent--;
			emit(ctx, '});');
		} else {
			emit(ctx, inline);
		}
	} else {
		emit(ctx, inline);
	}

	if (isTryCatch) {
		ctx.indent--;
		emit(ctx, '} catch {}');
	}
}

function emitAttachedBodyCall(
	ctx: SimplifiedGenContext,
	prefix: string,
	fnCall: string,
	args: string[],
): void {
	const urlArg = args[0];
	const bodyStr = args[1];
	const authArg = args[2]; // may be undefined

	if (bodyStr.startsWith('{') && !bodyStr.includes('\n')) {
		const innerContent = bodyStr.slice(2, -2).trim();
		emit(ctx, `${prefix}${fnCall}(${urlArg}, {`);
		ctx.indent++;
		emit(ctx, `${innerContent},`);
		ctx.indent--;
		if (authArg) {
			emit(ctx, `}, ${authArg});`);
		} else {
			emit(ctx, '});');
		}
	} else {
		// Fallback: inline
		emit(ctx, `${prefix}${fnCall}(${args.join(', ')});`);
	}
}

function formatJsonBody(jsonStr: string, ctx: SimplifiedGenContext): string {
	// Try resolving as expression first (e.g. ={{ $('Node').first().json }})
	const resolved = resolveExpression(jsonStr, ctx);
	if (resolved !== null) return resolved;

	try {
		const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
		return formatObjectWithExpressions(parsed, ctx);
	} catch {
		return `'${jsonStr.replace(/'/g, "\\'")}'`;
	}
}

function formatObjectWithExpressions(
	obj: Record<string, unknown>,
	ctx: SimplifiedGenContext,
): string {
	const entries = Object.entries(obj).map(([key, val]) => {
		const formattedKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `'${key}'`;
		return `${formattedKey}: ${formatValueWithExpressions(val, ctx)}`;
	});
	return `{ ${entries.join(', ')} }`;
}

function formatValueWithExpressions(val: unknown, ctx: SimplifiedGenContext): string {
	if (typeof val === 'string') {
		const resolved = resolveExpression(val, ctx);
		if (resolved !== null) return resolved;
		return `'${val.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
	}
	if (typeof val === 'number' || typeof val === 'boolean') return String(val);
	if (val === null) return 'null';
	if (Array.isArray(val)) {
		return `[${val.map((v) => formatValueWithExpressions(v, ctx)).join(', ')}]`;
	}
	if (typeof val === 'object') {
		return formatObjectWithExpressions(val as Record<string, unknown>, ctx);
	}
	return String(val);
}

// ─── Expression Resolution ───────────────────────────────────────────────────

function resolveExpression(value: string, ctx: SimplifiedGenContext): string | null {
	// Match ={{ $('NodeName').first().json.prop.path }} or ={{ $('NodeName').first().json[0] }}
	const namedRef = /^={{ \$\('([^']+)'\)\.first\(\)\.json([.[].+) }}$/;
	let match = namedRef.exec(value);
	if (match) {
		const nodeName = match[1];
		const rawSuffix = match[2]; // e.g. ".prop.path" or "[0]"
		// Normalize: strip leading dot for property access, keep brackets
		const propPath = rawSuffix.startsWith('.') ? rawSuffix.slice(1) : rawSuffix;
		const firstProp = propPath.split('.')[0].split('[')[0];
		if (ctx.codeNodeVars.has(firstProp)) return propPath;
		const varName = ctx.nodeNameToVarName.get(nodeName);
		if (varName) {
			// When the Set node's variable name matches the property being accessed,
			// return just the variable name to avoid duplication (e.g. searchInput.searchInput)
			if (varName === propPath) return varName;
			if (varName === firstProp) return propPath;
			// For bracket access, append directly without dot
			if (rawSuffix.startsWith('[')) return `${varName}${rawSuffix}`;
			return `${varName}.${propPath}`;
		}
		if (ctx.triggerType === 'webhook') {
			if (rawSuffix.startsWith('[')) return `body${rawSuffix}`;
			return `body.${propPath}`;
		}
		return propPath;
	}

	// Match ={{ $('NodeName').first().json }}
	const namedRefFull = /^={{ \$\('([^']+)'\)\.first\(\)\.json }}$/;
	match = namedRefFull.exec(value);
	if (match) {
		const varName = ctx.nodeNameToVarName.get(match[1]);
		return varName ?? match[1];
	}

	// Match ={{ $json.prop }}
	const jsonRef = /^={{ \$json\.(.+?) }}$/;
	match = jsonRef.exec(value);
	if (match) {
		const prop = match[1];
		const firstSegment = prop.split('.')[0].split('[')[0];
		if (ctx.triggerType === 'webhook' && !ctx.codeNodeVars.has(firstSegment)) return `body.${prop}`;
		return prop;
	}

	return null;
}

// ─── Credentials ─────────────────────────────────────────────────────────────

function reverseCredentials(node: SemanticNode): string | null {
	const credentials = node.json.credentials as Record<string, { name: string }> | undefined;
	if (!credentials) return null;

	const params = node.json.parameters ?? {};
	const genericAuthType = params.genericAuthType as string | undefined;

	// Try genericAuthType first, then fall back to checking credential keys
	const credType =
		(genericAuthType && credentials[genericAuthType] ? genericAuthType : null) ??
		Object.keys(credentials).find((k) => CREDENTIAL_TO_AUTH_TYPE[k]) ??
		null;
	if (!credType) return null;

	const authType = CREDENTIAL_TO_AUTH_TYPE[credType];
	const credName = credentials[credType].name;
	return `{ auth: { type: '${authType}', credential: '${credName}' } }`;
}

// ─── Set Node ────────────────────────────────────────────────────────────────

function emitSetNode(node: SemanticNode, ctx: SimplifiedGenContext): void {
	const assignments =
		(
			node.json.parameters?.assignments as {
				assignments?: Array<{ name: string; type: string; value: unknown }>;
			}
		)?.assignments ?? [];

	for (const assignment of assignments) {
		const value = formatLiteral(assignment.value, assignment.type);
		emit(ctx, `const ${assignment.name} = ${value};`);
	}
}

function formatLiteral(value: unknown, type?: string): string {
	if (type === 'string' || typeof value === 'string') {
		return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
	}
	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}
	return JSON.stringify(value);
}

// ─── Code Node ───────────────────────────────────────────────────────────────

function emitCodeNode(node: SemanticNode, ctx: SimplifiedGenContext): void {
	const jsCode = (node.json.parameters?.jsCode as string) ?? '';

	const lines = jsCode.split('\n');
	const userLines: string[] = [];

	for (const line of lines) {
		if (line.startsWith('// From:')) continue;
		// Replace $('NodeName').all().map(i => i.json) with upstream variable reference
		const importMatch = /^const (\w+) = \$\('([^']+)'\)\.all\(\)\.map\(i => i\.json\);?$/.exec(
			line.trim(),
		);
		if (importMatch) {
			const localVar = importMatch[1];
			const sourceName = importMatch[2];
			// Drop code-to-code imports — they're compiler artifacts
			const referencedNode = ctx.graph.nodes.get(sourceName);
			if (referencedNode && referencedNode.type === 'n8n-nodes-base.code') {
				continue;
			}
			const upstreamVar = ctx.nodeNameToVarName.get(sourceName);
			if (upstreamVar && upstreamVar !== localVar) {
				userLines.push(`const ${localVar} = ${upstreamVar};`);
			}
			// If upstreamVar === localVar or no upstream, just skip the import
			continue;
		}
		if (/^return \[\{ json: \{.*\} \}\];?$/.test(line.trim())) continue;
		// Strip return items.map(x => ({ json: x })) — this becomes a for-of loop
		if (/^return .+?\.map\(\w+ => \(\{ json: \w+ \}\)\);?$/.test(line.trim())) continue;
		userLines.push(line);
	}

	// Strip base indentation
	let minIndent = Infinity;
	for (const line of userLines) {
		if (!line.trim()) continue;
		const leadingTabs = line.match(/^\t*/)?.[0].length ?? 0;
		if (leadingTabs < minIndent) minIndent = leadingTabs;
	}
	if (!Number.isFinite(minIndent)) minIndent = 0;

	for (const line of userLines) {
		if (line.trim()) {
			emit(ctx, line.slice(minIndent));
		} else {
			emit(ctx, '');
		}
	}
}

// ─── Respond Node ────────────────────────────────────────────────────────────

function emitRespondNode(node: SemanticNode, ctx: SimplifiedGenContext): void {
	const params = node.json.parameters ?? {};
	const options = (params.options ?? {}) as Record<string, unknown>;
	const status = (options.responseCode as number) ?? (params.responseCode as number) ?? 200;
	const bodyStr = params.responseBody as string | undefined;

	// Read headers from options.responseHeaders fixedCollection format, with fallback to legacy flat format
	let headers: Record<string, string> | undefined;
	const optHeaders = options.responseHeaders as
		| { entries?: Array<{ name: string; value: string }> }
		| undefined;
	if (optHeaders?.entries && optHeaders.entries.length > 0) {
		headers = {};
		for (const entry of optHeaders.entries) {
			headers[entry.name] = entry.value;
		}
	} else {
		headers = params.responseHeaders as Record<string, string> | undefined;
	}

	const args: string[] = [`status: ${status}`];

	if (headers && Object.keys(headers).length > 0) {
		args.push(`headers: ${formatObjectWithExpressions(headers, ctx)}`);
	}

	if (bodyStr) {
		try {
			const parsed = JSON.parse(bodyStr) as Record<string, unknown>;
			args.push(`body: ${formatObjectWithExpressions(parsed, ctx)}`);
		} catch {
			args.push(`body: '${bodyStr.replace(/'/g, "\\'")}'`);
		}
	}

	// Emit @example pin data annotation
	const respondPinData = ctx.workflowPinData[node.name];
	if (respondPinData) {
		emit(ctx, `/** @example ${JSON.stringify(respondPinData)} */`);
	}

	emit(ctx, `respond({ ${args.join(', ')} });`);
}

// ─── AI Node ─────────────────────────────────────────────────────────────────

function emitAiNode(node: SemanticNode, ctx: SimplifiedGenContext): void {
	// Emit @example pin data annotation if present
	const pinData = ctx.workflowPinData[node.name];
	if (pinData) {
		emit(ctx, `/** @example ${JSON.stringify(pinData)} */`);
	}

	const params = node.json.parameters ?? {};
	const prompt = (params.text as string) ?? '';

	// Find language model subnode
	let model = 'gpt-4o-mini';
	for (const sub of node.subnodes) {
		if (sub.connectionType === 'ai_languageModel') {
			const subnodeNode = ctx.graph.nodes.get(sub.subnodeName);
			if (subnodeNode) {
				const subParams = subnodeNode.json.parameters ?? {};
				const modelParam = subParams.model as { value?: string } | string | undefined;
				if (typeof modelParam === 'object' && modelParam?.value) {
					model = modelParam.value;
				} else if (typeof modelParam === 'string') {
					model = modelParam;
				}
			}
		}
	}

	// Build options for subnodes (outputParser, tools, memory)
	const options: string[] = [];
	const tools: string[] = [];
	for (const sub of node.subnodes) {
		if (sub.connectionType === 'ai_outputParser') {
			const subnodeNode = ctx.graph.nodes.get(sub.subnodeName);
			if (subnodeNode) {
				const subParams = subnodeNode.json.parameters ?? {};
				if (subnodeNode.type === '@n8n/n8n-nodes-langchain.outputParserStructured') {
					const schema = subParams.schema as Record<string, unknown> | undefined;
					if (schema) {
						const schemaStr = formatSchemaForSimplified(schema);
						options.push(`outputParser: { type: 'structured', schema: ${schemaStr} }`);
					}
				}
			}
		}
		if (sub.connectionType === 'ai_tool') {
			const subnodeNode = ctx.graph.nodes.get(sub.subnodeName);
			if (subnodeNode) {
				const subParams = subnodeNode.json.parameters ?? {};
				if (subnodeNode.type === '@n8n/n8n-nodes-langchain.toolHttpRequest') {
					const toolName = (subParams.name as string) ?? 'tool';
					const toolUrl = (subParams.url as string) ?? '';
					tools.push(`{ type: 'httpRequest', name: '${toolName}', url: '${toolUrl}' }`);
				} else if (subnodeNode.type === '@n8n/n8n-nodes-langchain.toolCode') {
					const toolName = (subParams.name as string) ?? 'tool';
					const jsCode = (subParams.jsCode as string) ?? '';
					tools.push(
						`{ type: 'code', name: '${toolName}', code: '${jsCode.replace(/'/g, "\\'")}' }`,
					);
				}
			}
		}
		if (sub.connectionType === 'ai_memory') {
			const subnodeNode = ctx.graph.nodes.get(sub.subnodeName);
			if (subnodeNode) {
				const subParams = subnodeNode.json.parameters ?? {};
				if (subnodeNode.type === '@n8n/n8n-nodes-langchain.memoryBufferWindow') {
					const contextLength = (subParams.contextWindowLength as number) ?? 5;
					options.push(`memory: { type: 'bufferWindow', contextLength: ${contextLength} }`);
				}
			}
		}
	}
	if (tools.length > 0) {
		options.push(`tools: [${tools.join(', ')}]`);
	}

	// onError annotation
	const onError = node.json.onError as string | undefined;
	const isTryCatch = onError === 'continueErrorOutput' && !ctx.suppressTryCatch;
	if (onError === 'continueRegularOutput') {
		emit(ctx, '// @onError continue');
	}

	const assignedVar = ctx.nodeNameToVarName.get(node.name);

	// try/catch pattern
	if (isTryCatch) {
		if (assignedVar && !ctx.codeNodeVars.has(assignedVar)) {
			emit(ctx, `let ${assignedVar} = null;`);
		}
		emit(ctx, 'try {');
		ctx.indent++;
	}

	const prefix =
		(isTryCatch || ctx.suppressTryCatch) && assignedVar
			? `${assignedVar} = await `
			: assignedVar
				? `const ${assignedVar} = await `
				: 'await ';

	if (options.length > 0) {
		const optStr = `{ ${options.join(', ')} }`;
		emit(ctx, `${prefix}ai.chat('${model}', '${prompt}', ${optStr});`);
	} else {
		emit(ctx, `${prefix}ai.chat('${model}', '${prompt}');`);
	}

	if (isTryCatch) {
		ctx.indent--;
		emit(ctx, '} catch {}');
	}
}

function formatSchemaForSimplified(schema: Record<string, unknown>): string {
	const entries = Object.entries(schema).map(([key, val]) => {
		if (typeof val === 'string') return `${key}: '${val}'`;
		return `${key}: ${JSON.stringify(val)}`;
	});
	return `{ ${entries.join(', ')} }`;
}

// ─── Workflow Node ───────────────────────────────────────────────────────────

function emitWorkflowNode(node: SemanticNode, ctx: SimplifiedGenContext): void {
	const params = node.json.parameters ?? {};
	const workflowId = (params.workflowId as { value?: string })?.value ?? '';

	const assignedVar = ctx.nodeNameToVarName.get(node.name);
	const prefix = assignedVar ? `const ${assignedVar} = await ` : 'await ';

	emit(ctx, `${prefix}workflow.run('${workflowId}');`);
}

function emitSubFunctionCall(
	node: SemanticNode,
	fn: SubFunctionInfo,
	ctx: SimplifiedGenContext,
): void {
	// Find the preceding Set node to extract argument values
	const args: string[] = [];
	for (const sources of node.inputSources.values()) {
		for (const source of sources) {
			const predNode = ctx.graph.nodes.get(source.from);
			if (!predNode || predNode.type !== 'n8n-nodes-base.set') continue;
			if (!fn.setNodeNames.has(predNode.name)) continue;

			const assignments = (
				predNode.json.parameters?.assignments as {
					assignments?: Array<{ name: string; value: unknown }>;
				}
			)?.assignments;
			if (assignments) {
				for (const a of assignments) {
					const resolved = resolveExpression(String(a.value), ctx);
					args.push(resolved ?? formatLiteral(a.value, 'string'));
				}
			}
		}
	}

	const assignedVar = ctx.nodeNameToVarName.get(node.name);
	const prefix = assignedVar ? `const ${assignedVar} = await ` : 'await ';
	emit(ctx, `${prefix}${fn.name}(${args.join(', ')});`);
}

// ─── If/Else ─────────────────────────────────────────────────────────────────

function visitIfElse(node: IfElseCompositeNode, ctx: SimplifiedGenContext): void {
	const condition = extractConditionString(node.ifNode, ctx);
	emit(ctx, `if (${condition}) {`);
	ctx.indent++;
	if (node.trueBranch) {
		if (Array.isArray(node.trueBranch)) {
			for (const branch of node.trueBranch) visitComposite(branch, ctx);
		} else {
			visitComposite(node.trueBranch, ctx);
		}
	}
	ctx.indent--;

	if (node.falseBranch) {
		emit(ctx, '} else {');
		ctx.indent++;
		if (Array.isArray(node.falseBranch)) {
			for (const branch of node.falseBranch) visitComposite(branch, ctx);
		} else {
			visitComposite(node.falseBranch, ctx);
		}
		ctx.indent--;
	}
	emit(ctx, '}');
}

function extractConditionString(node: SemanticNode, ctx: SimplifiedGenContext): string {
	const params = node.json.parameters ?? {};
	const options = params.options as { version?: number } | undefined;
	const version = options?.version ?? 2;

	if (version >= 2) {
		const condBlock = params.conditions as {
			options?: { caseSensitive?: boolean; leftValue?: string };
			conditions?: Array<{
				leftValue?: string;
				rightValue?: string;
				operator?: { type?: string; operation?: string; singleValue?: boolean };
			}>;
			combinator?: string;
		};
		const condList = condBlock?.conditions;
		if (condList?.length) {
			const combinator = condBlock.combinator === 'or' ? ' || ' : ' && ';
			const parts = condList.map((cond) => {
				const left = resolveConditionExpr(cond.leftValue, ctx);
				const op = cond.operator;

				// Unary operators — check operation first, then singleValue
				if (op?.operation === 'notExists') return `!${left}`;
				if (op?.operation === 'exists' || op?.singleValue) return left;

				const right = resolveConditionExpr(cond.rightValue, ctx);
				const jsOp = mapOperator(op?.type ?? '', op?.operation ?? '');
				if (jsOp === '.includes') return `${left}.includes(${right})`;
				return `${left} ${jsOp} ${right}`;
			});
			return parts.length === 1 ? parts[0] : parts.join(combinator);
		}
	}

	return 'true';
}

function resolveConditionExpr(value: string | undefined, ctx: SimplifiedGenContext): string {
	if (!value) return "''";

	// n8n expression: ={{ $('NodeName').first().json.prop }} or {{ ... }}
	const exprMatch = /^=?\{\{\s*\$\('([^']+)'\)\.first\(\)\.json\.(.+?)\s*\}\}$/.exec(value);
	if (exprMatch) {
		const nodeName = exprMatch[1];
		const propPath = exprMatch[2];
		const firstProp = propPath.split('.')[0];
		if (ctx.codeNodeVars.has(firstProp)) return propPath;
		const varName = ctx.nodeNameToVarName.get(nodeName);
		if (varName) {
			if (varName === propPath) return varName;
			if (varName === firstProp) return propPath;
			return `${varName}.${propPath}`;
		}
		if (ctx.triggerType === 'webhook') return `body.${propPath}`;
		return propPath;
	}

	// Match ={{ $('NodeName').first().json }} (full object, no prop)
	const fullJsonRef = /^=?\{\{\s*\$\('([^']+)'\)\.first\(\)\.json\s*\}\}$/.exec(value);
	if (fullJsonRef) {
		const varName = ctx.nodeNameToVarName.get(fullJsonRef[1]);
		return varName ?? fullJsonRef[1];
	}

	// n8n expression: ={{ $json.prop }} or {{ $json.prop }}
	const jsonRef = /^=?\{\{\s*\$json\.(.+?)\s*\}\}$/.exec(value);
	if (jsonRef) {
		const prop = jsonRef[1];
		const firstSegment = prop.split('.')[0].split('[')[0];
		if (ctx.triggerType === 'webhook' && !ctx.codeNodeVars.has(firstSegment)) return `body.${prop}`;
		return prop;
	}

	// Literal string
	if (typeof value === 'string' && !value.startsWith('{{') && !value.startsWith('={{')) {
		return `'${value}'`;
	}

	return String(value);
}

function mapOperator(type: string, operation: string): string {
	if (type === 'string') {
		switch (operation) {
			case 'equals':
				return '===';
			case 'notEquals':
				return '!==';
			case 'contains':
				return '.includes';
			default:
				return '===';
		}
	}
	if (type === 'number') {
		switch (operation) {
			case 'equals':
				return '===';
			case 'notEquals':
				return '!==';
			case 'gt':
				return '>';
			case 'gte':
				return '>=';
			case 'lt':
				return '<';
			case 'lte':
				return '<=';
			default:
				return '===';
		}
	}
	if (type === 'boolean') {
		switch (operation) {
			case 'true':
				return '===';
			case 'false':
				return '!==';
			default:
				return '===';
		}
	}
	return '===';
}

// ─── Switch ──────────────────────────────────────────────────────────────────

function visitSwitchCase(node: SwitchCaseCompositeNode, ctx: SimplifiedGenContext): void {
	const params = node.switchNode.json.parameters ?? {};
	const rules = params.rules as {
		values?: Array<{
			conditions?: {
				conditions?: Array<{
					leftValue?: string;
					rightValue?: string;
					operator?: { type?: string; operation?: string };
				}>;
			};
		}>;
	};
	const values = rules?.values ?? [];

	// Extract discriminant from the first case's leftValue
	const firstLeft = values[0]?.conditions?.conditions?.[0]?.leftValue;
	const discriminant = firstLeft ? resolveConditionExpr(firstLeft, ctx) : 'value';

	emit(ctx, `switch (${discriminant}) {`);
	ctx.indent++;

	for (let i = 0; i < node.cases.length; i++) {
		const caseIdx = node.caseIndices[i];
		const branch = node.cases[i];

		// Check if this is the fallback/default case
		const isDefault = caseIdx >= values.length;

		if (isDefault) {
			emit(ctx, 'default:');
		} else {
			const rule = values[caseIdx];
			const cond = rule?.conditions?.conditions?.[0];
			const testValue = cond?.rightValue;
			const operatorType = cond?.operator?.type ?? 'string';
			let formattedValue: string;
			if (testValue === undefined) {
				formattedValue = `'case${caseIdx}'`;
			} else if (operatorType === 'boolean' || operatorType === 'number') {
				formattedValue = testValue;
			} else {
				formattedValue = `'${testValue}'`;
			}
			emit(ctx, `case ${formattedValue}:`);
		}

		ctx.indent++;
		if (branch) {
			if (Array.isArray(branch)) {
				for (const b of branch) visitComposite(b, ctx);
			} else {
				visitComposite(branch, ctx);
			}
		}
		emit(ctx, 'break;');
		ctx.indent--;
	}

	ctx.indent--;
	emit(ctx, '}');
}

// ─── SplitInBatches (for-of loop) ────────────────────────────────────────────

function visitSplitInBatches(node: SplitInBatchesCompositeNode, ctx: SimplifiedGenContext): void {
	// Find the iterable and item variable from the SIB node's input source
	const { iterable, itemVar } = extractLoopIterableInfo(node, ctx);

	// Map the SIB node name to the item variable so downstream expressions resolve
	ctx.nodeNameToVarName.set(node.sibNode.name, itemVar);

	emit(ctx, `for (const ${itemVar} of ${iterable}) {`);
	ctx.indent++;
	if (node.loopChain) {
		if (Array.isArray(node.loopChain)) {
			for (const branch of node.loopChain) visitComposite(branch, ctx);
		} else {
			visitComposite(node.loopChain, ctx);
		}
	}
	ctx.indent--;
	emit(ctx, '}');

	// Done chain (after loop)
	if (node.doneChain) {
		emit(ctx, '');
		if (Array.isArray(node.doneChain)) {
			for (const branch of node.doneChain) visitComposite(branch, ctx);
		} else {
			visitComposite(node.doneChain, ctx);
		}
	}
}

function extractLoopIterableInfo(
	node: SplitInBatchesCompositeNode,
	ctx: SimplifiedGenContext,
): { iterable: string; itemVar: string } {
	// Check the SIB node's input sources for the code node that produces items
	const sibNode = node.sibNode;

	for (const sources of sibNode.inputSources.values()) {
		for (const source of sources) {
			const sourceNode = ctx.graph.nodes.get(source.from);
			if (!sourceNode) continue;

			if (sourceNode.type === 'n8n-nodes-base.code') {
				const jsCode = (sourceNode.json.parameters?.jsCode as string) ?? '';
				const returnMatch = /return (.+?)\.map\((\w+)\s*=>\s*\(\{ json: \2 \}\)\);?/.exec(jsCode);
				if (returnMatch) {
					return { iterable: returnMatch[1], itemVar: returnMatch[2] };
				}
			}
		}
	}

	return { iterable: 'items', itemVar: 'item' };
}

// ─── Trigger Header ──────────────────────────────────────────────────────────

function isTrigger(node: SemanticNode): boolean {
	return node.annotations.isTrigger;
}

function emitTriggerHeader(
	node: SemanticNode,
	ctx: SimplifiedGenContext,
	hasRespond = false,
): void {
	const params = node.json.parameters ?? {};
	const triggerKey = NODE_TYPE_TO_TRIGGER[node.type] ?? 'manual';
	const { callbackName } = TRIGGER_TYPES[triggerKey];

	// Emit @example pin data annotation for non-schedule triggers
	if (triggerKey !== 'schedule') {
		const pinData = ctx.workflowPinData[node.name];
		if (pinData) {
			emit(ctx, `/** @example ${JSON.stringify(pinData)} */`);
		}
	}

	switch (triggerKey) {
		case 'manual':
			emit(ctx, `${callbackName}(async () => {`);
			break;

		case 'schedule': {
			const schedule = reverseScheduleParams(params);
			emit(ctx, `${callbackName}(${schedule}, async () => {`);
			break;
		}

		case 'webhook': {
			const method = (params.httpMethod as string) ?? 'POST';
			const path = (params.path as string) ?? '/';
			const cbParams = hasRespond ? '{ body, respond }' : '{ body }';
			emit(
				ctx,
				`${callbackName}({ method: '${method}', path: '${path}' }, async (${cbParams}) => {`,
			);
			break;
		}

		case 'error':
			emit(ctx, `${callbackName}(async ({ error, workflow }) => {`);
			break;

		default:
			emit(ctx, `${TRIGGER_TYPES.manual.callbackName}(async () => {`);
			break;
	}
}

function reverseScheduleParams(params: Record<string, unknown>): string {
	return fromScheduleRule(params);
}
