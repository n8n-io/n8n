import { describe, it, expect, vi } from 'vitest';
import { buildErrorData, classifyError, calculateBackoff } from '../error-classifier';
import { EngineError } from '../engine-error';
import { StepTimeoutError } from '../step-timeout.error';
import { HttpError } from '../http.error';
import {
	InfrastructureError,
	WorkflowNotFoundError,
	StepFunctionNotFoundError,
} from '../infrastructure.error';
import { NonRetriableError } from '../../../sdk/errors';
import type { GraphStepConfig } from '../../../graph/graph.types';

// ---------------------------------------------------------------------------
// Error hierarchy tests
// ---------------------------------------------------------------------------

describe('EngineError hierarchy', () => {
	it('StepTimeoutError extends EngineError', () => {
		const error = new StepTimeoutError('step-1', 5000);
		expect(error).toBeInstanceOf(EngineError);
		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe('StepTimeoutError');
		expect(error.code).toBe('STEP_TIMEOUT');
		expect(error.category).toBe('timeout');
		expect(error.retriable).toBe(false);
		expect(error.stepId).toBe('step-1');
		expect(error.timeoutMs).toBe(5000);
		expect(error.message).toBe("Step 'step-1' timed out after 5000ms");
	});

	it('StepTimeoutError can be marked retriable', () => {
		const error = new StepTimeoutError('step-2', 3000, true);
		expect(error.retriable).toBe(true);
	});

	it('HttpError extends EngineError', () => {
		const error = new HttpError(429);
		expect(error).toBeInstanceOf(EngineError);
		expect(error.code).toBe('HTTP_429');
		expect(error.category).toBe('step');
		expect(error.statusCode).toBe(429);
		expect(error.message).toBe('HTTP 429');
	});

	it('HttpError accepts custom message', () => {
		const error = new HttpError(503, 'Service Unavailable');
		expect(error.message).toBe('Service Unavailable');
		expect(error.code).toBe('HTTP_503');
	});

	it('InfrastructureError wraps an Error cause', () => {
		const cause = new Error('DB connection lost');
		const error = new InfrastructureError(cause);
		expect(error).toBeInstanceOf(EngineError);
		expect(error.code).toBe('INFRASTRUCTURE');
		expect(error.category).toBe('infrastructure');
		expect(error.retriable).toBe(false);
		expect(error.message).toBe('DB connection lost');
		expect(error.stack).toBe(cause.stack);
	});

	it('InfrastructureError wraps a non-Error cause', () => {
		const error = new InfrastructureError('something went wrong');
		expect(error.message).toBe('something went wrong');
	});

	it('WorkflowNotFoundError extends EngineError', () => {
		const error = new WorkflowNotFoundError('wf-123');
		expect(error).toBeInstanceOf(EngineError);
		expect(error.code).toBe('WORKFLOW_NOT_FOUND');
		expect(error.category).toBe('infrastructure');
		expect(error.retriable).toBe(false);
		expect(error.message).toBe('Workflow wf-123 not found');
	});

	it('WorkflowNotFoundError includes version when provided', () => {
		const error = new WorkflowNotFoundError('wf-123', 5);
		expect(error.message).toBe('Workflow wf-123 version 5 not found');
	});

	it('StepFunctionNotFoundError extends EngineError', () => {
		const error = new StepFunctionNotFoundError('myFunc');
		expect(error).toBeInstanceOf(EngineError);
		expect(error.code).toBe('STEP_FUNCTION_NOT_FOUND');
		expect(error.category).toBe('infrastructure');
		expect(error.retriable).toBe(false);
		expect(error.message).toBe("Step function 'myFunc' not found");
	});

	it('StepFunctionNotFoundError includes stepId when provided', () => {
		const error = new StepFunctionNotFoundError('myFunc', 'step-5');
		expect(error.message).toBe("Step function 'myFunc' not found for step 'step-5'");
	});
});

// ---------------------------------------------------------------------------
// buildErrorData tests
// ---------------------------------------------------------------------------

