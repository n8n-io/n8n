import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { NodeSimulationVerdict } from '../../../workflow-loop/workflow-loop-state';
import { deriveWaitGateScripts, findCycleCutEdge } from '../wait-gate-script';

const gateVerdict = (nodeName: string): NodeSimulationVerdict => ({
	nodeName,
	verdict: 'simulate',
	reason: 'Send-and-wait gate on a loop',
	confidence: 'high',
	source: 'deterministic',
	haltBranch: true,
});

const main = (...targets: string[]) => ({
	main: [targets.map((target) => ({ node: target, type: 'main', index: 0 }))],
});

/** trigger → Generate → Format → Gate → Router → (Publish | Revise → Format). */
function approvalLoopWorkflow(gateParameters: Record<string, unknown>): WorkflowJSON {
	return {
		name: 'approval loop',
		nodes: [
			{ name: 'Every day', type: 'n8n-nodes-base.scheduleTrigger', parameters: {} },
			{ name: 'Generate', type: '@n8n/n8n-nodes-langchain.chainLlm', parameters: {} },
			{ name: 'Format', type: 'n8n-nodes-base.set', parameters: {} },
			{ name: 'Gate', type: 'n8n-nodes-base.gmail', parameters: gateParameters },
			{ name: 'Router', type: 'n8n-nodes-base.if', parameters: {} },
			{ name: 'Publish', type: 'n8n-nodes-base.linkedIn', parameters: {} },
			{ name: 'Revise', type: '@n8n/n8n-nodes-langchain.chainLlm', parameters: {} },
		].map((node, index) => ({
			id: `id-${index}`,
			typeVersion: 1,
			position: [index * 100, 0],
			...node,
		})),
		connections: {
			'Every day': main('Generate'),
			Generate: main('Format'),
			Format: main('Gate'),
			Gate: main('Router'),
			Router: {
				main: [
					[{ node: 'Publish', type: 'main', index: 0 }],
					[{ node: 'Revise', type: 'main', index: 0 }],
				],
			},
			Revise: main('Format'),
		},
	} as unknown as WorkflowJSON;
}

describe('findCycleCutEdge', () => {
	it('picks the loop-back edge, never one that costs downstream coverage', () => {
		const workflow = approvalLoopWorkflow({ operation: 'sendAndWait' });

		// Gate→Router also breaks the cycle but would disconnect the router,
		// publish and revise branches — only Revise→Format preserves coverage.
		expect(findCycleCutEdge(workflow, 'Gate')).toEqual({ source: 'Revise', target: 'Format' });
	});

	it('returns undefined when the gate is not on a cycle or no trigger exists', () => {
		const acyclic = approvalLoopWorkflow({ operation: 'sendAndWait' });
		(acyclic.connections as Record<string, unknown>).Revise = { main: [[]] };
		expect(findCycleCutEdge(acyclic, 'Gate')).toBeUndefined();

		const triggerless = approvalLoopWorkflow({ operation: 'sendAndWait' });
		triggerless.nodes = triggerless.nodes.filter((node) => node.name !== 'Every day');
		expect(findCycleCutEdge(triggerless, 'Gate')).toBeUndefined();
	});
});

describe('deriveWaitGateScripts', () => {
	it('derives approve/decline passes for the approval response type', () => {
		const workflow = approvalLoopWorkflow({ operation: 'sendAndWait', responseType: 'approval' });

		const scripts = deriveWaitGateScripts(workflow, [gateVerdict('Gate')]);

		expect(scripts).toHaveLength(1);
		expect(scripts[0].nodeName).toBe('Gate');
		expect(scripts[0].cutEdge).toEqual({ source: 'Revise', target: 'Format' });
		expect(scripts[0].decisions.map((d) => d.label)).toEqual(['approve', 'decline']);
		expect(scripts[0].decisions[0].items[0]).toMatchObject({ data: { approved: true } });
		expect(scripts[0].decisions[1].items[0]).toMatchObject({ data: { approved: false } });
	});

	it('defaults to the approval shape when responseType is omitted', () => {
		const workflow = approvalLoopWorkflow({ operation: 'sendAndWait' });

		const scripts = deriveWaitGateScripts(workflow, [gateVerdict('Gate')]);

		expect(scripts[0]?.decisions[0].items[0]).toMatchObject({ data: { approved: true } });
	});

	it('enumerates the first single-select dropdown for custom forms', () => {
		const workflow = approvalLoopWorkflow({
			operation: 'sendAndWait',
			responseType: 'customForm',
			formFields: {
				values: [
					{
						fieldLabel: 'Decision',
						fieldType: 'dropdown',
						fieldOptions: { values: [{ option: 'Approve' }, { option: 'Request changes' }] },
					},
					{ fieldLabel: 'Requested changes', fieldType: 'textarea' },
				],
			},
		});

		const scripts = deriveWaitGateScripts(workflow, [gateVerdict('Gate')]);

		expect(scripts[0]?.decisions.map((d) => d.label)).toEqual(['Approve', 'Request changes']);
		expect(scripts[0]?.decisions[1].items[0]).toMatchObject({
			data: { Decision: 'Request changes' },
		});
	});

	it('derives canned approve/revise texts for free-text gates', () => {
		const workflow = approvalLoopWorkflow({ operation: 'sendAndWait', responseType: 'freeText' });

		const scripts = deriveWaitGateScripts(workflow, [gateVerdict('Gate')]);

		expect(scripts[0]?.decisions).toHaveLength(2);
		const firstItem = scripts[0]?.decisions[0].items[0] as { data?: { text?: string } };
		expect(firstItem.data?.text).toContain('Approved');
	});

	it('returns [] for underivable shapes', () => {
		const noDropdown = approvalLoopWorkflow({
			operation: 'sendAndWait',
			responseType: 'customForm',
			formFields: { values: [{ fieldLabel: 'Decision', fieldType: 'text' }] },
		});
		expect(deriveWaitGateScripts(noDropdown, [gateVerdict('Gate')])).toEqual([]);

		// Multiple halted gates — v1 scripts exactly one.
		const workflow = approvalLoopWorkflow({ operation: 'sendAndWait' });
		expect(deriveWaitGateScripts(workflow, [gateVerdict('Gate'), gateVerdict('Other')])).toEqual(
			[],
		);

		// Not a send-and-wait node (Wait node keeps the halt in v1).
		const waitNode = approvalLoopWorkflow({});
		waitNode.nodes = waitNode.nodes.map((node) =>
			node.name === 'Gate' ? { ...node, type: 'n8n-nodes-base.wait', parameters: {} } : node,
		);
		expect(deriveWaitGateScripts(waitNode, [gateVerdict('Gate')])).toEqual([]);
	});
});
