import { describe, expect, it } from 'vitest';

import type { EvalCollectionRunStatus, EvalVersionEntry } from '../../evalCollections.types';
import { buildVersionEntries, isReusableRun } from './buildVersionEntries';

const version = (
	overrides: Partial<EvalVersionEntry> = {},
	runStatus?: EvalCollectionRunStatus,
): EvalVersionEntry => ({
	workflowVersionId: 'v1',
	label: 'baseline',
	sourceLabel: 'Published v1',
	isCurrent: false,
	lastRun: runStatus
		? {
				testRunId: 'run-1',
				runAt: '2026-05-12T10:00:00Z',
				status: runStatus,
				avgScore: 0.8,
				isBest: false,
				isCritical: false,
			}
		: null,
	...overrides,
});

describe('isReusableRun', () => {
	it.each<[EvalCollectionRunStatus, boolean]>([
		['completed', true],
		['running', true],
		['new', true],
		['error', false],
		['cancelled', false],
	])('returns %s → %s', (status, expected) => {
		expect(isReusableRun(version({}, status).lastRun)).toBe(expected);
	});

	it('returns false when there is no run', () => {
		expect(isReusableRun(null)).toBe(false);
	});
});

describe('buildVersionEntries', () => {
	it('reuses a still-good run', () => {
		expect(buildVersionEntries([version({ workflowVersionId: 'v1' }, 'completed')])).toEqual([
			{ workflowVersionId: 'v1', existingTestRunId: 'run-1' },
		]);
	});

	it('schedules a fresh run for a failed or cancelled last run', () => {
		expect(buildVersionEntries([version({ workflowVersionId: 'v1' }, 'error')])).toEqual([
			{ workflowVersionId: 'v1', existingTestRunId: undefined },
		]);
		expect(buildVersionEntries([version({ workflowVersionId: 'v2' }, 'cancelled')])).toEqual([
			{ workflowVersionId: 'v2', existingTestRunId: undefined },
		]);
	});

	it('schedules a fresh run for a version with no run yet', () => {
		expect(buildVersionEntries([version({ workflowVersionId: 'v3' })])).toEqual([
			{ workflowVersionId: 'v3', existingTestRunId: undefined },
		]);
	});

	it('keeps a null workflowVersionId for the "Current draft" row', () => {
		expect(buildVersionEntries([version({ workflowVersionId: null, isCurrent: true })])).toEqual([
			{ workflowVersionId: null, existingTestRunId: undefined },
		]);
	});

	it('maps a mixed selection independently', () => {
		const entries = buildVersionEntries([
			version({ workflowVersionId: 'good' }, 'completed'),
			version({ workflowVersionId: 'failed' }, 'error'),
			version({ workflowVersionId: null, isCurrent: true }),
		]);
		expect(entries).toEqual([
			{ workflowVersionId: 'good', existingTestRunId: 'run-1' },
			{ workflowVersionId: 'failed', existingTestRunId: undefined },
			{ workflowVersionId: null, existingTestRunId: undefined },
		]);
	});
});
