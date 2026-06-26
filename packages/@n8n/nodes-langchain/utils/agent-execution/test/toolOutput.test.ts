import type { EngineResponse, ExecutionError } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { getToolOutputFromExecutionData, stringifyToolOutput } from '../toolOutput';
import type { RequestResponseMetadata } from '../types';

type ActionResponseData =
	EngineResponse<RequestResponseMetadata>['actionResponses'][number]['data'];

describe('toolOutput', () => {
	it('should stringify primitive outputs', () => {
		expect(stringifyToolOutput('search result')).toBe(JSON.stringify('search result'));
	});

	it('should ignore undefined outputs', () => {
		expect(stringifyToolOutput(undefined)).toBeUndefined();
	});

	it('should replace circular references when stringifying outputs', () => {
		const output: { self?: unknown } = {};
		output.self = output;

		expect(stringifyToolOutput(output)).toBe('{"self":"[Circular Reference]"}');
	});

	it('should extract an output field from a single ai_tool item', () => {
		const data: ActionResponseData = {
			startTime: 0,
			executionTime: 0,
			executionIndex: 0,
			source: [],
			data: {
				[NodeConnectionTypes.AiTool]: [[{ json: { output: 'search result' } }]],
			},
		};

		expect(getToolOutputFromExecutionData(data)).toBe(JSON.stringify('search result'));
	});

	it('should extract a response field from a single ai_tool item', () => {
		const response = [{ currentDate: '2026-06-16T09:53:11.699Z' }];
		const data: ActionResponseData = {
			startTime: 0,
			executionTime: 0,
			executionIndex: 0,
			source: [],
			data: {
				[NodeConnectionTypes.AiTool]: [[{ json: { response } }]],
			},
		};

		expect(getToolOutputFromExecutionData(data)).toBe(JSON.stringify(response));
	});

	it('should include generic JSON from ai_tool items', () => {
		const data: ActionResponseData = {
			startTime: 0,
			executionTime: 0,
			executionIndex: 0,
			source: [],
			data: {
				[NodeConnectionTypes.AiTool]: [[{ json: { result: '4' } }]],
			},
		};

		expect(getToolOutputFromExecutionData(data)).toBe(JSON.stringify({ result: '4' }));
	});

	it('should include all ai_tool items', () => {
		const data: ActionResponseData = {
			startTime: 0,
			executionTime: 0,
			executionIndex: 0,
			source: [],
			data: {
				[NodeConnectionTypes.AiTool]: [
					[{ json: { output: 'first' } }, { json: { response: { second: true } } }],
				],
			},
		};

		expect(getToolOutputFromExecutionData(data)).toBe(JSON.stringify(['first', { second: true }]));
	});

	it('should serialize tool execution errors', () => {
		const error = new Error('Tool failed') as ExecutionError;
		error.name = 'NodeOperationError';

		const data: ActionResponseData = {
			startTime: 0,
			executionTime: 0,
			executionIndex: 0,
			source: [],
			error,
		};

		expect(getToolOutputFromExecutionData(data)).toBe(
			JSON.stringify({ error: 'Tool failed', errorType: 'NodeOperationError' }),
		);
	});
});
