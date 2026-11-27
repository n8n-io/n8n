import type { IRunExecutionData } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import type { RedactableExecution } from '@n8n/backend-services';

import type { RedactionContext } from '../../execution-redaction.interfaces';
import { FullItemRedactionStrategy } from '../full-item-redaction.strategy';

const makeContext = (overrides: Partial<RedactionContext> = {}): RedactionContext => ({
	user: { id: 'user-1' } as RedactionContext['user'],
	redactExecutionData: undefined,
	userCanReveal: false,
	enforceDynCredRedaction: false,
	enforceCredentialUsabilityRedaction: false,
	inaccessibleCredentialIds: [],
	redactedBySubWorkflow: false,
	memo: new Map(),
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

		it('sets reason "dynamic_credentials" when enforceDynCredRedaction is true', async () => {
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

			await strategy.apply(execution, makeContext({ enforceDynCredRedaction: true }));

			const item = execution.data.resultData.runData.NodeA[0].data!.main[0]![0];
			expect(item.redaction?.reason).toBe('dynamic_credentials');
			expect(execution.data.redactionInfo?.reason).toBe('dynamic_credentials');
		});

		it('sets reason "credential_inaccessible" when enforceCredentialUsabilityRedaction is true', async () => {
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

			await strategy.apply(
				execution,
				makeContext({
					enforceCredentialUsabilityRedaction: true,
					inaccessibleCredentialIds: ['alice-gmail'],
				}),
			);

			const item = execution.data.resultData.runData.NodeA[0].data!.main[0]![0];
			expect(item.redaction?.reason).toBe('credential_inaccessible');
			expect(execution.data.redactionInfo?.reason).toBe('credential_inaccessible');
			// Names the credentials, so the editor can link to where access is granted.
			expect(execution.data.redactionInfo?.credentialIds).toEqual(['alice-gmail']);
		});

		it('prefers "dynamic_credentials" over "credential_inaccessible" when both are set', async () => {
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

			await strategy.apply(
				execution,
				makeContext({ enforceDynCredRedaction: true, enforceCredentialUsabilityRedaction: true }),
			);

			expect(execution.data.redactionInfo?.reason).toBe('dynamic_credentials');
		});

		describe('sub-workflow redaction', () => {
			const execution = () =>
				makeExecution({
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

			it('sets reason "sub_workflow_redaction_policy" when redactedBySubWorkflow is true', async () => {
				const target = execution();

				await strategy.apply(target, makeContext({ redactedBySubWorkflow: true }));

				const item = target.data.resultData.runData.NodeA[0].data!.main[0]![0];
				expect(item.redaction?.reason).toBe('sub_workflow_redaction_policy');
				expect(target.data.redactionInfo?.reason).toBe('sub_workflow_redaction_policy');
			});

			it('prefers "user_requested" over "sub_workflow_redaction_policy"', async () => {
				const target = execution();

				await strategy.apply(
					target,
					makeContext({ redactedBySubWorkflow: true, redactExecutionData: true }),
				);

				expect(target.data.redactionInfo?.reason).toBe('user_requested');
			});

			it('prefers "dynamic_credentials" over "sub_workflow_redaction_policy"', async () => {
				const target = execution();

				await strategy.apply(
					target,
					makeContext({ redactedBySubWorkflow: true, enforceDynCredRedaction: true }),
				);

				expect(target.data.redactionInfo?.reason).toBe('dynamic_credentials');
			});
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
				// Exercises the `null` fallback in redactExecutionError when httpCode is null or absent.
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

	describe('executionData subtrees', () => {
		const stackNode = {
			id: 'node-1',
			name: 'Test Node',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 1,
			position: [0, 0] as [number, number],
			parameters: {},
		};

		it('clears item json and binary in nodeExecutionStack', async () => {
			const execution = makeExecution({});
			execution.data.executionData!.nodeExecutionStack = [
				{
					node: stackNode,
					source: null,
					data: {
						main: [
							[
								{
									json: { secret: 'stack-value' },
									binary: { file: { mimeType: 'text/plain', data: 'abc' } },
								},
							],
						],
					},
				},
			];

			await strategy.apply(execution, makeContext());

			const item = execution.data.executionData!.nodeExecutionStack[0].data.main[0]![0];
			expect(item.json).toEqual({});
			expect(item.binary).toBeUndefined();
			expect(item.redaction).toEqual({ redacted: true, reason: 'workflow_redaction_policy' });
		});

		it('moves item error to redaction.error in nodeExecutionStack', async () => {
			const error = new NodeApiError(stackNode, { message: 'Bad Gateway' }, { httpCode: '502' });
			const execution = makeExecution({});
			execution.data.executionData!.nodeExecutionStack = [
				{
					node: stackNode,
					source: null,
					data: { main: [[{ json: { secret: 'stack-value' }, error }]] },
				},
			];

			await strategy.apply(execution, makeContext());

			const item = execution.data.executionData!.nodeExecutionStack[0].data.main[0]![0];
			expect(item.error).toBeUndefined();
			expect(item.redaction?.error).toEqual({ type: 'NodeApiError', httpCode: '502' });
		});

		it('clears item json and binary in waitingExecution', async () => {
			const execution = makeExecution({});
			execution.data.executionData!.waitingExecution = {
				'Test Node': {
					0: {
						main: [
							[
								{
									json: { secret: 'waiting-value' },
									binary: { file: { mimeType: 'text/plain', data: 'abc' } },
								},
							],
						],
					},
				},
			};

			await strategy.apply(execution, makeContext());

			const item = execution.data.executionData!.waitingExecution['Test Node'][0].main[0]![0];
			expect(item.json).toEqual({});
			expect(item.binary).toBeUndefined();
			expect(item.redaction).toEqual({ redacted: true, reason: 'workflow_redaction_policy' });
		});

		it('does nothing when executionData has no stack or waiting items', async () => {
			const execution = makeExecution({});
			await expect(strategy.apply(execution, makeContext())).resolves.toBeUndefined();
		});
	});

	describe('metadata and highlighted data', () => {
		const agentNode = {
			id: 'agent-1',
			name: 'AI Agent',
			type: '@n8n/n8n-nodes-langchain.agent',
			typeVersion: 3,
			position: [0, 0] as [number, number],
			parameters: {},
		};

		const makeSubNodeExecutionData = () => ({
			actions: [
				{
					nodeName: 'Tool',
					runIndex: 0,
					action: {
						actionType: 'ExecutionNodeAction' as const,
						nodeName: 'Tool',
						input: { query: 'tool-argument' },
						type: 'ai_tool' as const,
						id: 'call-1',
						metadata: { itemIndex: 0, reasoning: 'model-reasoning' },
					},
				},
			],
			metadata: { previousRequests: ['earlier-request'] },
		});

		it('removes subNodeExecutionData from saved runs and keeps other metadata', async () => {
			const execution = makeExecution({
				'AI Agent': [
					{
						startTime: 0,
						executionIndex: 0,
						executionTime: 0,
						executionStatus: 'success',
						source: [],
						data: { main: [[{ json: { output: 'answer' } }]] },
						metadata: {
							subNodeExecutionData: makeSubNodeExecutionData(),
							subRun: [{ node: 'Tool', runIndex: 0 }],
						},
					},
				],
			});

			await strategy.apply(execution, makeContext());

			const metadata = execution.data.resultData.runData['AI Agent'][0].metadata;
			expect(metadata).not.toHaveProperty('subNodeExecutionData');
			expect(metadata?.subRun).toEqual([{ node: 'Tool', runIndex: 0 }]);
		});

		it('removes subNodeExecutionData from the execution stack of a waiting agent', async () => {
			const execution = makeExecution({});
			execution.data.executionData!.nodeExecutionStack = [
				{
					node: agentNode,
					source: null,
					data: { main: [[{ json: { chatInput: 'hello' } }]] },
					metadata: { subNodeExecutionData: makeSubNodeExecutionData() },
				},
			];
			execution.data.executionData!.metadata = {
				'AI Agent': [{ subNodeExecutionData: makeSubNodeExecutionData() }],
			};

			await strategy.apply(execution, makeContext());

			expect(execution.data.executionData!.nodeExecutionStack[0].metadata).not.toHaveProperty(
				'subNodeExecutionData',
			);
			expect(execution.data.executionData!.metadata['AI Agent'][0]).not.toHaveProperty(
				'subNodeExecutionData',
			);
		});

		it('clears highlighted data in resultData.metadata and customData', async () => {
			const execution = makeExecution({});
			execution.data.resultData.metadata = { chatInput: 'hello', sessionId: 'session-1' };
			execution.customData = { chatInput: 'hello', sessionId: 'session-1' };

			await strategy.apply(execution, makeContext());

			expect(execution.data.resultData.metadata).toBeUndefined();
			expect(execution.customData).toEqual({});
		});

		it('clears highlighted data and sets redactionInfo when the execution has no runData', async () => {
			const execution = makeExecution({});
			delete (execution.data.resultData as Partial<typeof execution.data.resultData>).runData;
			execution.data.resultData.metadata = { chatInput: 'hello' };
			execution.customData = { chatInput: 'hello' };

			await strategy.apply(execution, makeContext());

			expect(execution.data.resultData.metadata).toBeUndefined();
			expect(execution.customData).toEqual({});
			expect(execution.data.redactionInfo).toMatchObject({ isRedacted: true });
		});

		it('does not add customData when the execution has none', async () => {
			const execution = makeExecution({});

			await strategy.apply(execution, makeContext());

			expect(execution).not.toHaveProperty('customData');
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

it('removes temporary Agent results from node context without changing other state', async () => {
	const execution = makeExecution({});
	execution.data.executionData!.contextData = {
		'node:Agent': {
			agentInvocations: {
				runIndex: 0,
				items: [{ threadId: 'thread', result: { response: 'private response' } }],
			},
			otherState: 'preserved',
		},
	};
	await new FullItemRedactionStrategy().apply(execution, makeContext());
	expect(execution.data.executionData!.contextData['node:Agent']).toEqual({
		otherState: 'preserved',
	});
	expect(JSON.stringify(execution.data)).not.toContain('private response');
});
