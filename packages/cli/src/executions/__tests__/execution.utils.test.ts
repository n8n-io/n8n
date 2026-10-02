import type { IWorkflowBase } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { getWorkflowActiveStatusFromWorkflowData } from '../execution.utils';

describe('getWorkflowActiveStatusFromWorkflowData', () => {
	it('uses the active version when the legacy field disagrees', () => {
		expect(
			getWorkflowActiveStatusFromWorkflowData(
				mock<IWorkflowBase>({ active: false, activeVersionId: 'version-1' }),
			),
		).toBe(true);
		expect(
			getWorkflowActiveStatusFromWorkflowData(
				mock<IWorkflowBase>({ active: true, activeVersionId: null }),
			),
		).toBe(false);
	});

	it('reads the legacy field from snapshots without an active version id', () => {
		expect(
			getWorkflowActiveStatusFromWorkflowData(
				mock<IWorkflowBase>({ active: true, activeVersionId: undefined }),
			),
		).toBe(true);
		expect(
			getWorkflowActiveStatusFromWorkflowData(
				mock<IWorkflowBase>({ active: false, activeVersionId: undefined }),
			),
		).toBe(false);
	});
});
