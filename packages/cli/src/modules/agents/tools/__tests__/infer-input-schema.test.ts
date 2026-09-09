import type { INode } from 'n8n-workflow';
import { z } from 'zod';

import {
	getFixedWorkflowToolInputs,
	inferInputSchema,
	listWorkflowInputFields,
	mergeWorkflowToolInput,
	omitFixedFieldsFromSchema,
} from '../workflow-tool-factory';

function makeExecuteWorkflowTrigger(parameters: INode['parameters']): INode {
	return {
		id: 'trigger-1',
		name: 'When Executed by Another Workflow',
		type: 'n8n-nodes-base.executeWorkflowTrigger',
		typeVersion: 1.1,
		position: [0, 0],
		parameters,
	};
}

describe('inferInputSchema — executeWorkflow', () => {
	it('returns a catchall schema for Accept all data (passthrough)', () => {
		const trigger = makeExecuteWorkflowTrigger({
			inputSource: 'passthrough',
			// Stale values must not win over passthrough
			workflowInputs: {
				values: [{ name: 'chatId', type: 'string' }],
			},
		});

		const schema = inferInputSchema(trigger, 'executeWorkflow');
		expect(listWorkflowInputFields(trigger)).toEqual([]);
		expect(schema.parse({ chatId: 123, extra: true })).toEqual({ chatId: 123, extra: true });
	});

	it('builds named optional fields for Define using fields below', () => {
		const trigger = makeExecuteWorkflowTrigger({
			inputSource: 'workflowInputs',
			workflowInputs: {
				values: [
					{ name: 'chatId', type: 'string' },
					{ name: 'shoppingListId', type: 'string' },
					{ name: 'count', type: 'number' },
					{ name: 'tags', type: 'array' },
					{ name: 'meta', type: 'object' },
					{ name: 'anything', type: 'any' },
				],
			},
		});

		const schema = inferInputSchema(trigger, 'executeWorkflow');
		expect(listWorkflowInputFields(trigger).map((f) => f.name)).toEqual([
			'chatId',
			'shoppingListId',
			'count',
			'tags',
			'meta',
			'anything',
		]);

		expect(
			schema.parse({
				chatId: 987654321,
				shoppingListId: 'OySx3QNU0BcCs8yz',
				count: '3',
				tags: ['a'],
				meta: { x: 1 },
				anything: { nested: true },
			}),
		).toEqual({
			chatId: '987654321',
			shoppingListId: 'OySx3QNU0BcCs8yz',
			count: 3,
			tags: ['a'],
			meta: { x: 1 },
			anything: { nested: true },
		});
	});

	it('accepts missing fields as undefined (trigger fills null)', () => {
		const trigger = makeExecuteWorkflowTrigger({
			inputSource: 'workflowInputs',
			workflowInputs: {
				values: [
					{ name: 'chatId', type: 'string' },
					{ name: 'botName', type: 'string' },
				],
			},
		});

		const schema = inferInputSchema(trigger, 'executeWorkflow');
		expect(schema.parse({ chatId: '1' })).toEqual({ chatId: '1' });
	});

	it('uses jsonExample keys only when inputSource is jsonExample', () => {
		const trigger = makeExecuteWorkflowTrigger({
			inputSource: 'jsonExample',
			jsonExample: JSON.stringify({ orderId: 'abc', qty: 2 }),
			workflowInputs: {
				values: [{ name: 'stale', type: 'string' }],
			},
		});

		const schema = inferInputSchema(trigger, 'executeWorkflow');
		expect(listWorkflowInputFields(trigger).map((f) => f.name)).toEqual(['orderId', 'qty']);
		expect(schema.parse({ orderId: 'abc', qty: '2' })).toEqual({ orderId: 'abc', qty: 2 });
	});

	it('ignores stale jsonExample when inputSource is workflowInputs', () => {
		const trigger = makeExecuteWorkflowTrigger({
			inputSource: 'workflowInputs',
			jsonExample: JSON.stringify({ orderId: 'abc' }),
			workflowInputs: {
				values: [{ name: 'chatId', type: 'string' }],
			},
		});

		const schema = inferInputSchema(trigger, 'executeWorkflow');
		expect(listWorkflowInputFields(trigger).map((f) => f.name)).toEqual(['chatId']);
		expect(schema.parse({ chatId: 'x' })).toEqual({ chatId: 'x' });
	});

	it('defaults to passthrough when inputSource is absent (legacy / imported triggers)', () => {
		// Mirrors the runtime fallback `getNodeParameter(INPUT_SOURCE, 0, PASSTHROUGH)`:
		// legacy node versions < 1.1 and imported triggers without a saved inputSource
		// pass all input data through, so the inferred schema must stay open even if
		// stale workflowInputs are present.
		const trigger = makeExecuteWorkflowTrigger({
			workflowInputs: {
				values: [{ name: 'chatId', type: 'string' }],
			},
		});

		const schema = inferInputSchema(trigger, 'executeWorkflow');
		expect(listWorkflowInputFields(trigger)).toEqual([]);
		expect(schema.parse({ chatId: 123, anything: true })).toEqual({
			chatId: 123,
			anything: true,
		});
	});
});

