import { describe, it, expect } from 'vitest';

import { ApiError } from '../client';
import { toPackagesError } from '../commands/package/shared';

describe('toPackagesError', () => {
	it('returns non-ApiError values unchanged', () => {
		const error = new Error('boom');
		expect(toPackagesError(error)).toBe(error);
	});

	it('adds a beta-enablement hint for a 404', () => {
		const result = toPackagesError(new ApiError(404, 'Not Found'));

		expect(result).toBeInstanceOf(ApiError);
		expect((result as ApiError).statusCode).toBe(404);
		expect((result as ApiError).hint).toContain('N8N_PUBLIC_API_PACKAGES_ENABLED=true');
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

	it('leaves other ApiErrors without issue details unchanged', () => {
		const error = new ApiError(400, 'Bad request');
		expect(toPackagesError(error)).toBe(error);
	});
});
