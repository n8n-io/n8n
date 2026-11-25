import { UserError } from '@n8n/errors';
import { parseAgentDecision } from '@n8n/api-types';
import type {
	IConnections,
	INodeConnections,
	INodeExecutionData,
	IRunData,
	ITaskData,
} from 'n8n-workflow';

/**
 * Items from the outputs of one node that have no outgoing connection.
 * Without connections, all main outputs count.
 */
function terminalItems(runs: ITaskData[], outputs?: INodeConnections): INodeExecutionData[] {
	// A sub-node sends its data to a parent node, so its output is not a result.
	const isSubNode =
		outputs !== undefined &&
		Object.entries(outputs).some(
			([type, branches]) => type !== 'main' && branches.some((branch) => (branch?.length ?? 0) > 0),
		);
	if (isSubNode) return [];
	return runs.flatMap(
		(run) =>
			run.data?.main?.flatMap((items, index) =>
				outputs && (outputs.main?.[index]?.length ?? 0) > 0 ? [] : (items ?? []),
			) ?? [],
	);
}

/** A decision workflow must finish with one decision, including across branches. */
export function collectAgentDecision(runData: IRunData, connections?: IConnections) {
	const results = Object.entries(runData)
		.map(([name, runs]) => terminalItems(runs, connections ? (connections[name] ?? {}) : undefined))
		.filter((items) => items.length > 0);
	const terminal = connections ? results : results.slice(-1);
	if (terminal.length !== 1) {
		throw new UserError('The decision workflow must return one decision from one terminal node');
	}
	const [items] = terminal;
	if (items.length !== 1) {
		throw new UserError('The decision workflow must return exactly one decision item');
	}
	const decision = parseAgentDecision(items[0].json);
	return {
		approved: decision.approved,
		...(decision.reason && { reason: decision.reason.slice(0, 1000) }),
	};
}
