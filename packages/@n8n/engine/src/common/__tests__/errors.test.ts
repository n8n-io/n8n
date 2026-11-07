import { BaseError, UnexpectedError as SharedUnexpectedError } from '@n8n/errors';
import { describe, expect, it } from 'vitest';

import { UnexpectedError, UnimplementedError } from '../errors';

describe('UnexpectedError', () => {
	it('is the shared error class', () => {
		expect(UnexpectedError).toBe(SharedUnexpectedError);
	});

	it('keeps its name and message and is reported at error level', () => {
		const error = new UnexpectedError('unreachable state');

		expect(error).toBeInstanceOf(BaseError);
		expect(error.name).toBe('UnexpectedError');
		expect(error.message).toBe('unreachable state');
		expect(error.level).toBe('error');
		expect(error.shouldReport).toBe(true);
	});
});

describe('UnimplementedError', () => {
	it('keeps its name and message and is reported at error level', () => {
		const error = new UnimplementedError('loop shape not supported');

		expect(error).toBeInstanceOf(Error);
		expect(error).toBeInstanceOf(BaseError);
		expect(error.name).toBe('UnimplementedError');
		expect(error.message).toBe('loop shape not supported');
		expect(error.level).toBe('error');
		expect(error.shouldReport).toBe(true);
	});

	it('is not an UnexpectedError', () => {
		expect(new UnimplementedError('x')).not.toBeInstanceOf(UnexpectedError);
	});

	it('keeps the cause', () => {
		const cause = new Error('root');

		expect(new UnimplementedError('x', { cause }).cause).toBe(cause);
	});
});
