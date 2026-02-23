import { HumanMessage, AIMessage as AssistantMessage, ToolMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';

import type { TelemetryValidationStatus } from '../validation/types';
import { createTrimMessagesReducer, WorkflowState } from '../workflow-state';

describe('createTrimMessagesReducer', () => {
	it('should return messages unchanged when human messages are within limit', () => {
		const reducer = createTrimMessagesReducer(3);
		const messages: BaseMessage[] = [
			new HumanMessage('User 1'),
			new AssistantMessage('Assistant 1'),
			new ToolMessage({ content: 'Tool 1', tool_call_id: '1' }),
			new ToolMessage({ content: 'Tool 2', tool_call_id: '2' }),
			new AssistantMessage('Assistant 2'),
		];

		const result = reducer(messages);
		expect(result).toEqual(messages);
		expect(result.length).toBe(5);
	});

	it('should trim messages when human messages exceed limit', () => {
		const reducer = createTrimMessagesReducer(3);
		const messages: BaseMessage[] = [
			new HumanMessage('User 1'),
			new AssistantMessage('Assistant 1'),
			new ToolMessage({ content: 'Tool 1', tool_call_id: '1' }),
			new HumanMessage('User 2'),
			new AssistantMessage('Assistant 2'),
			new HumanMessage('User 3'),
			new AssistantMessage('Assistant 3'),
			new HumanMessage('User 4'),
			new AssistantMessage('Assistant 4'),
		];

		const result = reducer(messages);

		// Should keep only the last 3 HumanMessages
		const humanMessages = result.filter((msg) => msg instanceof HumanMessage);
		expect(humanMessages.length).toBe(3);

		// Should start with HumanMessage
		expect(result[0]).toBeInstanceOf(HumanMessage);
		expect((result[0] as HumanMessage).content).toBe('User 2');

		// Should preserve messages between HumanMessages
		expect(result.length).toBe(6); // User 2, Assistant 2, User 3, Assistant 3, User 4, Assistant 4
	});

	it('should handle typical conversation pattern', () => {
		const reducer = createTrimMessagesReducer(2);
		const messages: BaseMessage[] = [
			new HumanMessage('User 1'),
			new AssistantMessage('Assistant 1'),
			new ToolMessage({ content: 'Tool 1', tool_call_id: '1' }),
			new ToolMessage({ content: 'Tool 2', tool_call_id: '2' }),
			new AssistantMessage('Assistant 2'),
			new HumanMessage('User 2'),
			new AssistantMessage('Assistant 3'),
			new ToolMessage({ content: 'Tool 3', tool_call_id: '3' }),
			new ToolMessage({ content: 'Tool 4', tool_call_id: '4' }),
			new AssistantMessage('Assistant 4'),
			new HumanMessage('User 3'),
			new AssistantMessage('Assistant 5'),
			new ToolMessage({ content: 'Tool 5', tool_call_id: '5' }),
			new ToolMessage({ content: 'Tool 6', tool_call_id: '6' }),
			new AssistantMessage('Assistant 6'),
		];

		const result = reducer(messages);

		// Should keep only the last 2 HumanMessages
		const humanMessages = result.filter((msg) => msg instanceof HumanMessage);
		expect(humanMessages.length).toBe(2);

		// Should start with HumanMessage
		expect(result[0]).toBeInstanceOf(HumanMessage);
		expect((result[0] as HumanMessage).content).toBe('User 2');

		// Should include all messages from User 2 onwards
		expect(result.length).toBe(10);
		expect(result.map((m) => m.content)).toEqual([
			'User 2',
			'Assistant 3',
			'Tool 3',
			'Tool 4',
			'Assistant 4',
			'User 3',
			'Assistant 5',
			'Tool 5',
			'Tool 6',
			'Assistant 6',
		]);
	});

	it('should handle edge case with exactly maxUserMessages', () => {
		const reducer = createTrimMessagesReducer(2);
		const messages: BaseMessage[] = [
			new HumanMessage('User 1'),
			new AssistantMessage('Assistant 1'),
			new HumanMessage('User 2'),
			new AssistantMessage('Assistant 2'),
		];

		const result = reducer(messages);
		expect(result).toEqual(messages);
		expect(result.length).toBe(4);
	});

	it('should handle empty array', () => {
		const reducer = createTrimMessagesReducer(5);
		const messages: BaseMessage[] = [];

		const result = reducer(messages);
		expect(result).toEqual([]);
	});

	it('should handle array with no HumanMessages', () => {
		const reducer = createTrimMessagesReducer(5);
		const messages: BaseMessage[] = [
			new AssistantMessage('Assistant 1'),
			new ToolMessage({ content: 'Tool 1', tool_call_id: '1' }),
			new AssistantMessage('Assistant 2'),
		];

		const result = reducer(messages);
		expect(result).toEqual(messages);
	});

	it('should handle maxUserMessages = 1', () => {
		const reducer = createTrimMessagesReducer(1);
		const messages: BaseMessage[] = [
			new HumanMessage('User 1'),
			new AssistantMessage('Assistant 1'),
			new HumanMessage('User 2'),
			new AssistantMessage('Assistant 2'),
			new HumanMessage('User 3'),
			new AssistantMessage('Assistant 3'),
		];

		const result = reducer(messages);

		// Should keep only the last HumanMessage
		const humanMessages = result.filter((msg) => msg instanceof HumanMessage);
		expect(humanMessages.length).toBe(1);

		// Should start with User 3
		expect(result[0]).toBeInstanceOf(HumanMessage);
		expect((result[0] as HumanMessage).content).toBe('User 3');

		// Should only include User 3 and Assistant 3
		expect(result.length).toBe(2);
	});
});

describe('WorkflowState.validationHistory reducer', () => {
	// Helper to create TelemetryValidationStatus avoiding ESLint naming-convention warnings
	const createValidationStatus = (
		violations: Array<{ name: string; result: 'pass' | 'fail' }>,
	): TelemetryValidationStatus => {
		const status: Record<string, 'pass' | 'fail'> = {};
		for (const violation of violations) {
			status[violation.name] = violation.result;
		}
		return status as TelemetryValidationStatus;
	};

	it('should append new validation history to existing history', () => {
		const reducer = WorkflowState.spec.validationHistory.operator;

		const existingHistory: TelemetryValidationStatus[] = [
			createValidationStatus([
				{ name: 'tool-node-has-no-parameters', result: 'pass' },
				{ name: 'agent-static-prompt', result: 'fail' },
				{ name: 'workflow-has-no-nodes', result: 'pass' },
			]),
			createValidationStatus([
				{ name: 'tool-node-has-no-parameters', result: 'fail' },
				{ name: 'agent-static-prompt', result: 'pass' },
				{ name: 'workflow-has-no-nodes', result: 'pass' },
			]),
		];
		const newHistory: TelemetryValidationStatus[] = [
			createValidationStatus([
				{ name: 'tool-node-has-no-parameters', result: 'pass' },
				{ name: 'agent-static-prompt', result: 'pass' },
				{ name: 'workflow-has-no-nodes', result: 'pass' },
			]),
		];

		const result = reducer(existingHistory, newHistory);

		expect(result).toHaveLength(3);
		expect(result[0]).toBe(existingHistory[0]);
		expect(result[1]).toBe(existingHistory[1]);
		expect(result[2]).toBe(newHistory[0]);
	});

	it('should handle empty existing history with new updates', () => {
		const reducer = WorkflowState.spec.validationHistory.operator;

		const newHistory: TelemetryValidationStatus[] = [
			createValidationStatus([
				{ name: 'node-missing-required-input', result: 'pass' },
				{ name: 'node-merge-single-input', result: 'fail' },
			]),
		];

		const result = reducer([], newHistory);

		expect(result).toEqual(newHistory);
		expect(result[0]).toBe(newHistory[0]);
	});

	it('should handle multiple updates sequentially', () => {
		type ReducerFn = (
			x: TelemetryValidationStatus[],
			y: TelemetryValidationStatus[] | undefined | null,
		) => TelemetryValidationStatus[];
		const reducer = WorkflowState.spec.validationHistory.operator as ReducerFn;

		let history: TelemetryValidationStatus[] = [];

		// First update
		const update1: TelemetryValidationStatus[] = [
			createValidationStatus([{ name: 'tool-node-has-no-parameters', result: 'pass' }]),
		];
		history = reducer(history, update1);
		expect(history).toHaveLength(1);
		expect(history[0]).toBe(update1[0]);

		// Second update (undefined - should not change)
		const prevHistory = history;
		history = reducer(history, undefined);
		expect(history).toBe(prevHistory);
		expect(history).toHaveLength(1);

		// Third update
		const update2: TelemetryValidationStatus[] = [
			createValidationStatus([{ name: 'agent-static-prompt', result: 'fail' }]),
		];
		history = reducer(history, update2);
		expect(history).toHaveLength(2);
		expect(history[0]).toBe(update1[0]);
		expect(history[1]).toBe(update2[0]);

		// Fourth update (empty array - should not change)
		const prevHistory2 = history;
		history = reducer(history, []);
		expect(history).toBe(prevHistory2);
		expect(history).toHaveLength(2);
	});
});

describe('WorkflowState.techniqueCategories reducer', () => {
	it('should append new technique categories to existing categories', () => {
		const reducer = WorkflowState.spec.techniqueCategories.operator;

		const existingCategories = ['scraping', 'data-transformation'];
		const newCategories = ['notifications', 'scheduling'];

		const result = reducer(existingCategories, newCategories);

		expect(result).toHaveLength(4);
		expect(result).toEqual(['scraping', 'data-transformation', 'notifications', 'scheduling']);
	});

	it('should return existing categories when update is undefined', () => {
		type ReducerFn = (x: string[], y: string[] | undefined | null) => string[];
		const reducer = WorkflowState.spec.techniqueCategories.operator as ReducerFn;

		const existingCategories = ['api-integration', 'webhook'];

		const result = reducer(existingCategories, undefined);

		expect(result).toEqual(existingCategories);
		expect(result).toBe(existingCategories);
	});

	it('should handle empty existing categories with new updates', () => {
		const reducer = WorkflowState.spec.techniqueCategories.operator;

		const newCategories = ['email-automation', 'file-processing'];

		const result = reducer([], newCategories);

		expect(result).toEqual(newCategories);
		expect(result[0]).toBe(newCategories[0]);
	});
});
