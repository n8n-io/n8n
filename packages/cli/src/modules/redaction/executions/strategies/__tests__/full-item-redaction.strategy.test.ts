import type { IRunExecutionData } from 'n8n-workflow';

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
						executionTime: 0,
						executionStatus: 'success',
						source: [],
						data: { main: [[{ json: { a: 1 } }, { json: { b: 2 } }]] },
					},
				],
				NodeB: [
					{
						startTime: 0,
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

	describe('redactionInfo', () => {
		it('sets isRedacted: true with canReveal from context', async () => {
			const execution = makeExecution({
				NodeA: [
					{
						startTime: 0,
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
