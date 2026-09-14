import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mocks } = vi.hoisted(() => ({
	mocks: {
		workflowId: 'wf-1' as string | undefined,
		fetchExecutions: vi.fn(),
		fetchExecution: vi.fn(),
	},
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: () => ({
		value: {
			get workflowId() {
				return mocks.workflowId;
			},
		},
	}),
}));

vi.mock('@/features/execution/executions/executions.store', () => ({
	useExecutionsStore: () => ({
		fetchExecutions: (...args: unknown[]) => mocks.fetchExecutions(...args),
		fetchExecution: (...args: unknown[]) => mocks.fetchExecution(...args),
	}),
}));

import { useUserExecutions, isUserExecution } from './useUserExecutions';

// A page of `n` evaluation-mode rows, ids counting down from `startId`.
function evalPage(startId: number, n: number, count: number) {
	return {
		count,
		results: Array.from({ length: n }, (_, i) => ({ id: String(startId - i), mode: 'evaluation' })),
	};
}

describe('useUserExecutions', () => {
	beforeEach(() => {
		mocks.workflowId = 'wf-1';
		mocks.fetchExecutions.mockReset();
		mocks.fetchExecution.mockReset();
	});

	it('isUserExecution excludes evaluation runs and id-less rows', () => {
		expect(isUserExecution({ id: '1', mode: 'manual' })).toBe(true);
		expect(isUserExecution({ id: '1', mode: 'evaluation' })).toBe(false);
		expect(isUserExecution({ mode: 'manual' })).toBe(false);
	});

	it('pages past a full page of evaluation runs to find an older user run', async () => {
		// Page 1: 10 evaluation runs (no user run). Page 2: a user run.
		mocks.fetchExecutions.mockResolvedValueOnce(evalPage(100, 10, 11)).mockResolvedValueOnce({
			count: 11,
			results: [{ id: '90', mode: 'manual' }],
		});
		mocks.fetchExecution.mockResolvedValue({ id: '90' });

		const { fetchLatestUserExecution } = useUserExecutions();
		const result = await fetchLatestUserExecution();

		expect(result).toEqual({ id: '90' });
		// Second page requested with the oldest id of the first page as the cursor.
		expect(mocks.fetchExecutions).toHaveBeenCalledTimes(2);
		expect(mocks.fetchExecutions).toHaveBeenLastCalledWith(
			{ status: ['success'], workflowId: 'wf-1' },
			'91',
		);
		expect(mocks.fetchExecution).toHaveBeenCalledWith('90');
	});

	it('stops once the whole history is consumed and returns null when none are user runs', async () => {
		// A single short page of only evaluation runs, and count says that's all.
		mocks.fetchExecutions.mockResolvedValue(evalPage(5, 3, 3));

		const { fetchLatestUserExecution } = useUserExecutions();
		const result = await fetchLatestUserExecution();

		expect(result).toBeNull();
		expect(mocks.fetchExecutions).toHaveBeenCalledTimes(1);
		expect(mocks.fetchExecution).not.toHaveBeenCalled();
	});
});
