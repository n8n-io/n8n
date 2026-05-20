import { afterAll, afterEach, beforeAll, describe, it, expect, vi } from 'vitest';
import { IsolatedVmBridge } from '../isolated-vm-bridge';
import { ExpressionEvaluator } from '../../evaluator/expression-evaluator';
import { ExpressionError, type Logger } from '../../types';

describe('IsolatedVmBridge', () => {
	describe('logger integration', () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('should use logger instead of console.log', async () => {
			const consoleSpy = vi.spyOn(console, 'log');
			const logger: Logger = {
				error: vi.fn(),
				warn: vi.fn(),
				info: vi.fn(),
				debug: vi.fn(),
			};

			const bridge = new IsolatedVmBridge({ logger });
			await bridge.initialize();
			await bridge.dispose();

			expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('[IsolatedVmBridge]'));
			expect(consoleSpy).not.toHaveBeenCalled();
		});
	});

	// =========================================================================
	// `reconstructError` — poison-pill filtering
	//
	// Intent: when the in-isolate outer catch builds a sentinel with `extra`,
	// blocked error properties (captureStackTrace, prepareStackTrace, etc.)
	// and function-typed values must be stripped before being applied to the
	// reconstructed Error on the host side. This prevents user expressions
	// from injecting properties that abuse V8's stack trace API or smuggle
	// callable values onto the error object.
	// =========================================================================
	describe('reconstructError filters dangerous properties from extra', () => {
		let evaluator: ExpressionEvaluator;
		const caller = {};

		beforeAll(async () => {
			evaluator = new ExpressionEvaluator({
				createBridge: () => new IsolatedVmBridge({ timeout: 5000 }),
				maxCodeCacheSize: 64,
			});
			await evaluator.initialize();
			await evaluator.acquire(caller);
		});

		afterAll(async () => {
			await evaluator.release(caller);
			await evaluator.dispose();
		});

		it('strips blockedErrorProperties (captureStackTrace, prepareStackTrace, etc.) from extra', () => {
			// Throw an ExpressionError inside the isolate with blocked properties
			// set as own properties. E() re-throws ExpressionErrors, the outer catch
			// captures them into a sentinel with extra, and reconstructError applies it.
			let caught: Error & { safeProp?: string } = new Error('no-op');
			try {
				evaluator.evaluate(
					'{{ (function() { var e = new Error("poisoned"); e.name = "ExpressionError"; e.captureStackTrace = "pwned"; e.prepareStackTrace = "pwned"; e.stackTraceLimit = 9999; e.safeProp = "allowed"; throw e; })() }}',
					{},
					caller,
				);
			} catch (err) {
				caught = err as typeof caught;
			}

			expect(caught.message).toBe('poisoned');
			expect(caught).not.toHaveProperty('captureStackTrace');
			expect(caught).not.toHaveProperty('prepareStackTrace');
			expect(caught).not.toHaveProperty('stackTraceLimit');
			expect(caught.safeProp).toBe('allowed');
		});

		it('strips __defineGetter__/__defineSetter__/__lookupGetter__/__lookupSetter__ from extra', () => {
			let caught: Error & { context?: string } = new Error('no-op');
			try {
				evaluator.evaluate(
					'{{ (function() { var e = new Error("poisoned"); e.name = "ExpressionError"; e["__defineGetter__"] = "pwned"; e["__defineSetter__"] = "pwned"; e["__lookupGetter__"] = "pwned"; e["__lookupSetter__"] = "pwned"; e.context = "kept"; throw e; })() }}',
					{},
					caller,
				);
			} catch (err) {
				caught = err as typeof caught;
			}

			expect(caught.message).toBe('poisoned');
			// These exist on Object.prototype, so check own properties specifically
			expect(Object.hasOwn(caught, '__defineGetter__')).toBe(false);
			expect(Object.hasOwn(caught, '__defineSetter__')).toBe(false);
			expect(Object.hasOwn(caught, '__lookupGetter__')).toBe(false);
			expect(Object.hasOwn(caught, '__lookupSetter__')).toBe(false);
			expect(caught.context).toBe('kept');
		});
	});

	// =========================================================================
	// `serializeError` host→isolate boundary
	//
	// Intent: preserve host-side Error class identity and custom properties
	// for the *host-side* reconstruction (since `ivm.copy: true` strips them),
	// without bundling that rich data into the sentinel that travels through
	// the isolate. The sentinel inside the isolate should expose `name` and
	// `message` only; the rich data should be routed through a host-only
	// side channel and re-attached by `reconstructError`.
	// =========================================================================
	describe('serializeError must not expose host Error internals inside the isolate', () => {
		let evaluator: ExpressionEvaluator;
		const caller = {};

		beforeAll(async () => {
			evaluator = new ExpressionEvaluator({
				createBridge: () => new IsolatedVmBridge({ timeout: 5000 }),
				maxCodeCacheSize: 64,
			});
			await evaluator.initialize();
			await evaluator.acquire(caller);
		});

		afterAll(async () => {
			await evaluator.release(caller);
			await evaluator.dispose();
		});

		it('e.extra is undefined (or empty) for sentinels originating from host callbacks', () => {
			const data: Record<string, unknown> = {
				$json: new Proxy(
					{},
					{
						get: () => {
							const err = new Error('boom');
							(err as Error & { internalCode?: string }).internalCode = 'INT-42';
							(err as Error & { sensitive?: string }).sensitive = 'super-secret';
							throw err;
						},
					},
				),
			};

			const extraKeys = evaluator.evaluate(
				'{{ (function(){ try { return $json.x; } catch(e) { return e && e.extra ? Object.keys(e.extra) : []; } })() }}',
				data,
				caller,
			);

			expect(extraKeys).toEqual([]);
		});

		it('host stack traces with absolute filesystem paths are NOT readable via e.stack inside the isolate', () => {
			const data: Record<string, unknown> = {
				$json: new Proxy(
					{},
					{
						get: () => {
							throw new Error('boom');
						},
					},
				),
			};

			const stack = evaluator.evaluate(
				'{{ (function(){ try { return $json.x; } catch(e) { return (e && e.stack) ? String(e.stack) : ""; } })() }}',
				data,
				caller,
			);

			expect(typeof stack).toBe('string');
			expect(stack).toBe('');
		});

		it('host-side reconstruction preserves Error class identity, name, message, and custom properties when the sentinel reaches the host uncaught', () => {
			// Guards the legitimate host-side use case: when the expression
			// doesn't catch, the host receives the original Error with class
			// identity and own props intact.
			const data: Record<string, unknown> = {
				$json: new Proxy(
					{},
					{
						get: () => {
							const err = new ExpressionError('upstream-failed', {
								nodeCause: 'X',
								itemIndex: 0,
							});
							(err as ExpressionError & { code?: string }).code = 'DB_TIMEOUT';
							(err as ExpressionError & { level?: string }).level = 'warning';
							throw err;
						},
					},
				),
			};

			let caught: ExpressionError & { code?: string; level?: string } = new ExpressionError(
				'no-op',
				{},
			);
			try {
				evaluator.evaluate('{{ $json.x }}', data, caller);
			} catch (err) {
				caught = err as typeof caught;
			}

			expect(caught).toBeInstanceOf(ExpressionError);
			expect(caught.name).toBe('ExpressionError');
			expect(caught.message).toBe('upstream-failed');
			expect(caught.code).toBe('DB_TIMEOUT');
			expect(caught.level).toBe('warning');
			expect(caught.context).toEqual({ nodeCause: 'X', itemIndex: 0 });
		});
	});
});
