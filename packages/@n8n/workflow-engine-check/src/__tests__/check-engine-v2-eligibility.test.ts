import type { INode, IWorkflowSettings } from 'n8n-workflow';

import {
	checkEngineV2Eligibility,
	type EngineV2EligibilityWorkflow,
	type EngineV2ReasonCode,
} from '../index';

const manualTrigger: INode = {
	id: 'manual-id',
	name: 'When clicking Execute',
	type: 'n8n-nodes-base.manualTrigger',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const oauth2Webhook: INode = {
	id: 'webhook-id',
	name: 'Webhook',
	type: 'n8n-nodes-base.webhook',
	typeVersion: 2,
	position: [0, 0],
	parameters: { authentication: 'n8nOAuth2' },
};

const subWorkflowTrigger: INode = {
	id: 'sub-id',
	name: 'When called by another workflow',
	type: 'n8n-nodes-base.executeWorkflowTrigger',
	typeVersion: 1.1,
	position: [0, 0],
	parameters: {},
};

function workflow(
	settings: IWorkflowSettings = {},
	nodes: INode[] = [manualTrigger],
): EngineV2EligibilityWorkflow {
	return { nodes, connections: {}, settings };
}

describe('checkEngineV2Eligibility', () => {
	it('reports a clean manual-trigger workflow as eligible with no reasons', () => {
		expect(checkEngineV2Eligibility(workflow())).toEqual({ eligible: true, reasons: [] });
	});

	it('reports a workflow without settings as eligible', () => {
		expect(checkEngineV2Eligibility({ nodes: [manualTrigger], connections: {} })).toEqual({
			eligible: true,
			reasons: [],
		});
	});

	describe('settings rules', () => {
		it.each<{ setting: string; settings: IWorkflowSettings; code: EngineV2ReasonCode }>([
			{
				setting: 'an error workflow id',
				settings: { errorWorkflow: 'wf-123' },
				code: 'error-workflow',
			},
			{
				setting: 'redaction policy all',
				settings: { redactionPolicy: 'all' },
				code: 'redaction-policy',
			},
			{
				setting: 'redaction policy non-manual',
				settings: { redactionPolicy: 'non-manual' },
				code: 'redaction-policy',
			},
			{
				setting: 'redaction policy manual-only',
				settings: { redactionPolicy: 'manual-only' },
				code: 'redaction-policy',
			},
			{
				setting: 'a credential resolver',
				settings: { credentialResolverId: 'resolver-1' },
				code: 'end-user-credentials',
			},
		])('blocks $setting with code $code', ({ settings, code }) => {
			expect(checkEngineV2Eligibility(workflow(settings))).toEqual({
				eligible: false,
				reasons: [{ code, severity: 'blocking', message: expect.any(String) }],
			});
		});

		it.each<{ setting: string; settings: IWorkflowSettings }>([
			{ setting: 'the error workflow set to DEFAULT', settings: { errorWorkflow: 'DEFAULT' } },
			{ setting: 'an empty error workflow', settings: { errorWorkflow: '' } },
			// The runtime never evaluates an expression here, so v1 runs no error workflow either.
			{ setting: 'an error workflow expression', settings: { errorWorkflow: '={{ $json.id }}' } },
			{ setting: 'redaction policy none', settings: { redactionPolicy: 'none' } },
			{ setting: 'an empty credential resolver', settings: { credentialResolverId: '' } },
		])('allows $setting', ({ settings }) => {
			expect(checkEngineV2Eligibility(workflow(settings))).toEqual({ eligible: true, reasons: [] });
		});

		it('reports every blocking setting, not only the first', () => {
			const result = checkEngineV2Eligibility(
				workflow({
					errorWorkflow: 'wf-123',
					redactionPolicy: 'all',
					credentialResolverId: 'resolver-1',
				}),
			);

			expect(result.reasons.map((reason) => reason.code)).toEqual([
				'error-workflow',
				'redaction-policy',
				'end-user-credentials',
			]);
		});
	});

	describe('trigger identity rule', () => {
		it('blocks a live trigger that takes its identity from the request, naming the node', () => {
			const result = checkEngineV2Eligibility(workflow({}, [oauth2Webhook]));

			expect(result).toEqual({
				eligible: false,
				reasons: [
					{
						code: 'trigger-external-identity',
						severity: 'blocking',
						nodeId: 'webhook-id',
						nodeName: 'Webhook',
						message: expect.stringContaining('"Webhook"'),
					},
				],
			});
		});

		it.each<[string, INode]>([
			['a disabled trigger with external identity', { ...oauth2Webhook, disabled: true }],
			['a webhook without n8n OAuth2', { ...oauth2Webhook, parameters: {} }],
			// v2 starts a sub-workflow through its own path, which does not check identity.
			['a sub-workflow trigger', subWorkflowTrigger],
		])('does not block %s', (_, node) => {
			expect(checkEngineV2Eligibility(workflow({}, [node]))).toEqual({
				eligible: true,
				reasons: [],
			});
		});
	});
});
