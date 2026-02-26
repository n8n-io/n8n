import {
	sseWrite,
	hardenSseConnection,
	scrubSecrets,
	executeTaskOverSse,
	SSE_HEARTBEAT_INTERVAL_MS,
} from '../agents.types';
import type { AgentTaskResult } from '../agents.types';

describe('sseWrite', () => {
	it('should write SSE-formatted data', () => {
		const res = { write: jest.fn(), flush: jest.fn() };
		sseWrite(res, { type: 'step', action: 'execute_workflow' });

		expect(res.write).toHaveBeenCalledWith('data: {"type":"step","action":"execute_workflow"}\n\n');
	});

	it('should flush after every write', () => {
		const res = { write: jest.fn(), flush: jest.fn() };
		sseWrite(res, { type: 'done' });
		expect(res.flush).toHaveBeenCalledTimes(1);
	});

	it('should not throw when flush is not available', () => {
		const res = { write: jest.fn() };
		expect(() => sseWrite(res, { type: 'done' })).not.toThrow();
	});
});

describe('hardenSseConnection', () => {
	function makeMockReqRes() {
		const listeners: Record<string, Array<() => void>> = {};
		const req = {
			socket: {
				setTimeout: jest.fn(),
				setKeepAlive: jest.fn(),
				setNoDelay: jest.fn(),
			},
			once: jest.fn((event: string, cb: () => void) => {
				listeners[event] = listeners[event] ?? [];
				listeners[event].push(cb);
			}),
		};
		const res = {
			write: jest.fn(),
			flush: jest.fn(),
			writableEnded: false,
			once: jest.fn((event: string, cb: () => void) => {
				listeners[event] = listeners[event] ?? [];
				listeners[event].push(cb);
			}),
		};
		return { req, res, listeners };
	}

	it('should disable socket timeout', () => {
		const { req, res } = makeMockReqRes();
		hardenSseConnection(req, res);
		expect(req.socket.setTimeout).toHaveBeenCalledWith(0);
	});

	it('should enable TCP keepalive', () => {
		const { req, res } = makeMockReqRes();
		hardenSseConnection(req, res);
		expect(req.socket.setKeepAlive).toHaveBeenCalledWith(true);
	});

	it('should disable Nagle algorithm', () => {
		const { req, res } = makeMockReqRes();
		hardenSseConnection(req, res);
		expect(req.socket.setNoDelay).toHaveBeenCalledWith(true);
	});

	it('should register disconnect listeners on req and res', () => {
		const { req, res } = makeMockReqRes();
		hardenSseConnection(req, res);

		expect(req.once).toHaveBeenCalledWith('close', expect.any(Function));
		expect(req.once).toHaveBeenCalledWith('end', expect.any(Function));
		expect(res.once).toHaveBeenCalledWith('finish', expect.any(Function));
	});

	it('should send heartbeat ping at configured interval', () => {
		jest.useFakeTimers();
		const { req, res } = makeMockReqRes();

		hardenSseConnection(req, res);

		// No ping yet
		expect(res.write).not.toHaveBeenCalled();

		// Advance past one heartbeat interval
		jest.advanceTimersByTime(SSE_HEARTBEAT_INTERVAL_MS);
		expect(res.write).toHaveBeenCalledWith(':ping\n\n');
		expect(res.flush).toHaveBeenCalled();

		// Advance again
		jest.advanceTimersByTime(SSE_HEARTBEAT_INTERVAL_MS);
		expect(res.write).toHaveBeenCalledTimes(2);

		jest.useRealTimers();
	});

	it('should not send heartbeat after response has ended', () => {
		jest.useFakeTimers();
		const { req, res } = makeMockReqRes();

		hardenSseConnection(req, res);

		// Mark response as ended
		res.writableEnded = true;

		jest.advanceTimersByTime(SSE_HEARTBEAT_INTERVAL_MS);
		expect(res.write).not.toHaveBeenCalled();

		jest.useRealTimers();
	});

	it('should return cleanup function that stops heartbeat', () => {
		jest.useFakeTimers();
		const { req, res } = makeMockReqRes();

		const cleanup = hardenSseConnection(req, res);

		// Call cleanup
		cleanup();

		// Advance past heartbeat — should not fire
		jest.advanceTimersByTime(SSE_HEARTBEAT_INTERVAL_MS);
		expect(res.write).not.toHaveBeenCalled();

		jest.useRealTimers();
	});

	it('should stop heartbeat when client disconnects (close event)', () => {
		jest.useFakeTimers();
		const { req, res, listeners } = makeMockReqRes();

		hardenSseConnection(req, res);

		// Simulate client disconnect
		for (const cb of listeners.close ?? []) cb();

		jest.advanceTimersByTime(SSE_HEARTBEAT_INTERVAL_MS);
		expect(res.write).not.toHaveBeenCalled();

		jest.useRealTimers();
	});
});

