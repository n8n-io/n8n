// ---------------------------------------------------------------------------
// Committing calls for the routing eval.
//
// A committing call is the first call that picks a route for the user's
// request. `--stop-on-route` ends the trial there. Every other call (skill and
// tool loading, docs, research, reads, and data-table schema setup) is
// exploration, so the run goes on.
// ---------------------------------------------------------------------------

import { DOMAIN_TOOL_IDS, ORCHESTRATION_TOOL_IDS } from '../../src/tools/tool-ids';

/** Only the orchestrator's calls pick a route; sub-agents act on its choice. */
export const ORCHESTRATOR_AGENT_ID = 'n8n-instance-agent';

/**
 * Reads, and schema-only setup: the Assistant often creates a table before it
 * builds a workflow. Row writes and table deletes pick a route.
 */
const DATA_TABLES_EXPLORATION_ACTIONS: ReadonlySet<string> = new Set([
	'list',
	'get',
	'query',
	'schema',
	'create',
	'add-column',
	'rename-column',
	'delete-column',
]);

const WORKFLOWS_READ_ACTIONS: ReadonlySet<string> = new Set([
	'list',
	'get',
	'get-as-code',
	'node-usage',
	'list-versions',
	'validate',
]);

export function actionOf(args: Record<string, unknown>): string | undefined {
	return typeof args.action === 'string' ? args.action : undefined;
}

/**
 * The route a committing call picks, or `undefined` for exploration. An
 * `ask-user` card needs the judge for its steer. A call without an action
 * fails schema validation, so it picks nothing.
 */
export function committedRoute(
	toolName: string,
	args: Record<string, unknown>,
): 'agent' | 'workflow' | 'one-off' | 'multi' | 'debug' | 'ask-user' | undefined {
	const action = actionOf(args);
	switch (toolName) {
		case ORCHESTRATION_TOOL_IDS.BUILD_AGENT:
			// `exploring` only reads an existing Agent, so it does not commit to a route.
			return args.operation === 'exploring' ? undefined : 'agent';
		case DOMAIN_TOOL_IDS.BUILD_WORKFLOW:
			return args.executionIntent === 'one-off' ? 'one-off' : 'workflow';
		case ORCHESTRATION_TOOL_IDS.CREATE_TASKS:
			return 'multi';
		case DOMAIN_TOOL_IDS.ASK_USER:
			return 'ask-user';
		case DOMAIN_TOOL_IDS.NODES:
			return action === 'execute' ? 'one-off' : undefined;
		case DOMAIN_TOOL_IDS.EXECUTIONS:
			if (action === 'debug') return 'debug';
			return action === 'run' || action === 'run-step' || action === 'stop' ? 'one-off' : undefined;
		case DOMAIN_TOOL_IDS.DATA_TABLES:
			return action === undefined || DATA_TABLES_EXPLORATION_ACTIONS.has(action)
				? undefined
				: 'one-off';
		case DOMAIN_TOOL_IDS.WORKFLOWS:
			return action === undefined || WORKFLOWS_READ_ACTIONS.has(action) ? undefined : 'one-off';
		default:
			return undefined;
	}
}

export function isCommittingCall(toolName: string, args: Record<string, unknown>): boolean {
	return committedRoute(toolName, args) !== undefined;
}
