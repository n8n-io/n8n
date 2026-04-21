import { mock } from 'jest-mock-extended';

import type {
	RunWorkflowAuthoringChecksInput,
	WorkflowCheckResult,
} from '@/modules/workflow-authoring-checks/workflow-authoring-checks.types';

import {
	WorkflowAuthoringChecksProxy,
	type WorkflowAuthoringChecks,
} from '../authoring-checks-proxy.service';

const input: RunWorkflowAuthoringChecksInput = {
	workflowId: 'wf',
	nodes: [],
	connections: {},
	settings: undefined,
};

describe('WorkflowAuthoringChecksProxy', () => {
	it('returns no results when no inner is set', async () => {
		const proxy = new WorkflowAuthoringChecksProxy();

		expect(await proxy.runAll(input)).toEqual([]);
	});

	it('delegates to the inner implementation when set', async () => {
		const results: WorkflowCheckResult[] = [
			{ checkId: 'c', title: 't', severity: 'warning', violations: [{ message: 'm' }] },
		];
		const inner = mock<WorkflowAuthoringChecks>();
		inner.runAll.mockResolvedValue(results);

		const proxy = new WorkflowAuthoringChecksProxy();
		proxy.setInner(inner);

		expect(await proxy.runAll(input)).toBe(results);
		expect(inner.runAll).toHaveBeenCalledWith(input);
	});
});
