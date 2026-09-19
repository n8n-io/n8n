import { describe, expect, it } from 'vitest';

import { NodeRegistry } from '../catalog/node-registry';
import { compileWorkflow } from '../compiler/compile';
import { expr, field } from '../expressions/expression';
import { workflowIrSchema, type WorkflowIR } from '../ir/schema';

const registry = new NodeRegistry();

const customersApi = workflowIrSchema.parse({
	id: 'customers-api',
	name: 'Customers API',
	triggers: [
		{
			id: 'webhook',
			kind: 'trigger',
			triggerKind: 'webhook',
			label: 'Webhook',
			operation: { operationId: 'webhook.trigger' },
			params: { method: 'POST', path: 'customers', responseMode: 'responseNode' },
		},
	],
	steps: [
		{
			id: 'validate',
			kind: 'validate',
			label: 'Validate request',
			rules: [
				{ field: ['body', 'email'], rule: 'email' },
				{ field: ['body', 'company'], rule: 'required' },
			],
			onInvalid: 'respond_400',
		},
		{
			id: 'fanout',
			kind: 'parallel',
			join: 'all',
			branches: [
				[
					{
						id: 'audit',
						kind: 'action',
						label: 'Store Audit Record',
						operation: { operationId: 'postgres.row.insert' },
						params: { table: 'customer_requests' },
					},
				],
				[
					{
						id: 'upsert',
						kind: 'action',
						label: 'Upsert Contact',
						operation: { operationId: 'hubspot.contact.upsert' },
						params: { email: expr(field('webhook', 'body', 'email')) },
					},
				],
			],
		},
		{
			id: 'is-new',
			kind: 'branch',
			label: 'Is New?',
			condition: { op: 'is_true', left: field('upsert', 'isNew') },
			then: [
				{
					id: 'notify',
					kind: 'action',
					label: 'Notify Sales',
					operation: { operationId: 'slack.message.post' },
					params: { channel: '#sales', text: 'New customer' },
					onError: 'retry',
					retry: { maxAttempts: 3, backoff: 'fixed', waitMs: 500 },
				},
			],
			else: [],
		},
		{
			id: 'respond',
			kind: 'respond',
			label: 'Respond',
			status: 200,
			body: { contactId: expr(field('upsert', 'vid')) },
		},
	],
});

describe('compileWorkflow', () => {
	const compiled = compileWorkflow(customersApi, registry);
	const { workflow } = compiled;
	const byName = new Map(workflow.nodes.map((node) => [node.name, node]));

	it('emits one node per step plus control helpers', () => {
		expect([...byName.keys()].sort()).toEqual(
			[
				'Webhook',
				'Validate request',
				'Respond 400',
				'Store Audit Record',
				'Upsert Contact',
				'Merge',
				'Is New?',
				'Notify Sales',
				'Respond',
			].sort(),
		);
		expect(compiled.stepNodeNames).toMatchObject({
			webhook: 'Webhook',
			upsert: 'Upsert Contact',
			respond: 'Respond',
		});
	});

	it('binds discriminators, locators and expressions', () => {
		expect(byName.get('Webhook')?.parameters).toEqual({
			httpMethod: 'POST',
			path: 'customers',
			responseMode: 'responseNode',
			options: {},
		});
		expect(byName.get('Upsert Contact')?.parameters).toMatchObject({
			resource: 'contact',
			operation: 'upsert',
			email: '={{ $("Webhook").item.json.body.email }}',
		});
		expect(byName.get('Store Audit Record')?.parameters).toMatchObject({
			operation: 'insert',
			table: { __rl: true, mode: 'name', value: 'customer_requests' },
			columns: { mappingMode: 'autoMapInputData' },
		});
		expect(byName.get('Notify Sales')?.parameters).toMatchObject({
			resource: 'message',
			operation: 'post',
			channelId: { __rl: true, mode: 'name', value: '#sales' },
			text: 'New customer',
		});
		expect(byName.get('Respond')?.parameters).toEqual({
			respondWith: 'json',
			responseBody: '={{ ({ "contactId": $("Upsert Contact").item.json.vid }) }}',
			options: { responseCode: 200 },
		});
	});

	it('wires validation, parallel join, branch and response', () => {
		const main = (name: string) => workflow.connections[name]?.main ?? [];
		expect(main('Webhook')[0]).toEqual([{ node: 'Validate request', type: 'main', index: 0 }]);
		expect(
			main('Validate request')[0]
				?.map((c) => c.node)
				.sort(),
		).toEqual(['Store Audit Record', 'Upsert Contact']);
		expect(main('Validate request')[1]).toEqual([{ node: 'Respond 400', type: 'main', index: 0 }]);
		expect(main('Store Audit Record')[0]).toEqual([{ node: 'Merge', type: 'main', index: 0 }]);
		expect(main('Upsert Contact')[0]).toEqual([{ node: 'Merge', type: 'main', index: 1 }]);
		expect(main('Merge')[0]).toEqual([{ node: 'Is New?', type: 'main', index: 0 }]);
		expect(main('Is New?')[0]).toEqual([{ node: 'Notify Sales', type: 'main', index: 0 }]);
		expect(main('Is New?')[1]).toEqual([{ node: 'Respond', type: 'main', index: 0 }]);
		expect(main('Notify Sales')[0]).toEqual([{ node: 'Respond', type: 'main', index: 0 }]);
	});

	it('compiles conditions into filter parameters', () => {
		expect(byName.get('Is New?')?.parameters).toEqual({
			conditions: {
				options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
				conditions: [
					{
						id: 'condition-1',
						leftValue: '={{ $("Upsert Contact").item.json.isNew }}',
						rightValue: '',
						operator: { type: 'boolean', operation: 'true', singleValue: true },
					},
				],
				combinator: 'and',
			},
			options: {},
		});
	});

	it('applies retry settings and records generator metadata', () => {
		expect(byName.get('Notify Sales')).toMatchObject({
			retryOnFail: true,
			maxTries: 3,
			waitBetweenTries: 500,
		});
		expect(compiled.generator.compilerVersion).toBe('1.0.0');
		expect(compiled.warnings).toEqual([]);
	});

	it('is deterministic', () => {
		expect(compileWorkflow(customersApi, registry).workflow).toEqual(workflow);
	});
});

