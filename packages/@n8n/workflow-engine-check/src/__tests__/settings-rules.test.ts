import type { INode, INodeTypeDescription, IWorkflowSettings } from 'n8n-workflow';

import { checkEngineV2Eligibility, type EngineV2ReasonCode } from '../index';

const manualTrigger: INode = {
	id: 'manual-id',
	name: 'When clicking Execute',
	type: 'n8n-nodes-base.manualTrigger',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const nodeTypes: INodeTypeDescription[] = [];

function check(settings: IWorkflowSettings) {
	return checkEngineV2Eligibility({ nodes: [manualTrigger], connections: {}, settings }, nodeTypes);
}

describe('settings rules', () => {
	it.each<{ setting: string; settings: IWorkflowSettings; code: EngineV2ReasonCode }>([
		{
			setting: 'an error workflow id',
			settings: { errorWorkflow: 'wf-123' },
			code: 'ERROR_WORKFLOW',
		},
		{
			setting: 'redaction policy all',
			settings: { redactionPolicy: 'all' },
			code: 'REDACTION_POLICY',
		},
		{
			setting: 'redaction policy non-manual',
			settings: { redactionPolicy: 'non-manual' },
			code: 'REDACTION_POLICY',
		},
		{
			setting: 'redaction policy manual-only',
			settings: { redactionPolicy: 'manual-only' },
			code: 'REDACTION_POLICY',
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

	it('reports every blocking setting, not only the first', () => {
		const { reasons } = check({
			errorWorkflow: 'wf-123',
			redactionPolicy: 'all',
			credentialResolverId: 'resolver-1',
		});

		expect(reasons.map((reason) => reason.code)).toEqual([
			'ERROR_WORKFLOW',
			'REDACTION_POLICY',
			'END_USER_CREDENTIALS',
		]);
	});
});
