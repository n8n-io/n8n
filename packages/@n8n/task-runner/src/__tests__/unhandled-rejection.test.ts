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

		expect(describeRejectionReason(error)).toBe('RangeError: boom');
	});

	it('should cap the description at 1000 characters', () => {
		const result = describeRejectionReason(new Error('m'.repeat(5000)));

		expect(result).toMatch(/^Error: m/);
		expect(result.length).toBeLessThanOrEqual(1000);
	});

	it('should describe an error-like object by its keys only', () => {
		const result = describeRejectionReason({ name: 'CustomError', message: 'boom' });

		expect(result).toBe('Object with keys [name, message]');
		expect(result).not.toContain('boom');
	});

	it('should describe a plain object by its keys only', () => {
		const result = describeRejectionReason({
			headers: { authorization: 'Bearer abc' },
			body: 'secret-value',
		});

		expect(result).toBe('Object with keys [headers, body]');
		expect(result).not.toContain('Bearer abc');
		expect(result).not.toContain('secret-value');
	});

	it('should list at most 10 keys of an object', () => {
		const reason = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`k${i}`, i]));

		expect(describeRejectionReason(reason)).toBe(
			'Object with keys [k0, k1, k2, k3, k4, k5, k6, k7, k8, k9, ...]',
		);
	});

	it('should describe a class instance by its constructor name and keys', () => {
		class MyClass {
			value = 'secret-value';
		}

		const result = describeRejectionReason(new MyClass());

		expect(result).toBe('MyClass with keys [value]');
		expect(result).not.toContain('secret-value');
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

	it('should describe a string by its length only', () => {
		const result = describeRejectionReason('plain text');

		expect(result).toBe('string of length 10');
		expect(result).not.toContain('plain text');
	});

	it('should describe a long string by its length only', () => {
		expect(describeRejectionReason('a'.repeat(5000))).toBe('string of length 5000');
	});

	it.each([
		{ reason: undefined, expected: 'undefined' },
		{ reason: null, expected: 'null' },
		{ reason: 42, expected: '42' },
		{ reason: Symbol('tag'), expected: 'Symbol(tag)' },
	])('should describe the primitive $expected', ({ reason, expected }) => {
		expect(describeRejectionReason(reason)).toBe(expected);
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
