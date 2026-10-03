// ---------------------------------------------------------------------------
// Committing calls for the routing eval.
//
// A committing call is the first call that picks a route for the user's
// request. `--stop-on-route` ends the trial there. Every other call (skill and
// tool loading, docs, research, reads, and data-table schema setup) is
// exploration, so the run goes on.
// ---------------------------------------------------------------------------

import { DOMAIN_TOOL_IDS, ORCHESTRATION_TOOL_IDS } from '../../src/tools/tool-ids';

const DATA_TABLES_READ_ACTIONS: ReadonlySet<string> = new Set(['list', 'get', 'query', 'schema']);

/**
 * Schema-only setup. The Assistant often creates a table before it builds a
 * workflow, so these calls do not pick a route. Row writes and table deletes do.
 */
const DATA_TABLES_SETUP_ACTIONS: ReadonlySet<string> = new Set([
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

const EXECUTIONS_COMMITTING_ACTIONS: ReadonlySet<string> = new Set(['run', 'debug', 'stop']);

function actionOf(args: Record<string, unknown>): string | undefined {
	return typeof args.action === 'string' ? args.action : undefined;
}

/**
 * Any data-tables action that is not a read, including schema setup.
 * A call without an action fails schema validation, so it commits to nothing.
 */
export function isMutatingDataTablesAction(action: string | undefined): boolean {
	return action !== undefined && !DATA_TABLES_READ_ACTIONS.has(action);
}

/** A mutating data-tables action that is not schema setup: row writes, table deletes, and unknown actions. */
export function isCommittingDataTablesAction(action: string | undefined): boolean {
	return (
		action !== undefined &&
		!DATA_TABLES_READ_ACTIONS.has(action) &&
		!DATA_TABLES_SETUP_ACTIONS.has(action)
	);
}

export function isMutatingWorkflowsAction(action: string | undefined): boolean {
	return action !== undefined && !WORKFLOWS_READ_ACTIONS.has(action);
}

export function isCommittingCall(toolName: string, args: Record<string, unknown>): boolean {
	const action = actionOf(args);
	switch (toolName) {
		case ORCHESTRATION_TOOL_IDS.BUILD_AGENT:
			// `exploring` only reads an existing Agent, so it does not commit to a route.
			return args.operation !== 'exploring';
		case DOMAIN_TOOL_IDS.BUILD_WORKFLOW:
		case ORCHESTRATION_TOOL_IDS.CREATE_TASKS:
		case DOMAIN_TOOL_IDS.ASK_USER:
			return true;
		case DOMAIN_TOOL_IDS.NODES:
			return action === 'execute';
		case DOMAIN_TOOL_IDS.EXECUTIONS:
			return action !== undefined && EXECUTIONS_COMMITTING_ACTIONS.has(action);
		case DOMAIN_TOOL_IDS.DATA_TABLES:
			return isCommittingDataTablesAction(action);
		case DOMAIN_TOOL_IDS.WORKFLOWS:
			return isMutatingWorkflowsAction(action);
		default:
			return false;
	}
}
