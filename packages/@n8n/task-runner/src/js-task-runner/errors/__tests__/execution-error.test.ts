import { ExecutionError } from '../execution-error';

describe('ExecutionError', () => {
	const defaultStack = `TypeError: a.unknown is not a function
    at VmCodeWrapper (evalmachine.<anonymous>:2:3)
    at evalmachine.<anonymous>:7:2
    at Script.runInContext (node:vm:148:12)
    at Script.runInNewContext (node:vm:153:17)
    at runInNewContext (node:vm:309:38)
    at JsTaskRunner.runForAllItems (/n8n/packages/@n8n/task-runner/dist/js-task-runner/js-task-runner.js:90:65)
    at JsTaskRunner.executeTask (/n8n/packages/@n8n/task-runner/dist/js-task-runner/js-task-runner.js:71:26)
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async JsTaskRunner.receivedSettings (/n8n/packages/@n8n/task-runner/dist/task-runner.js:190:26)`;

	it('should parse error details from stack trace without itemIndex', () => {
		const error = new Error('a.unknown is not a function');
		error.stack = defaultStack;

		const executionError = new ExecutionError(error);
		expect(executionError.message).toBe('a.unknown is not a function [line 2]');
		expect(executionError.lineNumber).toBe(2);
		expect(executionError.description).toBe('TypeError');
		expect(executionError.context).toBeUndefined();
	});

	it('should parse error details from stack trace with itemIndex', () => {
		const error = new Error('a.unknown is not a function');
		error.stack = defaultStack;

		const executionError = new ExecutionError(error, 1);
		expect(executionError.message).toBe('a.unknown is not a function [line 2, for item 1]');
		expect(executionError.lineNumber).toBe(2);
		expect(executionError.description).toBe('TypeError');
		expect(executionError.context).toEqual({ itemIndex: 1 });
	});

	// A database driver error, e.g. `pg`'s `DatabaseError`, sets `name` to
	// `'error'`, so V8 renders the stack header lowercased as `error: <message>`.
	describe('errors whose stack header is not "Error:"', () => {
		it('should keep the message of a driver error thrown outside the sandbox', () => {
			const driverStack = `error: duplicate key value violates unique constraint "users_email_key"
    at Parser.parseErrorMessage (/n8n/node_modules/pg-protocol/dist/parser.js:283:98)
    at Parser.handlePacket (/n8n/node_modules/pg-protocol/dist/parser.js:122:29)
    at Parser.parse (/n8n/node_modules/pg-protocol/dist/parser.js:35:38)
    at Socket.<anonymous> (/n8n/node_modules/pg-protocol/dist/index.js:11:42)
    at Socket.emit (node:events:518:28)
    at addChunk (node:internal/streams/readable:561:12)
    at TCP.onStreamRead (node:internal/stream_base_commons:191:23)`;

			const error = new Error('duplicate key value violates unique constraint "users_email_key"');
			error.name = 'error';
			Object.defineProperty(error, 'stack', { value: driverStack });

			const executionError = new ExecutionError(error);

			expect(executionError.message).toBe(
				'duplicate key value violates unique constraint "users_email_key"',
			);
		});

		it('should keep the message of a driver error rethrown from user code', () => {
			const driverStack = `error: null value in column "email" of relation "users" violates not-null constraint
    at VmCodeWrapper (evalmachine.<anonymous>:4:9)
    at evalmachine.<anonymous>:7:2
    at Script.runInContext (node:vm:149:12)
    at runInContext (node:vm:301:6)
    at JsTaskRunner.runForAllItems (/n8n/packages/@n8n/task-runner/dist/js-task-runner/js-task-runner.js:90:65)
    at JsTaskRunner.executeTask (/n8n/packages/@n8n/task-runner/dist/js-task-runner/js-task-runner.js:71:26)`;

			const error = new Error(
				'null value in column "email" of relation "users" violates not-null constraint',
			);
			error.name = 'error';
			Object.defineProperty(error, 'stack', { value: driverStack });

			const executionError = new ExecutionError(error, 0);

			expect(executionError.message).toBe(
				'null value in column "email" of relation "users" violates not-null constraint [line 4, for item 0]',
			);
			expect(executionError.lineNumber).toBe(4);
		});
	});

	it('should serialize correctly', () => {
		const error = new Error('a.unknown is not a function');
		Object.defineProperty(error, 'stack', {
			value: defaultStack,
			enumerable: true,
		});
		// error.stack = defaultStack;

		const executionError = new ExecutionError(error, 1);

		expect(JSON.stringify(executionError)).toBe(
			JSON.stringify({
				stack: defaultStack,
				message: 'a.unknown is not a function [line 2, for item 1]',
				description: 'TypeError',
				itemIndex: 1,
				context: { itemIndex: 1 },
				lineNumber: 2,
			}),
		);
	});
});
