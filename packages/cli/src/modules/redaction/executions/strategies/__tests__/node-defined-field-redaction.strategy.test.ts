import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { IRedactedFieldMarker } from 'n8n-workflow';

import type { RedactableExecution } from '@/executions/execution-redaction';
import { NodeTypes } from '@/node-types';

import type { RedactionContext } from '../../execution-redaction.interfaces';
import { NodeDefinedFieldRedactionStrategy } from '../node-defined-field-redaction.strategy';

const makeContext = (overrides: Partial<RedactionContext> = {}): RedactionContext => ({
	user: { id: 'user-1' } as RedactionContext['user'],
	redactExecutionData: undefined,
	userCanReveal: false,
	...overrides,
});

const makeExecution = (
	nodes: Array<{ name: string; type: string; typeVersion: number }>,
	runData: Record<
		string,
		Array<{
			data?: Record<string, Array<Array<{ json: Record<string, unknown> }> | null>>;
		}>
	>,
): RedactableExecution =>
	({
		mode: 'manual',
		workflowId: 'wf-1',
		data: {
			version: 1,
			resultData: { runData },
			executionData: {
				contextData: {},
				nodeExecutionStack: [],
				metadata: {},
				waitingExecution: {},
				waitingExecutionSource: null,
			},
		},
		workflowData: {
			settings: {},
			nodes: nodes.map((n) => ({
				id: n.name,
				name: n.name,
				type: n.type,
				typeVersion: n.typeVersion,
				position: [0, 0] as [number, number],
				parameters: {},
			})),
		},
	}) as unknown as RedactableExecution;

const REDACTED_MARKER: IRedactedFieldMarker = {
	__redacted: true,
	reason: 'node_defined_field',
	canReveal: false,
};

