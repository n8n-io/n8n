import { describe, it, expect } from 'vitest';

import { ApiError } from '../client';
import { toPackagesError } from '../commands/package/package-error';

describe('toPackagesError', () => {
	it('returns non-ApiError values unchanged', () => {
		const error = new Error('boom');
		expect(toPackagesError(error)).toBe(error);
	});

	it('lists workflow-conflict issues for a 409', () => {
		const result = toPackagesError(
			new ApiError(409, 'Import blocked', undefined, {
				issues: [
					{
						type: 'workflow-conflict',
						name: 'Flow',
						sourceWorkflowId: 's1',
						existingWorkflowId: 'e1',
					},
				],
			}),
		);

		const hint = (result as ApiError).hint ?? '';
		expect(hint).toContain('Blocking issues:');
		expect(hint).toContain('workflow "Flow"');
		expect(hint).toContain('e1');
	});

	it('lists credential-unresolved issues for a 422', () => {
		const result = toPackagesError(
			new ApiError(422, 'Import blocked', undefined, {
				issues: [
					{
						type: 'credential-unresolved',
						kind: 'not_found',
						sourceId: 'c1',
						usedByWorkflows: ['w1', 'w2'],
					},
				],
			}),
		);

		const hint = (result as ApiError).hint ?? '';
		expect(hint).toContain('credential c1 unresolved (not_found)');
		expect(hint).toContain('w1, w2');
	});

	it('lists variable-unresolved issues for a 422', () => {
		const result = toPackagesError(
			new ApiError(422, 'Import blocked', undefined, {
				issues: [
					{
						type: 'variable-unresolved',
						name: 'var1',
						usedByWorkflows: ['w1', 'w2'],
					},
				],
			}),
		);

		const hint = (result as ApiError).hint ?? '';
		expect(hint).toContain('variable "var1" unresolved');
		expect(hint).toContain('w1, w2');
	});

	it('lists tag-unresolved issues for a 409', () => {
		const result = toPackagesError(
			new ApiError(409, 'Import blocked', undefined, {
				issues: [
					{
						type: 'tag-unresolved',
						kind: 'rename-drift',
						sourceId: 't1',
						name: 'prod',
						existingName: 'production',
						usedByWorkflows: ['w1'],
					},
					{
						type: 'tag-unresolved',
						kind: 'permission-denied',
						missingScope: 'tag:create',
						usedByWorkflows: ['w2'],
					},
				],
			}),
		);

		const hint = (result as ApiError).hint ?? '';
		expect(hint).toContain('tag "prod" (t1) unresolved (rename-drift)');
		expect(hint).toContain('w1');
		expect(hint).toContain('requires the tag:create scope');
		expect(hint).toContain('w2');
	});

	it('leaves other ApiErrors without issue details unchanged', () => {
		const error = new ApiError(400, 'Bad request');
		expect(toPackagesError(error)).toBe(error);
	});
});