describe('compileWorkflow control flow', () => {
	it('compiles switch, map and dead-letter policies', () => {
		const ir: WorkflowIR = workflowIrSchema.parse({
			id: 'router',
			name: 'Router',
			triggers: [
				{
					id: 'schedule',
					kind: 'trigger',
					triggerKind: 'schedule',
					operation: { operationId: 'schedule.trigger' },
					params: { cron: '0 2 * * *' },
				},
			],
			steps: [
				{
					id: 'read',
					kind: 'action',
					operation: { operationId: 'postgres.row.select' },
					params: { table: 'orders' },
				},
				{
					id: 'loop',
					kind: 'map',
					batchSize: 5,
					steps: [
						{
							id: 'call',
							kind: 'action',
							operation: { operationId: 'http.request' },
							params: { url: 'https://api.example.com/orders' },
							onError: 'dead_letter',
						},
					],
				},
				{
					id: 'route',
					kind: 'switch',
					on: { type: 'input', path: ['status'] },
					cases: [
						{ value: 'paid', steps: [{ id: 'paid', kind: 'noop' }] },
						{ value: 'failed', steps: [{ id: 'failed', kind: 'noop' }] },
					],
					fallback: [{ id: 'other', kind: 'noop' }],
				},
			],
		});
		const compiled = compileWorkflow(ir, registry);
		const byName = new Map(compiled.workflow.nodes.map((node) => [node.name, node]));
		expect(byName.get('Schedule')?.parameters).toEqual({
			rule: { interval: [{ field: 'cronExpression', expression: '0 2 * * *' }] },
		});
		const main = (name: string) => compiled.workflow.connections[name]?.main ?? [];
		expect(main('Loop Over Items')[1]).toEqual([{ node: 'HTTP Request', type: 'main', index: 0 }]);
		expect(main('HTTP Request')[0]).toEqual([{ node: 'Loop Over Items', type: 'main', index: 0 }]);
		expect(main('HTTP Request')[1]).toEqual([
			{ node: 'Dead Letter: HTTP Request', type: 'main', index: 0 },
		]);
		expect(byName.get('HTTP Request')?.onError).toBe('continueErrorOutput');
		expect(main('Loop Over Items')[0]).toEqual([{ node: 'Switch', type: 'main', index: 0 }]);
		expect(main('Switch').map((slot) => slot?.[0]?.node)).toEqual([
			'No Operation',
			'No Operation 2',
			'No Operation 3',
		]);
		expect(byName.get('Switch')?.parameters).toMatchObject({
			options: { fallbackOutput: 'extra' },
		});
		expect(compiled.warnings.map((warning) => warning.code)).toEqual(['dead_letter_stub']);
	});
});