describe('executeTaskOverSse', () => {
	function makeMockSseReqRes() {
		const req = {
			socket: { setTimeout: jest.fn(), setKeepAlive: jest.fn(), setNoDelay: jest.fn() },
			once: jest.fn(),
		};
		const res = {
			writeHead: jest.fn(),
			write: jest.fn(),
			end: jest.fn(),
			flush: jest.fn(),
			once: jest.fn(),
			writableEnded: false,
		};
		return { req, res };
	}

	it('should set SSE headers and stream step events', async () => {
		const { req, res } = makeMockSseReqRes();
		const result: AgentTaskResult = { status: 'completed', summary: 'Done', steps: [] };

		await executeTaskOverSse(req, res, async (onStep) => {
			onStep({ type: 'step', action: 'execute_workflow' });
			return result;
		});

		expect(res.writeHead).toHaveBeenCalledWith(
			200,
			expect.objectContaining({
				'Content-Type': 'text/event-stream; charset=UTF-8',
			}),
		);
		// Step event + done event
		expect(res.write).toHaveBeenCalledWith(expect.stringContaining('"type":"step"'));
		expect(res.write).toHaveBeenCalledWith(expect.stringContaining('"type":"done"'));
		expect(res.end).toHaveBeenCalled();
	});

	it('should write error event when execute throws', async () => {
		const { req, res } = makeMockSseReqRes();

		await executeTaskOverSse(req, res, async () => {
			throw new Error('Boom');
		});

		expect(res.write).toHaveBeenCalledWith(expect.stringContaining('"status":"error"'));
		expect(res.write).toHaveBeenCalledWith(expect.stringContaining('Boom'));
		expect(res.end).toHaveBeenCalled();
	});

	it('should not write error if response already ended', async () => {
		const { req, res } = makeMockSseReqRes();
		res.writableEnded = true;

		await executeTaskOverSse(req, res, async () => {
			throw new Error('Boom');
		});

		// writeHead is called before the error, but no data writes after
		expect(res.write).not.toHaveBeenCalledWith(expect.stringContaining('Boom'));
	});

	it('should call hardenSseConnection and cleanup', async () => {
		const { req, res } = makeMockSseReqRes();
		const result: AgentTaskResult = { status: 'completed', summary: 'Done', steps: [] };

		await executeTaskOverSse(req, res, async () => result);

		// hardenSseConnection sets socket options
		expect(req.socket.setTimeout).toHaveBeenCalledWith(0);
		expect(req.socket.setKeepAlive).toHaveBeenCalledWith(true);
	});
});

describe('scrubSecrets', () => {
	it('should replace known secret values with masked version', () => {
		const message = 'Error: Invalid API key sk-ant-abc123456789';
		const result = scrubSecrets(message, ['sk-ant-abc123456789']);

		expect(result).toBe('Error: Invalid API key *****789');
		expect(result).not.toContain('sk-ant-abc123456789');
	});

	it('should scrub multiple secrets', () => {
		const message = 'Keys: sk-ant-KEY1 and cur_KEY2 failed';
		const result = scrubSecrets(message, ['sk-ant-KEY1', 'cur_KEY2']);

		expect(result).not.toContain('sk-ant-KEY1');
		expect(result).not.toContain('cur_KEY2');
		expect(result).toContain('*****EY1');
		expect(result).toContain('*****EY2');
	});

	it('should handle secret appearing multiple times', () => {
		const message = 'Key sk-test used, then sk-test again';
		const result = scrubSecrets(message, ['sk-test']);

		expect(result).toBe('Key *****est used, then *****est again');
	});

	it('should not modify message when no secrets match', () => {
		const message = 'Everything is fine';
		const result = scrubSecrets(message, ['not-in-message']);

		expect(result).toBe('Everything is fine');
	});

	it('should skip empty or short secrets', () => {
		const message = 'a b c test message';
		const result = scrubSecrets(message, ['', 'ab', 'abc']);

		// 'abc' is only 3 chars (not > 3), so it should be skipped too
		expect(result).toBe('a b c test message');
	});

	it('should handle empty secrets array', () => {
		const message = 'No scrubbing needed';
		expect(scrubSecrets(message, [])).toBe('No scrubbing needed');
	});

	it('should scrub secrets from JSON-serialized error responses', () => {
		const secretKey = 'cur_SUPER_SECRET_CURRENTS_KEY';
		const message = `Workflow "Test" executed. Result: {"success":false,"data":{"error":{"context":{"data":{"received_authorization":"Bearer ${secretKey}"}}}}}`;

		const result = scrubSecrets(message, [secretKey]);

		expect(result).not.toContain(secretKey);
		expect(result).toContain('*****KEY');
	});

	it('should scrub BYOK LLM key from anthropic error responses', () => {
		const byokKey = 'sk-ant-BUYER_SECRET_KEY_12345';
		const message = `Workflow execution failed: Invalid API key provided: ${byokKey}`;

		const result = scrubSecrets(message, [byokKey]);

		expect(result).not.toContain(byokKey);
		expect(result).toContain('*****345');
	});

	it('should scrub workflow credentials from error messages', () => {
		const currentsKey = 'cur_live_abcdef123456';
		const notionKey = 'ntn_secret_xyz789';
		const message = `API returned 401: {"auth":"Bearer ${currentsKey}","also":"${notionKey}"}`;

		const result = scrubSecrets(message, [currentsKey, notionKey]);

		expect(result).not.toContain(currentsKey);
		expect(result).not.toContain(notionKey);
	});
});
