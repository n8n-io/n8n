import type { INode } from 'n8n-workflow';

const WAIT_NODE_TYPE = 'n8n-nodes-base.wait';

/**
 * Resume modes that model the passage of time. An unknown value, such as an
 * expression, may resolve to an external-event mode, so it is left unchanged.
 */
const TIME_RESUME_MODES = new Set(['timeInterval', 'specificTime']);

function isTimeBasedWait(node: INode): boolean {
	if (node.disabled || node.type !== WAIT_NODE_TYPE) return false;
	const resume = node.parameters?.resume;
	// A missing `resume` takes the node default, which is a time interval.
	return resume === undefined || (typeof resume === 'string' && TIME_RESUME_MODES.has(resume));
}

/**
 * Remove the delay from time-based Wait nodes, so a test run does not sleep
 * for the real duration. The nodes still run, so they pass their input
 * through and execution order stays observable. Returns new node objects and
 * leaves the input unchanged.
 */
export function skipTimeBasedWaits(nodes: INode[]): {
	nodes: INode[];
	skippedNodeNames: string[];
} {
	const skippedNodeNames: string[] = [];
	const result = nodes.map((node) => {
		if (!isTimeBasedWait(node)) return node;
		skippedNodeNames.push(node.name);
		return {
			...node,
			parameters: { ...node.parameters, resume: 'timeInterval', amount: 0, unit: 'seconds' },
		};
	});
	return { nodes: result, skippedNodeNames };
}
