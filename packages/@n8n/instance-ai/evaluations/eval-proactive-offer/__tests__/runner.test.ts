import type { CapturedEvent } from '../../types';
import {
	extractConfirmationMessage,
	extractConfirmationRequestId,
	findCreatedWorkflowId,
	isEvalOfferConfirmation,
} from '../runner';

describe('eval-proactive-offer runner — pure helpers', () => {
	describe('extractConfirmationRequestId', () => {
		it('reads top-level requestId', () => {
			const event: CapturedEvent = {
				timestamp: 0,
				type: 'confirmation-request',
				data: { requestId: 'r1' },
			};
			expect(extractConfirmationRequestId(event)).toBe('r1');
		});

		it('reads requestId nested under payload', () => {
			const event: CapturedEvent = {
				timestamp: 0,
				type: 'confirmation-request',
				data: { payload: { requestId: 'r2' } },
			};
			expect(extractConfirmationRequestId(event)).toBe('r2');
		});

		it('returns undefined when no requestId is present', () => {
			const event: CapturedEvent = {
				timestamp: 0,
				type: 'confirmation-request',
				data: {},
			};
			expect(extractConfirmationRequestId(event)).toBeUndefined();
		});
	});

	describe('extractConfirmationMessage', () => {
		it('reads top-level message', () => {
			const event: CapturedEvent = {
				timestamp: 0,
				type: 'confirmation-request',
				data: { message: 'Update workflow X?' },
			};
			expect(extractConfirmationMessage(event)).toBe('Update workflow X?');
		});

		it('reads message nested under payload', () => {
			const event: CapturedEvent = {
				timestamp: 0,
				type: 'confirmation-request',
				data: { payload: { message: 'Generate an eval suite for AI node `Agent`?' } },
			};
			expect(extractConfirmationMessage(event)).toBe('Generate an eval suite for AI node `Agent`?');
		});
	});

	describe('isEvalOfferConfirmation', () => {
		it('matches the singular AI-node offer message', () => {
			const event: CapturedEvent = {
				timestamp: 0,
				type: 'confirmation-request',
				data: { payload: { message: 'Generate an eval suite for AI node `Agent`?' } },
			};
			expect(isEvalOfferConfirmation(event)).toBe(true);
		});

		it('matches the multi-node offer message', () => {
			const event: CapturedEvent = {
				timestamp: 0,
				type: 'confirmation-request',
				data: { message: 'Generate an eval suite for 3 AI nodes in this workflow?' },
			};
			expect(isEvalOfferConfirmation(event)).toBe(true);
		});

		it('does not match a workflow update confirmation', () => {
			const event: CapturedEvent = {
				timestamp: 0,
				type: 'confirmation-request',
				data: { payload: { message: 'Update workflow "Demo"?' } },
			};
			expect(isEvalOfferConfirmation(event)).toBe(false);
		});

		it('does not match a non-confirmation event with a similar message', () => {
			const event: CapturedEvent = {
				timestamp: 0,
				type: 'tool-call',
				data: { message: 'Generate an eval suite for AI node `Agent`?' },
			};
			expect(isEvalOfferConfirmation(event)).toBe(false);
		});
	});

	describe('findCreatedWorkflowId', () => {
		it('extracts the workflowId from a build outcome event', () => {
			const events: CapturedEvent[] = [
				{
					timestamp: 0,
					type: 'background-task-completed',
					data: {
						payload: {
							outcome: { workflowId: 'wf-built-123', triggerNodes: [] },
						},
					},
				},
			];
			expect(findCreatedWorkflowId(events)).toBe('wf-built-123');
		});

		it('returns undefined when no event carries an outcome.workflowId', () => {
			const events: CapturedEvent[] = [
				{ timestamp: 0, type: 'tool-call', data: { toolName: 'evals' } },
				{ timestamp: 1, type: 'message-delta', data: { text: 'hello' } },
			];
			expect(findCreatedWorkflowId(events)).toBeUndefined();
		});

		it('handles deeply nested outcome objects without infinite recursion on cycles', () => {
			const cycle: Record<string, unknown> = { name: 'self' };
			cycle.self = cycle;
			const events: CapturedEvent[] = [
				{
					timestamp: 0,
					type: 'background-task-completed',
					data: { cycle, payload: { outcome: { workflowId: 'wf-deep' } } },
				},
			];
			expect(findCreatedWorkflowId(events)).toBe('wf-deep');
		});

		it('returns undefined when outcome.workflowId is empty', () => {
			const events: CapturedEvent[] = [
				{
					timestamp: 0,
					type: 'background-task-completed',
					data: { payload: { outcome: { workflowId: '' } } },
				},
			];
			expect(findCreatedWorkflowId(events)).toBeUndefined();
		});
	});
});
