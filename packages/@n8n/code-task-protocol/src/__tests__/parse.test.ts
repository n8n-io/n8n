import { createRunExecutionData, deepCopy } from 'n8n-workflow';

import {
	CODE_TASK_PROTOCOL_VERSION,
	MAX_CONSOLE_ENTRIES,
	consoleTruncationEntry,
} from '../constants';
import { InvalidCodeTaskFileError } from '../errors/invalid-code-task-file.error';
import { parseCodeTaskInput, parseCodeTaskResult } from '../parse';
import type { CodeTaskInput } from '../task-input';

function createTaskInput(): CodeTaskInput {
	const node = {
		id: 'node-1',
		name: 'Code',
		type: 'n8n-nodes-base.code',
		typeVersion: 2,
		position: [0, 0] as [number, number],
		parameters: {},
	};

	return {
		version: CODE_TASK_PROTOCOL_VERSION,
		taskId: 'task-1',
		language: 'javascript',
		code: 'return $input.all();',
		nodeMode: 'runOnceForAllItems',
		workflowMode: 'manual',
		continueOnFail: false,
		data: {
			workflow: {
				id: 'workflow-1',
				name: 'Workflow',
				active: false,
				nodes: [node],
				connections: {},
			},
			inputData: { main: [[{ json: { a: 1 } }]] },
			connectionInputSource: null,
			node,
			runExecutionData: createRunExecutionData(),
			runIndex: 0,
			itemIndex: 0,
			activeNodeName: 'Code',
			siblingParameters: {},
			mode: 'manual',
			envProviderState: { isProcessAvailable: true, isEnvAccessBlocked: false, env: {} },
			defaultReturnRunIndex: -1,
			selfData: {},
			contextNodeName: 'Code',
			additionalData: {
				executionId: 'execution-1',
				restApiUrl: 'http://localhost:5678/rest',
				instanceBaseUrl: 'http://localhost:5678/',
				formWaitingBaseUrl: 'http://localhost:5678/form-waiting',
				webhookBaseUrl: 'http://localhost:5678/webhook',
				webhookWaitingBaseUrl: 'http://localhost:5678/webhook-waiting',
				webhookTestBaseUrl: 'http://localhost:5678/webhook-test',
				variables: {},
			},
		},
	};
}

/** Simulates writing the file on one side and reading it on the other side. */
const roundTrip = (value: object): unknown => deepCopy(value);

describe('parseCodeTaskInput', () => {
	it('should accept a valid task input', () => {
		const input = createTaskInput();

		const parsed = parseCodeTaskInput(roundTrip(input));

		expect(parsed).toEqual({ ok: true, result: input });
	});

	it('should accept a task input with a chunk', () => {
		const input = { ...createTaskInput(), chunk: { startIndex: 10, count: 5 } };

		const parsed = parseCodeTaskInput(roundTrip(input));

		expect(parsed).toEqual({ ok: true, result: input });
	});

	it('should keep the nested n8n data as it is', () => {
		const input = createTaskInput();
		input.data.runExecutionData = createRunExecutionData({
			resultData: {
				runData: { Trigger: [] },
				pinData: { Trigger: [{ json: { pinned: true } }] },
			},
		});

		const parsed = parseCodeTaskInput(roundTrip(input));

		expect(parsed.ok && parsed.result.data.runExecutionData).toEqual(input.data.runExecutionData);
	});

	it.each([undefined, 0, 2, '1'])('should reject version %j', (version) => {
		const parsed = parseCodeTaskInput({ ...createTaskInput(), version });

		expect(parsed.ok).toBe(false);
		if (parsed.ok) return;
		expect(parsed.error).toBeInstanceOf(InvalidCodeTaskFileError);
		expect(parsed.error.message).toContain(`Unsupported version ${JSON.stringify(version)}`);
	});

	it.each([null, 'task', []])('should reject a file that is not an object: %j', (value) => {
		const parsed = parseCodeTaskInput(value);

		expect(parsed.ok).toBe(false);
	});

	it('should name the invalid fields', () => {
		const input = createTaskInput();
		const invalid = {
			...input,
			nodeMode: 'runCode',
			data: { ...input.data, runIndex: -1, workflow: { ...input.data.workflow, nodes: 'x' } },
		};

		const parsed = parseCodeTaskInput(invalid);

		expect(parsed.ok).toBe(false);
		if (parsed.ok) return;
		expect(parsed.error.problems).toEqual([
			expect.stringMatching(/^nodeMode: /),
			expect.stringMatching(/^data\.workflow\.nodes: /),
			expect.stringMatching(/^data\.runIndex: /),
		]);
	});

	it('should reject a task input without data', () => {
		const { data: _, ...input } = createTaskInput();

		const parsed = parseCodeTaskInput(input);

		expect(parsed.ok).toBe(false);
	});

	it('should reject an unsupported language', () => {
		const parsed = parseCodeTaskInput({ ...createTaskInput(), language: 'python' });

		expect(parsed.ok).toBe(false);
	});
});

