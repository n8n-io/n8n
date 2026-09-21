import { describe, expect, it } from 'vitest';

import { NodeRegistry } from '../catalog/node-registry';
import { compileWorkflow } from '../compiler/compile';
import { expr, field } from '../expressions/expression';
import { workflowIrSchema } from '../ir/schema';
import { validateExpressions } from '../validation/expressions';
import { validateStructure } from '../validation/structural';
import { validateCompiledWorkflow } from '../validation/validate';

const registry = new NodeRegistry();

const ir = workflowIrSchema.parse({
	id: 'wf',
	name: 'Leads',
	triggers: [
		{
			id: 'webhook',
			kind: 'trigger',
			triggerKind: 'webhook',
			label: 'Webhook',
			operation: { operationId: 'webhook.trigger' },
			params: { method: 'POST', path: 'leads' },
		},
	],
	steps: [
		{
			id: 'upsert',
			kind: 'action',
			label: 'Upsert Contact',
			operation: { operationId: 'hubspot.contact.upsert' },
			params: { email: expr(field('webhook', 'body', 'email')) },
		},
		{
			id: 'notify',
			kind: 'action',
			label: 'Notify',
			operation: { operationId: 'slack.message.post' },
			params: { channel: '#sales', text: expr(field('upsert', 'vid')) },
		},
	],
});

describe('validateCompiledWorkflow', () => {
	it('passes every static level for a well-formed workflow and flags unresolved credentials', async () => {
		const compiled = compileWorkflow(ir, registry);
		const report = await validateCompiledWorkflow({ ir, compiled, registry });
		expect(report.structural).toBe('pass');
		expect(report.parameters).toBe('warn');
		expect(report.expressions).toBe('pass');
		expect(report.contracts).toBe('pass');
		expect(report.fixtureTests).toBe('not_run');
		expect(report.issues.map((issue) => issue.code)).toEqual([
			'credential_unresolved',
			'credential_unresolved',
		]);
	});

	it('fails parameter validation when a required semantic parameter is missing', async () => {
		const broken = workflowIrSchema.parse({
			...ir,
			steps: [
				{
					id: 'notify',
					kind: 'action',
					label: 'Notify',
					operation: { operationId: 'slack.message.post' },
					params: { text: 'hi' },
				},
			],
		});
		const compiled = compileWorkflow(broken, registry);
		const report = await validateCompiledWorkflow({ ir: broken, compiled, registry });
		expect(report.parameters).toBe('fail');
		expect(report.issues).toContainEqual(
			expect.objectContaining({ code: 'missing_required_parameter', parameter: 'channel' }),
		);
	});

	it('warns when an expression reads a field outside the producer contract', async () => {
		const compiled = compileWorkflow(ir, registry);
		compiled.workflow.nodes[2].parameters = {
			...compiled.workflow.nodes[2].parameters,
			text: '={{ $("Upsert Contact").item.json.unknownField }}',
		};
		const report = await validateCompiledWorkflow({ ir, compiled, registry });
		expect(report.issues).toContainEqual(
			expect.objectContaining({ code: 'expression_unknown_field' }),
		);
	});
});

describe('validateStructure', () => {
	it('detects unknown connection targets, missing triggers and unreachable nodes', () => {
		const issues = validateStructure({
			name: 'x',
			nodes: [
				{
					id: '1',
					name: 'Set',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [0, 0],
					parameters: {},
				},
				{
					id: '2',
					name: 'Other',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: { Set: { main: [[{ node: 'Ghost', type: 'main', index: 0 }]] } },
		});
		expect(issues.map((issue) => issue.code).sort()).toEqual([
			'connection_to_unknown_node',
			'missing_trigger',
			'unreachable_node',
			'unreachable_node',
		]);
	});
});

describe('validateExpressions', () => {
	it('rejects references to nodes that are not upstream', () => {
		const issues = validateExpressions({
			name: 'x',
			nodes: [
				{
					id: '1',
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 2,
					position: [0, 0],
					parameters: {},
				},
				{
					id: '2',
					name: 'A',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [0, 0],
					parameters: { x: '={{ $("B").item.json.y }}' },
				},
				{
					id: '3',
					name: 'B',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [0, 0],
					parameters: { y: '={{ $("Webhook").item.json.body }}' },
				},
			],
			connections: {
				Webhook: { main: [[{ node: 'A', type: 'main', index: 0 }]] },
				A: { main: [[{ node: 'B', type: 'main', index: 0 }]] },
			},
		});
		expect(issues).toEqual([
			expect.objectContaining({ code: 'expression_node_not_upstream', nodeName: 'A' }),
		]);
	});
});
