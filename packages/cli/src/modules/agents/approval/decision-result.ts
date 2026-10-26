import { parseAgentDecision } from '@n8n/api-types';
import { getChildNodes, UserError, type IRunData, type IConnections } from 'n8n-workflow';

/** A decision workflow must finish with one decision, including across branches. */
export function collectAgentDecision(runData: IRunData, connections?: IConnections) {
	const names = Object.keys(runData);
	const terminalNames = connections
		? names.filter((name) => getChildNodes(connections, name, 'main', 1).length === 0)
		: names.slice(-1);
	if (terminalNames.length !== 1) {
		throw new UserError('The decision workflow must return one decision from one terminal node');
	}
	const runs = runData[terminalNames[0]];
	const items = runs.flatMap((run) => run.data?.main.flatMap((branch) => branch ?? []) ?? []);
	if (items.length !== 1) {
		throw new UserError('The decision workflow must return exactly one decision item');
	}
	const decision = parseAgentDecision(items[0].json);
	return {
		approved: decision.approved,
		...(decision.reason && { reason: decision.reason.slice(0, 1000) }),
	};
}