describe('fixed workflow tool inputs', () => {
	it('extracts fixed values and omits them from the LLM schema', () => {
		const schema = z.object({
			chatId: z.string().optional(),
			shoppingListId: z.string().optional(),
			botName: z.string().optional(),
		});
		const inputs = {
			shoppingListId: { mode: 'fixed' as const, value: 'OySx3QNU0BcCs8yz' },
			botName: { mode: 'fixed' as const, value: 'Jarvis' },
			chatId: { mode: 'ai' as const },
		};

		expect(getFixedWorkflowToolInputs(inputs)).toEqual({
			shoppingListId: 'OySx3QNU0BcCs8yz',
			botName: 'Jarvis',
		});

		const llmSchema = omitFixedFieldsFromSchema(schema, inputs);
		expect(Object.keys(llmSchema.shape)).toEqual(['chatId']);
		expect(
			mergeWorkflowToolInput(
				llmSchema.parse({ chatId: '42' }) as Record<string, unknown>,
				inputs,
				schema,
			),
		).toEqual({
			chatId: '42',
			shoppingListId: 'OySx3QNU0BcCs8yz',
			botName: 'Jarvis',
		});
	});

	it('preserves catchall when omitting fixed keys from an open schema', () => {
		const schema = z.object({}).catchall(z.unknown());
		const inputs = { pinned: { mode: 'fixed' as const, value: 'yes' } };
		const llmSchema = omitFixedFieldsFromSchema(schema, inputs);
		expect(llmSchema.parse({ anything: 1 })).toEqual({ anything: 1 });
		expect(mergeWorkflowToolInput({ anything: 1 }, inputs, schema)).toEqual({
			anything: 1,
			pinned: 'yes',
		});
	});

	it('coerces fixed values to the declared field type via the full schema', () => {
		// A number field with a string fixed value (e.g. from a legacy config)
		// must be coerced to a number before reaching the sub-workflow.
		const schema = z.object({
			count: z.coerce.number().nullable().optional(),
			label: z.coerce.string().nullable().optional(),
			active: z.boolean().nullable().optional(),
		});
		const inputs = {
			count: { mode: 'fixed' as const, value: '3' },
			label: { mode: 'fixed' as const, value: 42 },
			active: { mode: 'fixed' as const, value: true },
		};

		const merged = mergeWorkflowToolInput({}, inputs, schema);
		expect(merged).toEqual({ count: 3, label: '42', active: true });
		expect(typeof merged.count).toBe('number');
		expect(typeof merged.label).toBe('string');
		expect(typeof merged.active).toBe('boolean');
	});
});
