import { UnexpectedError } from '@n8n/errors';
import { ExecutionLifecycleHooks } from 'n8n-core';
import type { IWorkflowBase } from 'n8n-workflow';

import type { NodeRunLog } from '../execution-context';

export function createHooks(
	executionId: string,
	workflowData: IWorkflowBase,
	runs: NodeRunLog,
): ExecutionLifecycleHooks {
	const hooks = new ExecutionLifecycleHooks('trigger', executionId, workflowData);
	hooks.addHandler('nodeExecuteBefore', (node) => {
		runs.open.push({ node, record: { parameters: [], requests: [] } });
	});
	hooks.addHandler('nodeExecuteAfter', (nodeName, task) => {
		const index = runs.open.map(({ node }) => node).lastIndexOf(nodeName);
		if (index === -1) throw new UnexpectedError(`Node "${nodeName}" ended before it started`);
		const [{ record }] = runs.open.splice(index, 1);
		const completed = runs.completed.get(nodeName) ?? [];
		completed.push({ record, task });
		runs.completed.set(nodeName, completed);
	});
	return hooks;
}