describe('parseCodeTaskResult', () => {
	it('should accept a success result', () => {
		const result = {
			version: CODE_TASK_PROTOCOL_VERSION,
			status: 'success',
			result: [{ json: { a: 1 } }],
			console: [["'hello'", '{"a":1}']],
		};

		const parsed = parseCodeTaskResult(roundTrip(result));

		expect(parsed).toEqual({ ok: true, result });
	});

	it('should accept a success result of any value', () => {
		const result = {
			version: CODE_TASK_PROTOCOL_VERSION,
			status: 'success',
			result: 'x',
			console: [],
		};

		const parsed = parseCodeTaskResult(result);

		expect(parsed).toEqual({ ok: true, result });
	});

	it('should accept an error result and keep the extra error properties', () => {
		const result = {
			version: CODE_TASK_PROTOCOL_VERSION,
			status: 'error',
			error: {
				message: 'x is not defined [line 2]',
				description: 'ReferenceError',
				stack:
					'ReferenceError: x is not defined\n    at VmCodeWrapper (evalmachine.<anonymous>:2:1)',
				lineNumber: 2,
				itemIndex: 0,
				context: { itemIndex: 0 },
				code: 'E_CUSTOM',
			},
			console: [],
		};

		const parsed = parseCodeTaskResult(roundTrip(result));

		expect(parsed).toEqual({ ok: true, result });
	});

	it('should accept a console with the max entries and the truncation entry', () => {
		const console = [
			...Array.from({ length: MAX_CONSOLE_ENTRIES }, (_, i) => [String(i)]),
			consoleTruncationEntry(5),
		];

		const parsed = parseCodeTaskResult({
			version: CODE_TASK_PROTOCOL_VERSION,
			status: 'success',
			result: [],
			console,
		});

		expect(parsed.ok).toBe(true);
	});

	it('should reject a console with too many entries', () => {
		const console = Array.from({ length: MAX_CONSOLE_ENTRIES + 2 }, (_, i) => [String(i)]);

		const parsed = parseCodeTaskResult({
			version: CODE_TASK_PROTOCOL_VERSION,
			status: 'success',
			result: [],
			console,
		});

		expect(parsed.ok).toBe(false);
	});

	it('should reject a console entry with arguments that are not strings', () => {
		const parsed = parseCodeTaskResult({
			version: CODE_TASK_PROTOCOL_VERSION,
			status: 'success',
			result: [],
			console: [[{ a: 1 }]],
		});

		expect(parsed.ok).toBe(false);
	});

	it('should reject an error result without a message', () => {
		const parsed = parseCodeTaskResult({
			version: CODE_TASK_PROTOCOL_VERSION,
			status: 'error',
			error: { stack: 'x' },
			console: [],
		});

		expect(parsed.ok).toBe(false);
	});

	it('should reject an unknown status', () => {
		const parsed = parseCodeTaskResult({
			version: CODE_TASK_PROTOCOL_VERSION,
			status: 'timeout',
			console: [],
		});

		expect(parsed.ok).toBe(false);
	});

	it('should reject another version', () => {
		const parsed = parseCodeTaskResult({
			version: CODE_TASK_PROTOCOL_VERSION + 1,
			status: 'success',
			result: [],
			console: [],
		});

		expect(parsed.ok).toBe(false);
		if (parsed.ok) return;
		expect(parsed.error.message).toBe(
			`Invalid code task result file. Unsupported version ${CODE_TASK_PROTOCOL_VERSION + 1}. Expected version ${CODE_TASK_PROTOCOL_VERSION}.`,
		);
	});
});

describe('consoleTruncationEntry', () => {
	it('should tell how many entries were dropped', () => {
		expect(consoleTruncationEntry(3)).toEqual(['[Output truncated - 3 more entries]']);
	});
});