describe('buildErrorData', () => {
	it('EngineError uses code, category, retriable from the error', () => {
		const error = new HttpError(503, 'Service Down');
		const data = buildErrorData(error);

		expect(data.message).toBe('Service Down');
		expect(data.code).toBe('HTTP_503');
		expect(data.category).toBe('step');
		expect(data.retriable).toBe(true);
		expect(data.stack).toBeDefined();
	});

	it('StepTimeoutError produces timeout category', () => {
		const error = new StepTimeoutError('s1', 1000);
		const data = buildErrorData(error);

		expect(data.code).toBe('STEP_TIMEOUT');
		expect(data.category).toBe('timeout');
		expect(data.retriable).toBe(false);
	});

	it('InfrastructureError produces infrastructure category', () => {
		const error = new InfrastructureError(new Error('disk full'));
		const data = buildErrorData(error);

		expect(data.code).toBe('INFRASTRUCTURE');
		expect(data.category).toBe('infrastructure');
		expect(data.retriable).toBe(false);
	});

	it('TypeError produces code=TYPEERROR, category=step, retriable=false', () => {
		const error = new TypeError('Cannot read property x of undefined');
		const data = buildErrorData(error);

		expect(data.code).toBe('TYPEERROR');
		expect(data.category).toBe('step');
		expect(data.retriable).toBe(false);
		expect(data.message).toBe('Cannot read property x of undefined');
		expect(data.stack).toBeDefined();
	});

	it('ReferenceError produces code=REFERENCEERROR, retriable=false', () => {
		const error = new ReferenceError('x is not defined');
		const data = buildErrorData(error);

		expect(data.code).toBe('REFERENCEERROR');
		expect(data.category).toBe('step');
		expect(data.retriable).toBe(false);
	});

	it('SyntaxError produces code=SYNTAXERROR, retriable=false', () => {
		const error = new SyntaxError('Unexpected token');
		const data = buildErrorData(error);

		expect(data.code).toBe('SYNTAXERROR');
		expect(data.category).toBe('step');
		expect(data.retriable).toBe(false);
	});

	it('Node.js ETIMEDOUT error produces code=ETIMEDOUT, retriable=true', () => {
		const error = new Error('Connection timed out');
		(error as NodeJS.ErrnoException).code = 'ETIMEDOUT';
		const data = buildErrorData(error);

		expect(data.code).toBe('ETIMEDOUT');
		expect(data.category).toBe('step');
		expect(data.retriable).toBe(true);
	});

	it('Node.js ECONNRESET error produces retriable=true', () => {
		const error = new Error('Connection reset');
		(error as NodeJS.ErrnoException).code = 'ECONNRESET';
		const data = buildErrorData(error);

		expect(data.code).toBe('ECONNRESET');
		expect(data.retriable).toBe(true);
	});

	it('Node.js ECONNREFUSED error produces retriable=true', () => {
		const error = new Error('Connection refused');
		(error as NodeJS.ErrnoException).code = 'ECONNREFUSED';
		const data = buildErrorData(error);

		expect(data.code).toBe('ECONNREFUSED');
		expect(data.retriable).toBe(true);
	});

	it('Node.js EPIPE error produces retriable=true', () => {
		const error = new Error('Broken pipe');
		(error as NodeJS.ErrnoException).code = 'EPIPE';
		const data = buildErrorData(error);

		expect(data.code).toBe('EPIPE');
		expect(data.retriable).toBe(true);
	});

	it('Node.js ENOTFOUND error produces retriable=true', () => {
		const error = new Error('DNS lookup failed');
		(error as NodeJS.ErrnoException).code = 'ENOTFOUND';
		const data = buildErrorData(error);

		expect(data.code).toBe('ENOTFOUND');
		expect(data.retriable).toBe(true);
	});

	it('Node.js ENOENT error produces retriable=false', () => {
		const error = new Error('File not found');
		(error as NodeJS.ErrnoException).code = 'ENOENT';
		const data = buildErrorData(error);

		expect(data.code).toBe('ENOENT');
		expect(data.retriable).toBe(false);
	});

	it('Unknown error object produces code=UNKNOWN, retriable=true', () => {
		const error = { weird: 'object' };
		const data = buildErrorData(error);

		expect(data.code).toBe('UNKNOWN');
		expect(data.category).toBe('step');
		expect(data.retriable).toBe(true);
		expect(data.stack).toBeUndefined();
	});

	it('String thrown produces message as the string, code=UNKNOWN', () => {
		const data = buildErrorData('something broke');

		expect(data.message).toBe('something broke');
		expect(data.code).toBe('UNKNOWN');
		expect(data.category).toBe('step');
		expect(data.retriable).toBe(true);
		expect(data.stack).toBeUndefined();
	});

	it('plain Error without code goes to unknown path with retriable=true', () => {
		const error = new Error('generic error');
		const data = buildErrorData(error);

		expect(data.code).toBe('UNKNOWN');
		expect(data.retriable).toBe(true);
		expect(data.message).toBe('generic error');
		expect(data.stack).toBeDefined();
	});

	it('passes sourceMap parameter through to remapStack', () => {
		// remapStack is a no-op placeholder, but we verify it does not crash
		const error = new TypeError('bad type');
		const data = buildErrorData(error, 'some-source-map');

		expect(data.code).toBe('TYPEERROR');
		expect(data.stack).toBeDefined();
	});

	it('NonRetriableError produces code=NON_RETRIABLE, category=step, retriable=false', () => {
		const error = new NonRetriableError('Payment already processed');
		const data = buildErrorData(error);

		expect(data.code).toBe('NON_RETRIABLE');
		expect(data.category).toBe('step');
		expect(data.retriable).toBe(false);
		expect(data.message).toBe('Payment already processed');
		expect(data.stack).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// Retry -- Error classification (classifyError)
// ---------------------------------------------------------------------------

describe('classifyError', () => {
	const defaultGraphStepConfig: GraphStepConfig = {};

	it('TypeError is non-retriable and causes immediate failure', () => {
		expect(classifyError(new TypeError('bad'), defaultGraphStepConfig)).toBe(false);
	});

	it('ReferenceError is non-retriable and causes immediate failure', () => {
		expect(classifyError(new ReferenceError('x'), defaultGraphStepConfig)).toBe(false);
	});

	it('SyntaxError is non-retriable and causes immediate failure', () => {
		expect(classifyError(new SyntaxError('oops'), defaultGraphStepConfig)).toBe(false);
	});

	it('HTTP 429 is retriable', () => {
		expect(classifyError(new HttpError(429), defaultGraphStepConfig)).toBe(true);
	});

	it('HTTP 503 is retriable', () => {
		expect(classifyError(new HttpError(503), defaultGraphStepConfig)).toBe(true);
	});

	it('HTTP 401 is non-retriable', () => {
		expect(classifyError(new HttpError(401), defaultGraphStepConfig)).toBe(false);
	});

	it('HTTP 400 is non-retriable', () => {
		expect(classifyError(new HttpError(400), defaultGraphStepConfig)).toBe(false);
	});

	it('ETIMEDOUT is retriable', () => {
		const error = new Error('timeout');
		(error as NodeJS.ErrnoException).code = 'ETIMEDOUT';
		expect(classifyError(error, defaultGraphStepConfig)).toBe(true);
	});

	it('ECONNRESET is retriable', () => {
		const error = new Error('reset');
		(error as NodeJS.ErrnoException).code = 'ECONNRESET';
		expect(classifyError(error, defaultGraphStepConfig)).toBe(true);
	});

	it('StepTimeoutError is retriable only if retryOnTimeout=true', () => {
		const error = new StepTimeoutError('s1', 5000);

		// Without retryOnTimeout -- not retriable
		expect(classifyError(error, {})).toBe(false);
		expect(classifyError(error, { retryOnTimeout: false })).toBe(false);

		// With retryOnTimeout=true -- retriable
		expect(classifyError(error, { retryOnTimeout: true })).toBe(true);
	});

	it('NonRetriableError is never retriable', () => {
		const error = new NonRetriableError('Cannot retry this');
		expect(classifyError(error, defaultGraphStepConfig)).toBe(false);
	});

	it('unknown error is retriable by default', () => {
		expect(classifyError('something broke', defaultGraphStepConfig)).toBe(true);
	});

	it('step config retriableErrors overrides non-retriable classification', () => {
		const error = new HttpError(401);
		// HTTP 401 is normally non-retriable, but step config says it is
		const config: GraphStepConfig = { retriableErrors: ['HTTP_401'] };
		expect(classifyError(error, config)).toBe(true);
	});

	it('step config retriableErrors adds custom error codes', () => {
		const error = new Error('custom issue');
		(error as NodeJS.ErrnoException).code = 'CUSTOM_CODE';
		const config: GraphStepConfig = { retriableErrors: ['CUSTOM_CODE'] };
		expect(classifyError(error, config)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Retry -- Backoff (calculateBackoff)
// ---------------------------------------------------------------------------

describe('calculateBackoff', () => {
	it('exponential backoff: attempt 1 returns baseDelay', () => {
		const delay = calculateBackoff(1, { baseDelay: 1000 });
		expect(delay).toBe(1000);
	});

	it('exponential backoff: attempt 2 returns baseDelay*2', () => {
		const delay = calculateBackoff(2, { baseDelay: 1000 });
		expect(delay).toBe(2000);
	});

	it('exponential backoff: attempt 3 returns baseDelay*4', () => {
		const delay = calculateBackoff(3, { baseDelay: 1000 });
		expect(delay).toBe(4000);
	});

	it('exponential backoff: attempt 4 returns baseDelay*8', () => {
		const delay = calculateBackoff(4, { baseDelay: 1000 });
		expect(delay).toBe(8000);
	});

	it('backoff is capped at maxDelay', () => {
		// attempt 10 would be 1000 * 2^9 = 512_000, but maxDelay caps it
		const delay = calculateBackoff(10, { baseDelay: 1000, maxDelay: 30_000 });
		expect(delay).toBe(30_000);
	});

	it('backoff uses default maxDelay of 60_000 when not specified', () => {
		// attempt 20 would be enormous, but capped at 60_000
		const delay = calculateBackoff(20, { baseDelay: 1000 });
		expect(delay).toBe(60_000);
	});

	it('jitter adds randomness when jitter=true', () => {
		// With jitter, delay = baseDelay * 2^(attempt-1) * (0.5 + random*0.5)
		// For attempt 1, baseDelay 1000: delay is in [500, 1000]
		vi.spyOn(Math, 'random').mockReturnValue(0);
		const delayLow = calculateBackoff(1, { baseDelay: 1000, jitter: true });
		expect(delayLow).toBe(500); // 1000 * (0.5 + 0*0.5)

		vi.spyOn(Math, 'random').mockReturnValue(1);
		const delayHigh = calculateBackoff(1, { baseDelay: 1000, jitter: true });
		expect(delayHigh).toBe(1000); // 1000 * (0.5 + 1*0.5)

		vi.spyOn(Math, 'random').mockReturnValue(0.5);
		const delayMid = calculateBackoff(1, { baseDelay: 1000, jitter: true });
		expect(delayMid).toBe(750); // 1000 * (0.5 + 0.5*0.5)

		vi.restoreAllMocks();
	});

	it('no jitter when jitter=false', () => {
		const delay = calculateBackoff(1, { baseDelay: 1000, jitter: false });
		expect(delay).toBe(1000);
	});

	it('no jitter when jitter is not specified', () => {
		const delay = calculateBackoff(2, { baseDelay: 500 });
		expect(delay).toBe(1000);
	});

	it('jitter is applied after maxDelay cap', () => {
		vi.spyOn(Math, 'random').mockReturnValue(0);
		// attempt 20 at baseDelay 1000 is capped to maxDelay 5000
		// then jitter: 5000 * (0.5 + 0*0.5) = 2500
		const delay = calculateBackoff(20, { baseDelay: 1000, maxDelay: 5000, jitter: true });
		expect(delay).toBe(2500);
		vi.restoreAllMocks();
	});
});
