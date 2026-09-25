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

	it('should parse a stack with CRLF line endings', () => {
		const error = new Error('a.unknown is not a function');
		Object.defineProperty(error, 'stack', { value: defaultStack.replace(/\n/g, '\r\n') });

		const executionError = new ExecutionError(error);

		expect(executionError.message).toBe('a.unknown is not a function [line 2]');
		expect(executionError.description).toBe('TypeError');
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

		it.each([
			['a name containing a space', 'Database Error'],
			['a name containing a dot', 'my.CustomError'],
			['a name containing a dash', 'Custom-Error'],
			['a name carrying a node error code', 'TypeError [ERR_INVALID_ARG_TYPE]'],
		])('should keep the message and surface the type for %s', (_, errorType) => {
			const error = new Error('oops');
			error.name = errorType;
			Object.defineProperty(error, 'stack', {
				value: `${errorType}: oops\n    at VmCodeWrapper (evalmachine.<anonymous>:2:9)`,
			});

			const executionError = new ExecutionError(error);

			expect(executionError.message).toBe('oops [line 2]');
			expect(executionError.description).toBe(errorType);
		});
	});

	describe('messages containing ": "', () => {
		// Previously handled by two hard-coded special cases that stitched a message
		// split on every colon back together.
		it.each([
			"Cannot find module 'node:fs'",
			"Module 'node:fs' is disallowed",
			"Module 'node:child_process' is disallowed",
		])('should keep "%s" whole', (message) => {
			const error = new Error(message);
			Object.defineProperty(error, 'stack', {
				value: `Error: ${message}\n    at VmCodeWrapper (evalmachine.<anonymous>:2:9)`,
			});

			const executionError = new ExecutionError(error);

			expect(executionError.message).toBe(`${message} [line 2]`);
			expect(executionError.description).toBeNull();
		});

		// Deliberate change: the message used to be split on every colon, so this
		// surfaced as message "Not Found" with description "Request failed with
		// status code 404" - the leading half of the message became the type.
		it('should not split a message on a colon it happens to contain', () => {
			const message = 'Request failed with status code 404: Not Found';
			const error = new Error(message);
			Object.defineProperty(error, 'stack', {
				value: `Error: ${message}\n    at VmCodeWrapper (evalmachine.<anonymous>:2:9)`,
			});

			const executionError = new ExecutionError(error);

			expect(executionError.message).toBe(`${message} [line 2]`);
			expect(executionError.description).toBeNull();
		});

		it('should not mistake a continuation row of a multi-line message for the header', () => {
			const error = new Error('request failed\ncause: ETIMEDOUT');
			Object.defineProperty(error, 'stack', {
				value: `Error: request failed
cause: ETIMEDOUT
    at VmCodeWrapper (evalmachine.<anonymous>:2:9)`,
			});

			const executionError = new ExecutionError(error);

			expect(executionError.message).toBe('request failed [line 2]');
			expect(executionError.description).toBeNull();
		});
	});

	// V8 prefixes a syntax error's stack with an excerpt of the offending source,
	// closed by a caret row. The excerpt holds user code, so a row of it can look
	// like a stack header.
	it('should skip the source excerpt prefixing a syntax error stack', () => {
		const syntaxErrorStack = `evalmachine.<anonymous>:2
data: { foo: 1
             ^

SyntaxError: Unexpected end of input
    at new Script (node:vm:117:7)
    at createScript (node:vm:269:10)
    at Object.runInNewContext (node:vm:310:10)`;

		const error = new SyntaxError('Unexpected end of input');
		Object.defineProperty(error, 'stack', { value: syntaxErrorStack });

		const executionError = new ExecutionError(error);

		expect(executionError.message).toBe('Unexpected end of input');
		expect(executionError.description).toBe('SyntaxError');
	});

	describe('stacks without a parseable header', () => {
		it("should keep the error's own message", () => {
			const error = new Error('connect ETIMEDOUT 10.0.0.1:5432');
			Object.defineProperty(error, 'stack', {
				value: `    at VmCodeWrapper (evalmachine.<anonymous>:3:9)
    at evalmachine.<anonymous>:7:2`,
			});

			const executionError = new ExecutionError(error);

			expect(executionError.message).toBe('connect ETIMEDOUT 10.0.0.1:5432 [line 3]');
			expect(executionError.description).toBeNull();
			expect(executionError.lineNumber).toBe(3);
		});

		it("should keep the error's own message when there is no stack at all", () => {
			const executionError = new ExecutionError({ message: '{"code":"ECONNRESET"}' });

			expect(executionError.message).toBe('{"code":"ECONNRESET"}');
			expect(executionError.description).toBeNull();
		});

		it('should fall back to "Unknown error" when there is no message either', () => {
			const executionError = new ExecutionError({ message: '' });

			expect(executionError.message).toBe('Unknown error');
			expect(executionError.description).toBeNull();
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
