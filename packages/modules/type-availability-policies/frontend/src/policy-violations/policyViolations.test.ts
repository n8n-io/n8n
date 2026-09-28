import { describe, expect, it } from 'vitest';

import { getPolicyViolations } from './policyViolations';

const saveRefused403 = {
	message: 'Node type "n8n-nodes-base.slack" is blocked by an instance policy',
	meta: {
		violations: [
			{
				kind: 'node-type-unavailable',
				checkId: 'node-type-availability',
				message: 'Node type "n8n-nodes-base.slack" is blocked by an instance policy',
				subject: 'n8n-nodes-base.slack',
				subjectType: 'nodeType',
				scope: 'instance',
				matchedRuleId: 'deny-n8n-nodes-base.slack',
			},
		],
	},
};

const storedExecutionError = {
	message: 'Workflow start is blocked by a project policy',
	stack: 'Error: Workflow start is blocked by a project policy\n    at deny',
	violations: [
		{
			kind: 'workflow-start-denied',
			checkId: 'workflow-start',
			message: 'Workflow start is blocked by a project policy',
			subject: 'wf-1',
			subjectType: 'workflow',
			scope: 'project',
		},
	],
};

describe('getPolicyViolations', () => {
	it('reads the violations a refused request carries under meta', () => {
		const error = Object.assign(new Error(saveRefused403.message), {
			httpStatusCode: 403,
			meta: saveRefused403.meta,
		});

		expect(getPolicyViolations(error)).toEqual(saveRefused403.meta.violations);
	});

	it('reads the violations a refused run stores on the execution error', () => {
		expect(getPolicyViolations(storedExecutionError)).toEqual(storedExecutionError.violations);
	});

	it.each([
		['an error without violations', new Error('Request failed with status code 500')],
		['an empty violation list', { meta: { violations: [] } }],
		[
			'a violation without the required fields',
			{ violations: [{ kind: 'node-type-unavailable' }] },
		],
		['a violation list that is not an array', { meta: { violations: 'blocked' } }],
		['a value that is not an object', 'blocked'],
		['no error at all', undefined],
	])('returns undefined for %s', (_label, error) => {
		expect(getPolicyViolations(error)).toBeUndefined();
	});
});
