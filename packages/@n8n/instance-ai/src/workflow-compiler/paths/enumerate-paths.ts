import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { isTriggerNodeType } from '../../tools/workflows/workflow-json-utils';

/** One branch decision on a path: which output of a routing node was taken. */
export interface PathDecision {
	node: string;
	outputIndex: number;
	label: string;
}

export interface ExecutionPath {
	id: string;
	trigger: string;
	decisions: PathDecision[];
	/** Nodes in visit order along this path. */
	nodes: string[];
	/** Terminal node of the path. */
	end: string;
}

export interface PathEnumerationOptions {
	/** Only enumerate paths that start at this trigger. */
	triggerNodeName?: string;
	/** Upper bound on emitted paths; the enumeration is breadth-first over decisions. */
	maxPaths?: number;
}

const IF_TYPE = 'n8n-nodes-base.if';
const SWITCH_TYPE = 'n8n-nodes-base.switch';
const LOOP_TYPE = 'n8n-nodes-base.splitInBatches';
const FILTER_TYPE = 'n8n-nodes-base.filter';

type NodeJSON = WorkflowJSON['nodes'][number];

function outputLabel(node: NodeJSON, outputIndex: number, outputCount: number): string {
	if (node.type === IF_TYPE || node.type === FILTER_TYPE)
		return outputIndex === 0 ? 'true' : 'false';
	if (node.type === LOOP_TYPE) return outputIndex === 0 ? 'done' : 'loop';
	if (node.type === SWITCH_TYPE) {
		const rules = node.parameters?.rules;
		const values =
			typeof rules === 'object' && rules !== null
				? (rules as { values?: Array<{ outputKey?: unknown }> }).values
				: undefined;
		const key = values?.[outputIndex]?.outputKey;
		if (typeof key === 'string' && key) return key;
		return outputIndex >= (values?.length ?? 0) ? 'fallback' : `case ${outputIndex}`;
	}
	if (node.onError === 'continueErrorOutput') return outputIndex === 0 ? 'success' : 'error';
	return outputCount > 1 ? `output ${outputIndex}` : 'main';
}

/** A partial path: the trigger, the decisions taken so far and the nodes visited (the last one is current). */
interface Frame {
	trigger: string;
	decisions: PathDecision[];
	visited: string[];
}

/**
 * Enumerates the distinct execution paths through the main-connection graph.
 * Every node with more than one connected main output is a decision point;
 * a path is the sequence of decisions taken from a trigger to a terminal
 * node. Loops are followed at most once so enumeration terminates.
 *
 * The verifier uses the result as the "system-one" view of what a workflow
 * can do: each path becomes a fixture target, and coverage is measured as the
 * share of paths an execution actually exercised.
 */
export function enumerateExecutionPaths(
	workflow: WorkflowJSON,
	options: PathEnumerationOptions = {},
): ExecutionPath[] {
	const maxPaths = options.maxPaths ?? 64;
	const nodesByName = new Map<string, NodeJSON>();
	for (const node of workflow.nodes)
		if (node.name && !node.disabled) nodesByName.set(node.name, node);

	const triggers = [...nodesByName.values()].filter(
		(node) =>
			isTriggerNodeType(node.type) &&
			(!options.triggerNodeName || node.name === options.triggerNodeName),
	);

	const paths: ExecutionPath[] = [];
	const finish = ({ trigger, decisions, visited: nodes }: Frame) =>
		paths.push({
			id: pathId(trigger, decisions),
			trigger,
			decisions,
			nodes,
			end: nodes[nodes.length - 1],
		});
	const queue: Frame[] = triggers.map((trigger) => {
		const name = trigger.name ?? '';
		return { trigger: name, decisions: [], visited: [name] };
	});

	while (queue.length > 0 && paths.length < maxPaths) {
		const frame = queue.shift();
		if (!frame) break;
		const current = frame.visited[frame.visited.length - 1];
		const node = nodesByName.get(current);
		if (!node) continue;
		const slots = (workflow.connections[current]?.main ?? []).map((slot) =>
			(slot ?? []).filter((c) => nodesByName.has(c.node)),
		);
		const connected = slots
			.map((slot, index) => ({ slot, index }))
			.filter(({ slot }) => slot.length > 0);
		if (connected.length === 0) {
			finish(frame);
			continue;
		}
		for (const { slot, index } of connected) {
			const decisions =
				connected.length > 1
					? [
							...frame.decisions,
							{ node: current, outputIndex: index, label: outputLabel(node, index, slots.length) },
						]
					: frame.decisions;
			// Fan-out to several targets on one output is one path per target so each terminal is covered.
			for (const target of slot) {
				const next = { ...frame, decisions, visited: [...frame.visited, target.node] };
				// Loop back edge: record the decision once and stop here.
				if (frame.visited.includes(target.node)) finish(next);
				else queue.push(next);
			}
		}
	}
	return dedupe(paths);
}

function pathId(trigger: string, decisions: readonly PathDecision[]): string {
	const taken = decisions.map((decision) => `${decision.node}=${decision.label}`);
	return [trigger, ...taken].join(' > ');
}

function dedupe(paths: ExecutionPath[]): ExecutionPath[] {
	const seen = new Set<string>();
	return paths.filter((path) => {
		const key = `${path.id}|${path.end}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

export interface PathCoverage {
	total: number;
	covered: number;
	/** Paths no execution exercised, with the first node that was not reached. */
	uncovered: Array<{ path: ExecutionPath; firstMissingNode: string }>;
}

/** Measures which enumerated paths a set of executions exercised. */
export function pathCoverage(
	paths: readonly ExecutionPath[],
	executedNodeSets: ReadonlyArray<ReadonlySet<string>>,
): PathCoverage {
	const uncovered: PathCoverage['uncovered'] = [];
	let covered = 0;
	for (const path of paths) {
		const exercised = executedNodeSets.some((executed) =>
			path.nodes.every((node) => executed.has(node)),
		);
		if (exercised) {
			covered += 1;
			continue;
		}
		// The execution that got furthest along the path names the first node it missed.
		const best = executedNodeSets.reduce<string | undefined>((missing, executed) => {
			const firstMissing = path.nodes.find((node) => !executed.has(node));
			if (!firstMissing) return missing;
			if (missing === undefined) return firstMissing;
			return path.nodes.indexOf(firstMissing) > path.nodes.indexOf(missing)
				? firstMissing
				: missing;
		}, undefined);
		uncovered.push({ path, firstMissingNode: best ?? path.nodes[0] });
	}
	return { total: paths.length, covered, uncovered };
}

/** Human-readable summary line for a coverage result. */
export function describePathCoverage(coverage: PathCoverage): string {
	if (coverage.total === 0) return 'No execution paths were enumerated.';
	const head = `${coverage.covered}/${coverage.total} execution paths exercised.`;
	if (coverage.uncovered.length === 0) return head;
	const details = coverage.uncovered
		.slice(0, 5)
		.map(({ path, firstMissingNode }) => {
			const decisions = path.decisions
				.map((decision) => `${decision.node} → ${decision.label}`)
				.join(', ');
			return `${decisions || path.trigger} (stops before "${firstMissingNode}")`;
		})
		.join('; ');
	return `${head} Not exercised: ${details}${coverage.uncovered.length > 5 ? '; …' : ''}`;
}
