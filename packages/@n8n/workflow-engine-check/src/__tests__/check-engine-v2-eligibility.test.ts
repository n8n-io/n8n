import type { IConnections, INode, IWorkflowSettings } from 'n8n-workflow';

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
			reasons: [
				{
					code: 'REDACTION_POLICY',
					kind: 'temporary',
					severity: 'warning',
					message: expect.any(String),
				},
			],
		});
	});

	// Engine v2 runs only the live triggers and the nodes they reach over main connections.
	it.each<{ rule: string; nodes: INode[]; connections: IConnections }>([
		{
			rule: 'node type',
			nodes: [
				manualTrigger,
				{ ...manualTrigger, id: 'loose-id', name: 'Loose', type: 'n8n-nodes-base.executionData' },
			],
			connections: {},
		},
		{
			rule: 'converter',
			nodes: [
				manualTrigger,
				{
					...manualTrigger,
					id: 'merge-id',
					name: 'Merge',
					type: 'n8n-nodes-base.merge',
					typeVersion: 3,
					parameters: { mode: 'chooseBranch' },
				},
			],
			connections: {},
		},
		{
			rule: 'graph',
			nodes: [
				manualTrigger,
				{ ...manualTrigger, id: 'a-id', name: 'A', type: 'n8n-nodes-base.noOp' },
				{ ...manualTrigger, id: 'b-id', name: 'B', type: 'n8n-nodes-base.noOp' },
			],
			connections: {
				A: { main: [[{ node: 'B', type: 'main', index: 0 }]] },
				B: { main: [[{ node: 'A', type: 'main', index: 0 }]] },
			},
		},
	])('ignores nodes that no live trigger reaches in the $rule rule', ({ nodes, connections }) => {
		expect(checkEngineV2Eligibility({ nodes, connections, settings: {} })).toEqual({
			eligible: true,
			reasons: [],
		});
	});

	// Engine v2 will support these later, so the user stays on engine v1 until then.
	it.each<{ case: string; nodes: INode[]; connections: IConnections; settings: IWorkflowSettings }>(
		[
			{
				case: 'an error workflow',
				nodes: [manualTrigger],
				connections: {},
				settings: { errorWorkflow: 'wf-123' },
			},
			{
				case: 'a trigger that takes credentials from the request',
				nodes: [oauth2Webhook],
				connections: {},
				settings: {},
			},
			{
				case: 'a node type that engine v2 does not run yet',
				nodes: [
					manualTrigger,
					{ ...manualTrigger, id: 'form-id', name: 'Form', type: 'n8n-nodes-base.form' },
				],
				connections: {
					[manualTrigger.name]: { main: [[{ node: 'Form', type: 'main', index: 0 }]] },
				},
				settings: {},
			},
		],
	)(
		'asks the user to run a workflow with $case on engine v1 for now',
		({ nodes, connections, settings }) => {
			const { reasons } = checkEngineV2Eligibility({ nodes, connections, settings });

			expect(reasons).toEqual([
				expect.objectContaining({
					kind: 'temporary',
					message: expect.stringMatching(/ Run this workflow on engine v1 for now\.$/),
				}),
			]);
		},
	);
});
