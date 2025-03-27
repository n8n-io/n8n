import type { Logger } from 'n8n-workflow';
import { Readable } from 'stream';

import { forwardToLogger } from '../forward-to-logger';

describe('forwardToLogger', () => {
	let logger: Logger;
	let stdout: Readable;
	let stderr: Readable;

	beforeEach(() => {
		logger = {
			info: jest.fn(),
			error: jest.fn(),
		} as unknown as Logger;

		stdout = new Readable({ read() {} });
		stderr = new Readable({ read() {} });

		jest.resetAllMocks();
	});

	const pushToStdout = async (data: string) => {
		stdout.push(Buffer.from(data));
		stdout.push(null);
		// Wait for the next tick to allow the event loop to process the data
		await new Promise((resolve) => setImmediate(resolve));
	};

	const pushToStderr = async (data: string) => {
		stderr.push(Buffer.from(data));
		stderr.push(null);
		// Wait for the next tick to allow the event loop to process the data
		await new Promise((resolve) => setImmediate(resolve));
	};

	it('should forward stdout data to logger.info', async () => {
		forwardToLogger(logger, { stdout, stderr: null });

		await pushToStdout('Test stdout message');

		await new Promise((resolve) => setImmediate(resolve));

		expect(logger.info).toHaveBeenCalledWith('Test stdout message');
	});

	it('should forward stderr data to logger.error', async () => {
		forwardToLogger(logger, { stdout: null, stderr });

		await pushToStderr('Test stderr message');

		expect(logger.error).toHaveBeenCalledWith('Test stderr message');
	});

	it('should remove trailing newline from stdout', async () => {
		forwardToLogger(logger, { stdout, stderr: null });

		await pushToStdout('Test stdout message\n');

		expect(logger.info).toHaveBeenCalledWith('Test stdout message');
	});

	it('should remove trailing newline from stderr', async () => {
		forwardToLogger(logger, { stdout: null, stderr });

		await pushToStderr('Test stderr message\n');

		expect(logger.error).toHaveBeenCalledWith('Test stderr message');
	});

	it('should forward stderr data to logger.error', async () => {
		forwardToLogger(logger, { stdout: null, stderr });

		await pushToStderr('Test stderr message');

		expect(logger.error).toHaveBeenCalledWith('Test stderr message');
	});

	it('should include prefix if provided for stdout', async () => {
		const prefix = '[PREFIX]';
		forwardToLogger(logger, { stdout, stderr: null }, prefix);

		await pushToStdout('Message with prefix');

		expect(logger.info).toHaveBeenCalledWith('[PREFIX] Message with prefix');
	});

	it('should include prefix if provided for stderr', async () => {
		const prefix = '[PREFIX]';
		forwardToLogger(logger, { stdout: null, stderr }, prefix);

		await pushToStderr('Error message with prefix');

		expect(logger.error).toHaveBeenCalledWith('[PREFIX] Error message with prefix');
	});

	it('should make sure there is no duplicate space after prefix for stdout', async () => {
		const prefix = '[PREFIX] ';
		forwardToLogger(logger, { stdout, stderr: null }, prefix);

		await pushToStdout('Message with prefix');

		expect(logger.info).toHaveBeenCalledWith('[PREFIX] Message with prefix');
	});

	it('should make sure there is no duplicate space after prefix for stderr', async () => {
		const prefix = '[PREFIX] ';
		forwardToLogger(logger, { stdout: null, stderr }, prefix);

		await pushToStderr('Error message with prefix');

		expect(logger.error).toHaveBeenCalledWith('[PREFIX] Error message with prefix');
	});
});
