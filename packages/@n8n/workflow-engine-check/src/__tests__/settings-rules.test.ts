import type { INode, IWorkflowSettings } from 'n8n-workflow';

import { checkEngineV2Eligibility, type EngineV2ReasonCode } from '../index';

const manualTrigger: INode = {
	id: 'manual-id',
	name: 'When clicking Execute',
	type: 'n8n-nodes-base.manualTrigger',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

function check(settings: IWorkflowSettings) {
	return checkEngineV2Eligibility({ nodes: [manualTrigger], connections: {}, settings });
}

describe('settings rules', () => {
	it.each<{ setting: string; settings: IWorkflowSettings; code: EngineV2ReasonCode }>([
		{
			setting: 'an error workflow id',
			settings: { errorWorkflow: 'wf-123' },
			code: 'ERROR_WORKFLOW',
		},
		{
			setting: 'a credential resolver',
			settings: { credentialResolverId: 'resolver-1' },
			code: 'END_USER_CREDENTIALS',
		},
	])('blocks $setting with code $code', ({ settings, code }) => {
		expect(check(settings)).toEqual({
			eligible: false,
			reasons: [{ code, severity: 'blocking', message: expect.any(String) }],
		});
	});

	it.each<IWorkflowSettings['redactionPolicy']>(['all', 'non-manual', 'manual-only'])(
		'warns about redaction policy %s but keeps the workflow eligible',
		(redactionPolicy) => {
			expect(check({ redactionPolicy })).toEqual({
				eligible: true,
				reasons: [{ code: 'REDACTION_POLICY', severity: 'warning', message: expect.any(String) }],
			});
		},
	);

	it.each<{ setting: string; settings: IWorkflowSettings }>([
		{ setting: 'empty settings', settings: {} },
		{ setting: 'the error workflow set to DEFAULT', settings: { errorWorkflow: 'DEFAULT' } },
		{ setting: 'an empty error workflow', settings: { errorWorkflow: '' } },
		// The runtime never evaluates an expression here, so v1 runs no error workflow either.
		{ setting: 'an error workflow expression', settings: { errorWorkflow: '={{ $json.id }}' } },
		{ setting: 'redaction policy none', settings: { redactionPolicy: 'none' } },
		// The runtime reads a null policy as none.
		{
			setting: 'a null redaction policy',
			settings: { redactionPolicy: null } as unknown as IWorkflowSettings,
		},
		{ setting: 'an empty credential resolver', settings: { credentialResolverId: '' } },
	])('allows $setting', ({ settings }) => {
		expect(check(settings)).toEqual({ eligible: true, reasons: [] });
	});

	it('reports every setting reason with its severity, not only the first', () => {
		const result = check({
			errorWorkflow: 'wf-123',
			redactionPolicy: 'all',
			credentialResolverId: 'resolver-1',
		});

		expect(result.eligible).toBe(false);
		expect(result.reasons.map(({ code, severity }) => ({ code, severity }))).toEqual([
			{ code: 'ERROR_WORKFLOW', severity: 'blocking' },
			{ code: 'REDACTION_POLICY', severity: 'warning' },
			{ code: 'END_USER_CREDENTIALS', severity: 'blocking' },
		]);
	});
});
