import { runInNewContext } from 'node:vm';

import { describeRejectionReason, onUnhandledRejection } from '../unhandled-rejection';

const LOG_PREFIX = 'Unhandled promise rejection in task runner, continuing. Reason: ';
const FALLBACK_TEXT =
	'Unhandled promise rejection in task runner, continuing. Reason could not be described';

describe('describeRejectionReason', () => {
	it('should describe an error by its name, message and stack frames', () => {
		const result = describeRejectionReason(new TypeError('boom'));

		expect(result).toMatch(/^TypeError: boom\n\s+at /);
	});

	it('should describe an error from another realm by its name, message and stack frames', () => {
		const error: unknown = runInNewContext('new Error("other-realm")');

		expect(describeRejectionReason(error)).toMatch(/^Error: other-realm\n\s+at /);
	});

	it('should describe an error without a stack by its name and message', () => {
		const error = new RangeError('boom');
		delete error.stack;

		expect(describeRejectionReason(error)).toContain('RangeError: boom');
	});

	it('should include the own properties and the cause of an error', () => {
		const error = Object.assign(new Error('outer', { cause: new Error('inner') }), {
			code: 'E_REQUEST',
		});

		const result = describeRejectionReason(error);

		expect(result).toContain("code: 'E_REQUEST'");
		expect(result).toContain('[cause]: Error: inner');
	});

	it('should cap the description at 1000 characters', () => {
		const result = describeRejectionReason(new Error('m'.repeat(5000)));

		expect(result).toMatch(/^Error: m/);
		expect(result.length).toBeLessThanOrEqual(1000);
	});

	it('should describe an error-like plain object by its type name only', () => {
		const result = describeRejectionReason({ name: 'CustomError', message: 'boom' });

		expect(result).toBe('Object');
		expect(result).not.toContain('boom');
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

	it('should describe a class instance by its constructor name only', () => {
		class MyClass {
			value = 'secret-value';
		}

		const result = describeRejectionReason(new MyClass());

		expect(result).toBe('MyClass');
		expect(result).not.toContain('secret-value');
	});

	it('should describe an array by its type name only', () => {
		const result = describeRejectionReason(['first-element', 'second-element']);

		expect(result).toBe('Array');
		expect(result).not.toContain('first-element');
		expect(result).not.toContain('second-element');
	});

	it('should describe a buffer by its type name only', () => {
		expect(describeRejectionReason(Buffer.alloc(1e6))).toBe('Buffer');
	});

	it.each([
		{ reason: 'plain text', expected: 'string' },
		{ reason: 42, expected: 'number' },
		{ reason: true, expected: 'boolean' },
		{ reason: BigInt(1), expected: 'bigint' },
		{ reason: undefined, expected: 'undefined' },
		{ reason: null, expected: 'null' },
		{ reason: Symbol('tag'), expected: 'symbol' },
	])('should describe the primitive $expected by its type only', ({ reason, expected }) => {
		const result = describeRejectionReason(reason);

		expect(result).toBe(expected);
		if (typeof reason === 'string') expect(result).not.toContain(reason);
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
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(`${LOG_PREFIX}Error: boom\n`));
		expect(exitSpy).not.toHaveBeenCalled();
	});
});
