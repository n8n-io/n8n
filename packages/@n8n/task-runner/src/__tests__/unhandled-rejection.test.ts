import { runInNewContext } from 'node:vm';

import { describeRejectionReason, onUnhandledRejection } from '../unhandled-rejection';

const LOG_PREFIX = 'Unhandled promise rejection in task runner, continuing. Reason: ';
const FALLBACK_TEXT =
	'Unhandled promise rejection in task runner, continuing. Reason could not be described';

describe('describeRejectionReason', () => {
	it('should include the name, message and stack of an error', () => {
		const error = new TypeError('boom');

		const result = describeRejectionReason(error);

		expect(result).toContain('TypeError: boom');
		expect(result).toMatch(/\n\s+at /);
	});

	it('should describe an error from another realm by its stack', () => {
		const error: unknown = runInNewContext('new Error("x")');

		const result = describeRejectionReason(error);

		expect(result).toContain('Error: x');
		expect(result).toMatch(/\n\s+at /);
	});

	it('should describe an error-like object that is not an error by its type name only', () => {
		const named = describeRejectionReason({ name: 'CustomError', message: 'boom' });
		const unnamed = describeRejectionReason({ message: 'boom' });

		expect(named).toBe('Object');
		expect(unnamed).toBe('Object');
		expect(named).not.toContain('boom');
		expect(unnamed).not.toContain('boom');
	});

	it('should describe an error without a stack as name and message', () => {
		const error = new RangeError('boom');
		delete error.stack;

		expect(describeRejectionReason(error)).toBe('RangeError: boom');
	});

	it('should describe a plain object by its type name only', () => {
		const result = describeRejectionReason({
			headers: { authorization: 'Bearer abc' },
			body: 'secret-value',
		});

		expect(result).toBe('Object');
		expect(result).not.toContain('Bearer abc');
		expect(result).not.toContain('secret-value');
		expect(result).not.toContain('headers');
		expect(result).not.toContain('body');
	});

	it('should describe an array by its type name and length only', () => {
		const result = describeRejectionReason(['first-element', 'second-element']);

		expect(result).toBe('Array of length 2');
		expect(result).not.toContain('first-element');
		expect(result).not.toContain('second-element');
	});

	it('should describe a large buffer by its type name and length', () => {
		expect(describeRejectionReason(Buffer.alloc(1e6))).toBe('Buffer of length 1000000');
	});

	it('should describe a class instance by its constructor name', () => {
		class MyClass {
			value = 'secret-value';
		}

		expect(describeRejectionReason(new MyClass())).toBe('MyClass');
	});

	it.each([
		{ reason: undefined, expected: 'undefined' },
		{ reason: null, expected: 'null' },
		{ reason: 42, expected: '42' },
		{ reason: 'plain text', expected: 'plain text' },
		{ reason: Symbol('tag'), expected: 'Symbol(tag)' },
	])('should describe the primitive $expected', ({ reason, expected }) => {
		expect(describeRejectionReason(reason)).toBe(expected);
	});

	it('should redact secret assignments and URL queries in an error message', () => {
		const error = new Error(
			'login failed password=hunter2 for https://example.com/callback?sig=abc123',
		);

		const result = describeRejectionReason(error);

		expect(result).toContain('[REDACTED]');
		expect(result).not.toContain('hunter2');
		expect(result).toContain('https://example.com/callback');
		expect(result).not.toContain('sig=abc123');
	});

	it('should shorten a long string to at most 1000 characters', () => {
		const result = describeRejectionReason('a'.repeat(5000));

		expect(result.length).toBeLessThanOrEqual(1000);
	});
});

describe('onUnhandledRejection', () => {
	let warnSpy: ReturnType<typeof vi.spyOn>;
	let exitSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should log the fallback text when the reason cannot be described', () => {
		const reason = new Proxy(
			{},
			{
				get() {
					throw new Error('get trap');
				},
			},
		);

		expect(() => onUnhandledRejection(reason)).not.toThrow();
		expect(warnSpy).toHaveBeenCalledTimes(1);
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(FALLBACK_TEXT));
		expect(exitSpy).not.toHaveBeenCalled();
	});

	it('should log one warning with the described reason and keep the process running', () => {
		onUnhandledRejection(new Error('boom'));

		expect(warnSpy).toHaveBeenCalledTimes(1);
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(`${LOG_PREFIX}Error: boom`));
		expect(exitSpy).not.toHaveBeenCalled();
	});
});
