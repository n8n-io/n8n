/** Classifies tools by category and side effect for the trace tool manifest. */
import {
	DATA_TABLE_TOOL_NAMES,
	EXECUTION_TOOL_NAMES,
	getDataTableToolAction,
	getExecutionCallAction,
	isDataTableWriteToolAction,
} from '@n8n/api-types';

import { DOMAIN_TOOL_IDS } from '../tools/tool-ids';

/** Keyword checks must not match the builder prefix (`workflow_builder_` contains "workflow" and "build"). */
function unprefixedToolName(name: string): string {
	return name.replace(/^(workflow|agent)_builder_/, '');
}

/** The kind of resource a tool works on, for the trace tool manifest. */
export function classifyToolCategory(name: string): string {
	if (DATA_TABLE_TOOL_NAMES.includes(name)) return 'data-table';
	if (
		name === DOMAIN_TOOL_IDS.NODES ||
		name === DOMAIN_TOOL_IDS.SEARCH_NODES ||
		name === DOMAIN_TOOL_IDS.GET_NODE_TYPES ||
		name === DOMAIN_TOOL_IDS.GET_NODE_PARAMETER_OPTIONS ||
		name === DOMAIN_TOOL_IDS.EXECUTE_NODE ||
		name === 'materialize-node-type'
	)
		return 'node';
	if (EXECUTION_TOOL_NAMES.includes(name)) return 'execution';
	const baseName = unprefixedToolName(name);
	if (baseName.includes('credential')) return 'credential';
	if (baseName.includes('browser')) return 'browser';
	if (baseName.includes('data-table')) return 'data-table';
	if (baseName.includes('workflow')) {
		return 'workflow';
	}
	if (baseName.includes('research')) return 'research';
	if (baseName.startsWith('workspace_')) return 'workspace';
	if (baseName.includes('file') || baseName.includes('filesystem')) return 'filesystem';
	return 'other';
}

/** What a tool changes when it runs, for the trace tool manifest. */
export function classifyToolSideEffect(name: string): string {
	if (name === DOMAIN_TOOL_IDS.ASK_USER) return 'none';
	const baseName = unprefixedToolName(name);
	// Only run, run-step and stop change execution state; the other execution tools read.
	const executionAction = getExecutionCallAction(baseName);
	if (executionAction) {
		return ['run', 'run-step', 'stop'].includes(executionAction) ? 'execute' : 'read';
	}
	// Names like `query_data_table` match no keyword below, so classify by action.
	// The batch tool has no single action, and every change it makes is a write.
	if (DATA_TABLE_TOOL_NAMES.includes(baseName)) {
		const dataTableAction = getDataTableToolAction(baseName);
		return dataTableAction && !isDataTableWriteToolAction(dataTableAction) ? 'read' : 'write';
	}
	if (baseName.includes('browser')) return 'browser';
	if (baseName.includes('research')) return 'network';
	if (baseName.includes('execute') || baseName.includes('run')) {
		return 'execute';
	}
	if (
		baseName.includes('write') ||
		baseName.includes('submit') ||
		baseName.includes('apply') ||
		baseName.includes('build') ||
		baseName.includes('create') ||
		baseName.includes('update') ||
		baseName.includes('delete') ||
		baseName.includes('remove') ||
		baseName.includes('complete')
	) {
		return 'write';
	}
	if (baseName.includes('pause-for-user')) return 'none';
	return 'read';
}
