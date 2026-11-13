import { DynamicStructuredTool, DynamicTool } from '@langchain/classic/tools';
import type { EngineResponse, IDataObject } from 'n8n-workflow';
import { z } from 'zod';

import { buildHitlNodeInput, createEngineRequests } from '../createEngineRequests';
import { processHitlResponses } from '../processHitlResponses';
import type { RequestResponseMetadata } from '../types';

// Same lookup order as `$tool` in the expression proxy: `query.<name>` first, then `<name>`.
const resolveToolForMessage = (input: IDataObject) => {
	const own = (o: unknown, k: string) =>
		o && typeof o === 'object' && Object.hasOwn(o, k) ? (o as IDataObject)[k] : undefined;
	return {
		name: own(own(input, 'query'), 'tool') ?? own(input, 'tool'),
		parameters: own(own(input, 'query'), 'toolParameters') ?? own(input, 'toolParameters'),
	};
};

const gatedTool = new DynamicStructuredTool({
	name: 'refund',
	description: 'refund',
	schema: z.object({
		toolParameters: z.object({ amount: z.number() }),
		hitlParameters: z.object({ note: z.string(), query: z.unknown() }),
	}),
	func: async () => '',
	metadata: {
		sourceNodeName: 'Review',
		gatedToolNodeName: 'Toolkit',
		isFromToolkit: true,
	},
});

const approve = (
	actions: ReturnType<typeof createEngineRequests>,
): EngineResponse<RequestResponseMetadata> => ({
	actionResponses: actions.map((action) => ({
		action,
		data: {
			data: { ai_tool: [[{ json: { approved: true } }]] },
			executionTime: 0,
			startTime: 0,
			executionIndex: 0,
			source: [],
		},
	})),
	metadata: {},
});

const createAction = (toolInput: IDataObject, itemIndex = 0, toolCallId = 'call-1') =>
	createEngineRequests([{ tool: 'refund', toolCallId, toolInput }], itemIndex, [gatedTool])[0];

describe('HITL tool call round trip', () => {
	it('shows the same tool and parameters in the review message as the call that runs', () => {
		const action = createAction({
			toolParameters: { amount: 100 },
			hitlParameters: { note: 'hello' },
			query: { tool: 'lookup', toolParameters: { amount: 1 } },
		});

		expect(action.input).toEqual({
			note: 'hello',
			tool: 'refund',
			toolParameters: { amount: 100 },
		});
		expect(resolveToolForMessage(action.input)).toEqual({
			name: 'refund',
			parameters: { amount: 100 },
		});

		const { pendingGatedToolRequest } = processHitlResponses(approve([action]), 0);
		expect(pendingGatedToolRequest?.actions[0].input).toEqual({ tool: 'refund', amount: 100 });
	});

	it('ignores tool, toolParameters, object query and undeclared keys in hitlParameters', () => {
		const action = createAction({
			toolParameters: { amount: 100 },
			hitlParameters: {
				note: 'hello',
				tool: 'lookup',
				toolParameters: { amount: 1 },
				query: { tool: 'lookup' },
				extra: 'value',
			},
		});

		expect(action.input).toEqual({
			note: 'hello',
			tool: 'refund',
			toolParameters: { amount: 100 },
		});
		expect(resolveToolForMessage(action.input).name).toBe('refund');
	});

	it('keeps a declared primitive query HITL parameter', () => {
		const action = createAction({
			toolParameters: { amount: 100 },
			hitlParameters: { note: 'hello', query: 'text' },
		});

		expect(action.input.query).toBe('text');
	});

	describe('gated tools with a string input schema', () => {
		const toolInput = {
			toolParameters: { input: 'print(1)' },
			hitlParameters: { message: 'Approve?', query: { tool: 'other' } },
			query: { tool: 'other' },
		};

		it.each([
			[
				'wrapped schema',
				z.object({
					toolParameters: new DynamicTool({ name: 'c', description: 'c', func: async () => '' })
						.schema,
					hitlParameters: z.object({ message: z.string() }),
				}),
			],
			['schema without HITL parameters', { type: 'object', properties: {} }],
		])('passes the HITL parameters to the HITL node (%s)', (_, schema) => {
			const tool = new DynamicStructuredTool({
				name: 'code',
				description: 'code',
				schema: z.object({}),
				func: async () => '',
				metadata: { sourceNodeName: 'Review', gatedToolNodeName: 'Code', isFromToolkit: true },
			});
			Object.defineProperty(tool, 'schema', { value: schema });

			const [action] = createEngineRequests([{ tool: 'code', toolCallId: 'c1', toolInput }], 0, [
				tool,
			]);

			expect(action.input).toEqual({
				message: 'Approve?',
				tool: 'code',
				toolParameters: { input: 'print(1)' },
			});
		});
	});

	describe('buildHitlNodeInput', () => {
		const hitlParameters = {
			note: 'hello',
			tool: 'lookup',
			toolParameters: { amount: 1 },
			query: { tool: 'lookup' },
			extra: 'value',
		};

		it('keeps the HITL parameters declared in a JSON Schema', () => {
			const schema = {
				type: 'object',
				properties: {
					toolParameters: { type: 'object' },
					hitlParameters: { type: 'object', properties: { note: { type: 'string' } } },
				},
			};

			expect(buildHitlNodeInput({ schema }, hitlParameters, 'refund', { amount: 100 })).toEqual({
				note: 'hello',
				tool: 'refund',
				toolParameters: { amount: 100 },
			});
		});

		it('keeps all HITL parameters when the schema declares none', () => {
			expect(
				buildHitlNodeInput({ schema: undefined }, hitlParameters, 'refund', { amount: 100 }),
			).toEqual({
				note: 'hello',
				extra: 'value',
				tool: 'refund',
				toolParameters: { amount: 100 },
			});
		});
	});

	describe('item scoping', () => {
		const actions = [
			createAction({ toolParameters: { amount: 1 }, hitlParameters: { note: 'a' } }, 0, 'call-0'),
			createAction({ toolParameters: { amount: 2 }, hitlParameters: { note: 'b' } }, 1, 'call-1'),
		];

		it('runs each approved call once, for the item that requested it', () => {
			const response = approve(actions);

			const first = processHitlResponses(response, 0, 1).pendingGatedToolRequest?.actions;
			const second = processHitlResponses(response, 1, 1).pendingGatedToolRequest?.actions;

			expect(first).toHaveLength(1);
			expect(first?.[0]).toMatchObject({ id: 'call-0', metadata: { itemIndex: 0 } });
			expect(first?.[0].input).toEqual({ tool: 'refund', amount: 1 });
			expect(second).toHaveLength(1);
			expect(second?.[0]).toMatchObject({ id: 'call-1', metadata: { itemIndex: 1 } });
			expect(second?.[0].input).toEqual({ tool: 'refund', amount: 2 });
		});

		it('handles every item of a multi-item batch with its own item index', () => {
			const result = processHitlResponses(approve(actions), 0, 2);

			expect(result.pendingGatedToolRequest?.actions.map((a) => a.metadata.itemIndex)).toEqual([
				0, 1,
			]);
		});

		it('returns no gated call for a batch without matching responses', () => {
			const result = processHitlResponses(approve(actions), 2, 1);

			expect(result.hasApprovedHitlTools).toBe(false);
			expect(result.pendingGatedToolRequest).toBeUndefined();
			expect(result.processedResponse.actionResponses).toEqual([]);
		});
	});
});
