import {
	createTestNode,
	createTestTaskData,
	createTestWorkflowExecutionResponse,
	createTestWorkflowObject,
} from '@/__tests__/mocks';
import type { LogEntry } from '../logs.types';
import { v4 as uuid } from 'uuid';

export function createTestLogEntry(data: Partial<LogEntry> = {}): LogEntry {
	const executionId = data.executionId ?? 'test-execution-id';

	return {
		node: createTestNode(),
		runIndex: 0,
		runData: createTestTaskData({}),
		id: uuid(),
		children: [],
		consumedTokens: { completionTokens: 0, totalTokens: 0, promptTokens: 0, isEstimate: false },
		workflow: createTestWorkflowObject(),
		executionId,
		execution: createTestWorkflowExecutionResponse({ id: executionId }).data!,
		isSubExecution: false,
		...data,
	};
}
