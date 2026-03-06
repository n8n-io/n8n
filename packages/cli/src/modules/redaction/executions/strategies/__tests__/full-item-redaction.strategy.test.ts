import type { IRunExecutionData } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import type { RedactableExecution } from '@/executions/execution-redaction';
import type { RedactionContext } from '../../execution-redaction.interfaces';
import { FullItemRedactionStrategy } from '../full-item-redaction.strategy';

const makeContext = (overrides: Partial<RedactionContext> = {}): RedactionContext => ({
	user: { id: 'user-1' } as RedactionContext['user'],
	redactExecutionData: undefined,
	userCanReveal: false,
	...overrides,
});

const makeExecution = (runData: IRunExecutionData['resultData']['runData']): RedactableExecution =>
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
		workflowData: { settings: {}, nodes: [] },
	}) as unknown as RedactableExecution;

describe('FullItemRedactionStrategy', () => {
	let strategy: FullItemRedactionStrategy;

	beforeEach(() => {
		strategy = new FullItemRedactionStrategy();
	});

	it('has name "full-item-redaction"', () => {
		expect(strategy.name).toBe('full-item-redaction');
	});

	describe('item clearing', () => {
		it('clears json and binary and sets redaction marker on each item', async () => {
			const execution = makeExecution({
				NodeA: [
					{
						startTime: 0,
						executionIndex: 0,
						executionTime: 0,
						executionStatus: 'success',
						source: [],
						data: {
							main: [
								[
									{
										json: { secret: 'sensitive' },
										binary: { file: { mimeType: 'text/plain', data: 'abc' } },
									},
								],
							],
						},
					},
				],
			});

			await strategy.apply(execution, makeContext());

			const item = execution.data.resultData.runData.NodeA[0].data!.main[0]![0];
			expect(item.json).toEqual({});
			expect(item.binary).toBeUndefined();
			expect(item.redaction).toEqual({ redacted: true, reason: 'workflow_redaction_policy' });
		});

		it('redacts all items across multiple nodes', async () => {
			const execution = makeExecution({
				NodeA: [
					{
						startTime: 0,
						executionIndex: 0,
						executionTime: 0,
						executionStatus: 'success',
						source: [],
						data: { main: [[{ json: { a: 1 } }, { json: { b: 2 } }]] },
					},
				],
				NodeB: [
					{
						startTime: 0,
						executionIndex: 0,
						executionTime: 0,
						executionStatus: 'success',
						source: [],
						data: { main: [[{ json: { c: 3 } }]] },
					},
				],
			});

			await strategy.apply(execution, makeContext());

			for (const items of execution.data.resultData.runData.NodeA[0].data!.main) {
				for (const item of items!) {
					expect(item.json).toEqual({});
				}
			}
			expect(execution.data.resultData.runData.NodeB[0].data!.main[0]![0].json).toEqual({});
		});

		it('also redacts inputOverride', async () => {
			const execution = makeExecution({
				NodeA: [
					{
						startTime: 0,
						executionIndex: 0,
						executionTime: 0,
						executionStatus: 'success',
						source: [],
						data: { main: [[{ json: {} }]] },
						inputOverride: { main: [[{ json: { override: 'secret' } }]] },
					},
				],
			});

			await strategy.apply(execution, makeContext());

			const overrideItem = execution.data.resultData.runData.NodeA[0].inputOverride!.main[0]![0];
			expect(overrideItem.json).toEqual({});
			expect(overrideItem.redaction).toEqual({
				redacted: true,
				reason: 'workflow_redaction_policy',
			});
		});

		it('handles nodes with no items (null output slots)', async () => {
			const execution = makeExecution({
				NodeA: [
					{
						startTime: 0,
						executionIndex: 0,
						executionTime: 0,
						executionStatus: 'success',
						source: [],
						data: { main: [null] },
					},
				],
			});

			await expect(strategy.apply(execution, makeContext())).resolves.toBeUndefined();
		});

		it('does nothing when runData is empty', async () => {
			const execution = makeExecution({});
			await expect(strategy.apply(execution, makeContext())).resolves.toBeUndefined();
		});
	});

	describe('reason', () => {
		it('sets reason "user_requested" when redactExecutionData === true', async () => {
			const execution = makeExecution({
				NodeA: [
					{
						startTime: 0,
						executionIndex: 0,
						executionTime: 0,
						executionStatus: 'success',
						source: [],
						data: { main: [[{ json: { x: 1 } }]] },
					},
				],
			});

			await strategy.apply(execution, makeContext({ redactExecutionData: true }));

			const item = execution.data.resultData.runData.NodeA[0].data!.main[0]![0];
			expect(item.redaction?.reason).toBe('user_requested');
			expect(execution.data.redactionInfo?.reason).toBe('user_requested');
		});

		it('sets reason "workflow_redaction_policy" in all other cases', async () => {
			const execution = makeExecution({
				NodeA: [
					{
						startTime: 0,
						executionIndex: 0,
						executionTime: 0,
						executionStatus: 'success',
						source: [],
						data: { main: [[{ json: { x: 1 } }]] },
					},
				],
			});

			await strategy.apply(execution, makeContext({ redactExecutionData: undefined }));

			expect(execution.data.redactionInfo?.reason).toBe('workflow_redaction_policy');
		});
	});

	describe('error redaction', () => {
		const mockNode = {
			id: 'node-1',
			name: 'Test Node',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 1,
			position: [0, 0] as [number, number],
			parameters: {},
		};

		// Plain-object helpers representing post-DB-deserialization scenarios.
		// Errors loaded from the database are plain objects, not class instances,
		// because flatted deserialization does not reconstruct class prototypes.
		const makePlainNodeApiError = (httpCode: string | null = '404') =>
			({ name: 'NodeApiError', message: 'API error', httpCode }) as unknown as NodeApiError;

		const makePlainNodeOperationError = () =>
			({ name: 'NodeOperationError', message: 'Op error' }) as unknown as NodeOperationError;

		describe('item-level', () => {
			it('deletes item.error and stores safe metadata in item.redaction.error for NodeApiError', async () => {
				const error = new NodeApiError(mockNode, { message: 'Bad Gateway' }, { httpCode: '502' });
				const execution = makeExecution({
					NodeA: [
						{
							startTime: 0,
							executionIndex: 0,
							executionTime: 0,
							executionStatus: 'error',
							source: [],
							data: { main: [[{ json: { x: 1 }, error }]] },
						},
					],
				});

				await strategy.apply(execution, makeContext());

				const item = execution.data.resultData.runData.NodeA[0].data!.main[0]![0];
				expect(item.error).toBeUndefined();
				expect(item.redaction?.error).toEqual({ type: 'NodeApiError', httpCode: '502' });
			});

			it('stores only type (no httpCode) for NodeOperationError', async () => {
				const error = new NodeOperationError(mockNode, 'Something failed');
				const execution = makeExecution({
					NodeA: [
						{
							startTime: 0,
							executionIndex: 0,
							executionTime: 0,
							executionStatus: 'error',
							source: [],
							data: { main: [[{ json: {}, error }]] },
						},
					],
				});

				await strategy.apply(execution, makeContext());

				const item = execution.data.resultData.runData.NodeA[0].data!.main[0]![0];
				expect(item.error).toBeUndefined();
				expect(item.redaction?.error).toEqual({ type: 'NodeOperationError' });
				expect(item.redaction?.error).not.toHaveProperty('httpCode');
			});

			it('does not set item.redaction.error when item has no error', async () => {
				const execution = makeExecution({
					NodeA: [
						{
							startTime: 0,
							executionIndex: 0,
							executionTime: 0,
							executionStatus: 'success',
							source: [],
							data: { main: [[{ json: { x: 1 } }]] },
						},
					],
				});

				await strategy.apply(execution, makeContext());

				const item = execution.data.resultData.runData.NodeA[0].data!.main[0]![0];
				expect(item.redaction).not.toHaveProperty('error');
			});

			it('handles post-DB-deserialization plain-object NodeApiError (duck typing)', async () => {
				const execution = makeExecution({
					NodeA: [
						{
							startTime: 0,
							executionIndex: 0,
							executionTime: 0,
							executionStatus: 'error',
							source: [],
							data: { main: [[{ json: {}, error: makePlainNodeApiError('404') }]] },
						},
					],
				});

				await strategy.apply(execution, makeContext());

				const item = execution.data.resultData.runData.NodeA[0].data!.main[0]![0];
				expect(item.error).toBeUndefined();
				expect(item.redaction?.error).toEqual({ type: 'NodeApiError', httpCode: '404' });
			});
		});

		describe('task-level', () => {
			it('moves taskData.error to taskData.redactedError', async () => {
				const error = new NodeApiError(mockNode, { message: 'Forbidden' }, { httpCode: '403' });
				const execution = makeExecution({
					NodeA: [
						{
							startTime: 0,
							executionIndex: 0,
							executionTime: 0,
							executionStatus: 'error',
							source: [],
							data: { main: [[{ json: {} }]] },
							error,
						},
					],
				});

				await strategy.apply(execution, makeContext());

				const taskData = execution.data.resultData.runData.NodeA[0];
				expect(taskData.error).toBeUndefined();
				expect(taskData.redactedError).toEqual({ type: 'NodeApiError', httpCode: '403' });
			});

			it('does not set redactedError when task has no error', async () => {
				const execution = makeExecution({
					NodeA: [
						{
							startTime: 0,
							executionIndex: 0,
							executionTime: 0,
							executionStatus: 'success',
							source: [],
							data: { main: [[{ json: {} }]] },
						},
					],
				});

				await strategy.apply(execution, makeContext());

				expect(execution.data.resultData.runData.NodeA[0].redactedError).toBeUndefined();
			});

			it('sets httpCode: null for post-DB plain-object NodeApiError with null httpCode', async () => {
				// Exercises the `?? null` fallback in redactError when httpCode is null or absent.
				const execution = makeExecution({
					NodeA: [
						{
							startTime: 0,
							executionIndex: 0,
							executionTime: 0,
							executionStatus: 'error',
							source: [],
							error: makePlainNodeApiError(null),
						},
					],
				});

				await strategy.apply(execution, makeContext());

				const taskData = execution.data.resultData.runData.NodeA[0];
				expect(taskData.error).toBeUndefined();
				expect(taskData.redactedError).toEqual({ type: 'NodeApiError', httpCode: null });
			});
		});

		describe('workflow-level', () => {
			it('moves resultData.error to resultData.redactedError for NodeOperationError', async () => {
				const error = new NodeOperationError(mockNode, 'Workflow operation failed');
				const execution = makeExecution({});
				execution.data.resultData.error = error;

				await strategy.apply(execution, makeContext());

				expect(execution.data.resultData.error).toBeUndefined();
				expect(execution.data.resultData.redactedError).toEqual({ type: 'NodeOperationError' });
				expect(execution.data.resultData.redactedError).not.toHaveProperty('httpCode');
			});

			it('handles post-DB-deserialization plain-object NodeOperationError', async () => {
				const execution = makeExecution({});
				(execution.data.resultData as unknown as Record<string, unknown>).error =
					makePlainNodeOperationError();

				await strategy.apply(execution, makeContext());

				expect(execution.data.resultData.error).toBeUndefined();
				expect(execution.data.resultData.redactedError).toEqual({ type: 'NodeOperationError' });
				expect(execution.data.resultData.redactedError).not.toHaveProperty('httpCode');
			});

			it('does not set redactedError when resultData has no error', async () => {
				const execution = makeExecution({
					NodeA: [
						{
							startTime: 0,
							executionIndex: 0,
							executionTime: 0,
							executionStatus: 'success',
							source: [],
							data: { main: [[{ json: {} }]] },
						},
					],
				});

				await strategy.apply(execution, makeContext());

				expect(execution.data.resultData.redactedError).toBeUndefined();
			});
		});
	});

	describe('redactionInfo', () => {
		it('sets isRedacted: true with canReveal from context', async () => {
			const execution = makeExecution({
				NodeA: [
					{
						startTime: 0,
						executionIndex: 0,
						executionTime: 0,
						executionStatus: 'success',
						source: [],
						data: { main: [[{ json: { x: 1 } }]] },
					},
				],
			});

			await strategy.apply(execution, makeContext({ userCanReveal: true }));

			expect(execution.data.redactionInfo).toMatchObject({
				isRedacted: true,
				canReveal: true,
			});
		});

		it('merges into existing redactionInfo rather than overwriting', async () => {
			const execution = makeExecution({
				NodeA: [
					{
						startTime: 0,
						executionIndex: 0,
						executionTime: 0,
						executionStatus: 'success',
						source: [],
						data: { main: [[{ json: { x: 1 } }]] },
					},
				],
			});
			(execution.data as unknown as Record<string, unknown>).redactionInfo = {
				isRedacted: false,
				reason: 'prior_strategy',
				canReveal: true,
				extraField: 'preserved',
			};

			await strategy.apply(execution, makeContext());

			expect(execution.data.redactionInfo).toMatchObject({
				isRedacted: true,
				reason: 'workflow_redaction_policy',
				canReveal: false,
				extraField: 'preserved',
			});
		});
	});
});
