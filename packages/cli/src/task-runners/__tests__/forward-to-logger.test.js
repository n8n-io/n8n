'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const stream_1 = require('stream');
const forward_to_logger_1 = require('../forward-to-logger');
describe('forwardToLogger', () => {
	let logger;
	let stdout;
	let stderr;
	beforeEach(() => {
		logger = {
			info: jest.fn(),
			error: jest.fn(),
		};
		stdout = new stream_1.Readable({ read() {} });
		stderr = new stream_1.Readable({ read() {} });
		jest.resetAllMocks();
	});
	const pushToStdout = async (data) => {
		stdout.push(Buffer.from(data));
		stdout.push(null);
		await new Promise((resolve) => setImmediate(resolve));
	};
	const pushToStderr = async (data) => {
		stderr.push(Buffer.from(data));
		stderr.push(null);
		await new Promise((resolve) => setImmediate(resolve));
	};
	it('should forward stdout data to logger.info', async () => {
		(0, forward_to_logger_1.forwardToLogger)(logger, { stdout, stderr: null });
		await pushToStdout('Test stdout message');
		await new Promise((resolve) => setImmediate(resolve));
		expect(logger.info).toHaveBeenCalledWith('Test stdout message');
	});
	it('should forward stderr data to logger.error', async () => {
		(0, forward_to_logger_1.forwardToLogger)(logger, { stdout: null, stderr });
		await pushToStderr('Test stderr message');
		expect(logger.error).toHaveBeenCalledWith('Test stderr message');
	});
	it('should remove trailing newline from stdout', async () => {
		(0, forward_to_logger_1.forwardToLogger)(logger, { stdout, stderr: null });
		await pushToStdout('Test stdout message\n');
		expect(logger.info).toHaveBeenCalledWith('Test stdout message');
	});
	it('should remove trailing newline from stderr', async () => {
		(0, forward_to_logger_1.forwardToLogger)(logger, { stdout: null, stderr });
		await pushToStderr('Test stderr message\n');
		expect(logger.error).toHaveBeenCalledWith('Test stderr message');
	});
	it('should forward stderr data to logger.error', async () => {
		(0, forward_to_logger_1.forwardToLogger)(logger, { stdout: null, stderr });
		await pushToStderr('Test stderr message');
		expect(logger.error).toHaveBeenCalledWith('Test stderr message');
	});
	it('should include prefix if provided for stdout', async () => {
		const prefix = '[PREFIX]';
		(0, forward_to_logger_1.forwardToLogger)(logger, { stdout, stderr: null }, prefix);
		await pushToStdout('Message with prefix');
		expect(logger.info).toHaveBeenCalledWith('[PREFIX] Message with prefix');
	});
	it('should include prefix if provided for stderr', async () => {
		const prefix = '[PREFIX]';
		(0, forward_to_logger_1.forwardToLogger)(logger, { stdout: null, stderr }, prefix);
		await pushToStderr('Error message with prefix');
		expect(logger.error).toHaveBeenCalledWith('[PREFIX] Error message with prefix');
	});
	it('should make sure there is no duplicate space after prefix for stdout', async () => {
		const prefix = '[PREFIX] ';
		(0, forward_to_logger_1.forwardToLogger)(logger, { stdout, stderr: null }, prefix);
		await pushToStdout('Message with prefix');
		expect(logger.info).toHaveBeenCalledWith('[PREFIX] Message with prefix');
	});
	it('should make sure there is no duplicate space after prefix for stderr', async () => {
		const prefix = '[PREFIX] ';
		(0, forward_to_logger_1.forwardToLogger)(logger, { stdout: null, stderr }, prefix);
		await pushToStderr('Error message with prefix');
		expect(logger.error).toHaveBeenCalledWith('[PREFIX] Error message with prefix');
	});
});
//# sourceMappingURL=forward-to-logger.test.js.map
