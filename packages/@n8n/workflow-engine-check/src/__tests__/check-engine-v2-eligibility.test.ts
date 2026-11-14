import type { INode, IWorkflowSettings } from 'n8n-workflow';

import { checkEngineV2Eligibility } from '../index';

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

describe('checkEngineV2Eligibility', () => {
	it('reports a clean manual-trigger workflow as eligible with no reasons', () => {
		expect(
			checkEngineV2Eligibility({ nodes: [manualTrigger], connections: {}, settings: {} }),
		).toEqual({ eligible: true, reasons: [] });
	});

	it.each<[string, IWorkflowSettings | undefined]>([
		['without settings', undefined],
		// The settings column is nullable, so stored workflows can have null settings.
		['with null settings', null as unknown as IWorkflowSettings],
	])('reports a workflow %s as eligible', (_, settings) => {
		expect(checkEngineV2Eligibility({ nodes: [manualTrigger], connections: {}, settings })).toEqual(
			{ eligible: true, reasons: [] },
		);
	});

	it('reports a workflow as not eligible with the reasons of every rule', () => {
		const result = checkEngineV2Eligibility({
			nodes: [oauth2Webhook],
			connections: {},
			settings: { redactionPolicy: 'all' },
		});

		expect(result.eligible).toBe(false);
		expect(result.reasons.map(({ code, severity }) => ({ code, severity }))).toEqual([
			{ code: 'REDACTION_POLICY', severity: 'warning' },
			{ code: 'TRIGGER_EXTERNAL_IDENTITY', severity: 'blocking' },
		]);
	});

	it('keeps a workflow with only warnings eligible and still reports the warnings', () => {
		const result = checkEngineV2Eligibility({
			nodes: [manualTrigger],
			connections: {},
			settings: { redactionPolicy: 'all' },
		});

		expect(result).toEqual({
			eligible: true,
			reasons: [{ code: 'REDACTION_POLICY', severity: 'warning', message: expect.any(String) }],
		});
	});
});