describe('NodeDefinedFieldRedactionStrategy', () => {
	const logger = mockInstance(Logger);
	const nodeTypes = mockInstance(NodeTypes);
	let strategy: NodeDefinedFieldRedactionStrategy;

	const mockNodeDescription = (sensitiveOutputFields: string[]) => ({
		name: 'n8n-nodes-base.webhook',
		sensitiveOutputFields,
	});

	beforeEach(() => {
		jest.clearAllMocks();
		strategy = new NodeDefinedFieldRedactionStrategy(logger, nodeTypes);
	});

	it('has name "node-defined-field-redaction"', () => {
		expect(strategy.name).toBe('node-defined-field-redaction');
	});

	describe('field redaction', () => {
		it('redacts a field at a dot-notation path', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue({
				description: mockNodeDescription(['headers.authorization']),
			} as ReturnType<typeof nodeTypes.getByNameAndVersion>);

			const execution = makeExecution(
				[{ name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 1 }],
				{
					Webhook: [
						{
							data: {
								main: [
									[
										{
											json: {
												headers: {
													authorization: 'Bearer secret',
													'content-type': 'application/json',
												},
											},
										},
									],
								],
							},
						},
					],
				},
			);

			await strategy.apply(execution, makeContext());

			const item = execution.data.resultData.runData.Webhook[0].data!.main[0]![0];
			expect(item.json.headers).toEqual({
				authorization: REDACTED_MARKER,
				'content-type': 'application/json',
			});
		});

		it('redacts multiple declared fields on a single node independently', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue({
				description: mockNodeDescription(['headers.authorization', 'headers.cookie']),
			} as ReturnType<typeof nodeTypes.getByNameAndVersion>);

			const execution = makeExecution(
				[{ name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 1 }],
				{
					Webhook: [
						{
							data: {
								main: [
									[
										{
											json: {
												headers: {
													authorization: 'Bearer secret',
													cookie: 'session=abc',
												},
											},
										},
									],
								],
							},
						},
					],
				},
			);

			await strategy.apply(execution, makeContext());

			const item = execution.data.resultData.runData.Webhook[0].data!.main[0]![0];
			expect(item.json.headers).toEqual({
				authorization: REDACTED_MARKER,
				cookie: REDACTED_MARKER,
			});
		});

		it('handles multiple nodes each with different sensitiveOutputFields', async () => {
			nodeTypes.getByNameAndVersion
				.mockReturnValueOnce({
					description: mockNodeDescription(['headers.authorization']),
				} as ReturnType<typeof nodeTypes.getByNameAndVersion>)
				.mockReturnValueOnce({
					description: mockNodeDescription(['body.password']),
				} as ReturnType<typeof nodeTypes.getByNameAndVersion>);

			const execution = makeExecution(
				[
					{ name: 'NodeA', type: 'n8n-nodes-base.webhook', typeVersion: 1 },
					{ name: 'NodeB', type: 'n8n-nodes-base.httpRequest', typeVersion: 1 },
				],
				{
					NodeA: [{ data: { main: [[{ json: { headers: { authorization: 'secret' } } }]] } }],
					NodeB: [{ data: { main: [[{ json: { body: { password: 'hunter2' } } }]] } }],
				},
			);

			await strategy.apply(execution, makeContext());

			expect(
				(
					execution.data.resultData.runData.NodeA[0].data!.main[0]![0].json.headers as Record<
						string,
						unknown
					>
				).authorization,
			).toEqual(REDACTED_MARKER);
			expect(
				(
					execution.data.resultData.runData.NodeB[0].data!.main[0]![0].json.body as Record<
						string,
						unknown
					>
				).password,
			).toEqual(REDACTED_MARKER);
		});

		it('leaves items unchanged for a node with no sensitiveOutputFields', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue({
				description: { name: 'n8n-nodes-base.set', sensitiveOutputFields: [] as string[] },
			} as ReturnType<typeof nodeTypes.getByNameAndVersion>);

			const original = { name: 'Alice' };
			const execution = makeExecution(
				[{ name: 'Set', type: 'n8n-nodes-base.set', typeVersion: 1 }],
				{ Set: [{ data: { main: [[{ json: { name: 'Alice' } }]] } }] },
			);

			await strategy.apply(execution, makeContext());

			expect(execution.data.resultData.runData.Set[0].data!.main[0]![0].json).toEqual(original);
		});
	});

	describe('fail-fast path traversal', () => {
		it('silently skips when an intermediate path segment is missing', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue({
				description: mockNodeDescription(['headers.authorization']),
			} as ReturnType<typeof nodeTypes.getByNameAndVersion>);

			const execution = makeExecution(
				[{ name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 1 }],
				{
					Webhook: [
						{
							// no 'headers' key at all
							data: { main: [[{ json: { body: 'payload' } }]] },
						},
					],
				},
			);

			await expect(strategy.apply(execution, makeContext())).resolves.toBeUndefined();
			expect(execution.data.resultData.runData.Webhook[0].data!.main[0]![0].json).toEqual({
				body: 'payload',
			});
		});

		it('does not traverse sibling keys when one segment is missing', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue({
				description: mockNodeDescription(['deep.nested.field']),
			} as ReturnType<typeof nodeTypes.getByNameAndVersion>);

			const execution = makeExecution(
				[{ name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 1 }],
				{
					Webhook: [
						{
							data: {
								main: [
									[
										{
											// 'deep' exists but 'nested' is not an object
											json: { deep: 'scalar-value', sibling: 'untouched' },
										},
									],
								],
							},
						},
					],
				},
			);

			await strategy.apply(execution, makeContext());

			const item = execution.data.resultData.runData.Webhook[0].data!.main[0]![0];
			expect(item.json.deep).toBe('scalar-value');
			expect(item.json.sibling).toBe('untouched');
		});

		it('silently skips when the final field is not present', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue({
				description: mockNodeDescription(['headers.x-api-key']),
			} as ReturnType<typeof nodeTypes.getByNameAndVersion>);

			const execution = makeExecution(
				[{ name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 1 }],
				{
					Webhook: [
						{
							data: { main: [[{ json: { headers: { 'content-type': 'application/json' } } }]] },
						},
					],
				},
			);

			await strategy.apply(execution, makeContext());

			const item = execution.data.resultData.runData.Webhook[0].data!.main[0]![0];
			expect(item.json.headers).toEqual({ 'content-type': 'application/json' });
		});
	});

	describe('fail-closed behavior', () => {
		it('redacts all outputs conservatively when node type cannot be resolved', async () => {
			nodeTypes.getByNameAndVersion.mockImplementation(() => {
				throw new Error('Unknown node type');
			});

			const execution = makeExecution(
				[{ name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 1 }],
				{ Webhook: [{ data: { main: [[{ json: { headers: { authorization: 'secret' } } }]] } }] },
			);

			await expect(strategy.apply(execution, makeContext())).resolves.toBeUndefined();
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Could not load type for node "Webhook"'),
			);
			// Item should be fully wiped
			const item = execution.data.resultData.runData.Webhook[0].data!.main[0]![0];
			expect(item.json).toEqual({});
			expect(item.redaction).toEqual({ redacted: true, reason: 'node_type_unavailable' });
		});

		it('continues redacting other nodes and clears unknown-type node outputs', async () => {
			nodeTypes.getByNameAndVersion
				.mockImplementationOnce(() => {
					throw new Error('Unknown node type');
				})
				.mockReturnValueOnce({
					description: mockNodeDescription(['headers.authorization']),
				} as ReturnType<typeof nodeTypes.getByNameAndVersion>);

			const execution = makeExecution(
				[
					{ name: 'BadNode', type: 'n8n-nodes-base.unknown', typeVersion: 1 },
					{ name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 1 },
				],
				{
					BadNode: [{ data: { main: [[{ json: { secret: 'sensitive' } }]] } }],
					Webhook: [{ data: { main: [[{ json: { headers: { authorization: 'secret' } } }]] } }],
				},
			);

			await strategy.apply(execution, makeContext());

			// BadNode cleared conservatively
			const badItem = execution.data.resultData.runData.BadNode[0].data!.main[0]![0];
			expect(badItem.json).toEqual({});
			expect(badItem.redaction).toEqual({ redacted: true, reason: 'node_type_unavailable' });
			// Webhook still has field-level redaction
			expect(
				(
					execution.data.resultData.runData.Webhook[0].data!.main[0]![0].json.headers as Record<
						string,
						unknown
					>
				).authorization,
			).toEqual(REDACTED_MARKER);
		});
	});

	describe('IRedactedFieldMarker', () => {
		it('produced marker always has canReveal: false', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue({
				description: mockNodeDescription(['headers.authorization']),
			} as ReturnType<typeof nodeTypes.getByNameAndVersion>);

			const execution = makeExecution(
				[{ name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 1 }],
				{ Webhook: [{ data: { main: [[{ json: { headers: { authorization: 'secret' } } }]] } }] },
			);

			await strategy.apply(execution, makeContext({ userCanReveal: true }));

			const marker = (
				execution.data.resultData.runData.Webhook[0].data!.main[0]![0].json.headers as Record<
					string,
					unknown
				>
			).authorization as IRedactedFieldMarker;

			expect(marker.__redacted).toBe(true);
			expect(marker.reason).toBe('node_defined_field');
			expect(marker.canReveal).toBe(false);
		});
	});
});
