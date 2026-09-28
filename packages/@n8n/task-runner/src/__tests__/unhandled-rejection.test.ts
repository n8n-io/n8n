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

	it('should describe an object with a message and no stack as name and message', () => {
		expect(describeRejectionReason({ name: 'CustomError', message: 'boom' })).toBe(
			'CustomError: boom',
		);
		expect(describeRejectionReason({ message: 'boom' })).toBe('Error: boom');
	});

	it('should list the keys of a plain object without its values', () => {
		const result = describeRejectionReason({
			headers: { authorization: 'Bearer abc' },
			body: 'secret-value',
		});

		expect(result).toBe('Object with keys [headers, body]');
		expect(result).not.toContain('Bearer abc');
		expect(result).not.toContain('secret-value');
	});

	it('should list the keys of an array without its elements', () => {
		const result = describeRejectionReason(['first-element', 'second-element']);

		expect(result).toBe('Array with keys [0, 1]');
		expect(result).not.toContain('first-element');
		expect(result).not.toContain('second-element');
	});

	it('should list only the first ten keys of an object with more keys', () => {
		const reason = Object.fromEntries(
			Array.from({ length: 12 }, (_, index) => [`key${index}`, index]),
		);

		expect(describeRejectionReason(reason)).toBe(
			'Object with keys [key0, key1, key2, key3, key4, key5, key6, key7, key8, key9, ...]',
		);
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
				ownKeys() {
					throw new Error('ownKeys trap');
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
