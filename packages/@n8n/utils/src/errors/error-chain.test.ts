import { errorChain } from './error-chain';

describe('errorChain', () => {
	it('returns the error itself first', () => {
		const error = new Error('boom');

		expect(errorChain(error)).toEqual([error]);
	});

	it('walks cause, errorResponse and reason, shallowest first', () => {
		const cause = new Error('cause');
		const errorResponse = { message: 'response' };
		const reason = new Error('reason');
		const error = Object.assign(new Error('outer'), { cause, errorResponse, reason });

		expect(errorChain(error)).toEqual([error, cause, errorResponse, reason]);
	});

	it('visits a shared wrapped error once', () => {
		const shared = new Error('shared');
		const error = Object.assign(new Error('outer'), { cause: shared, errorResponse: shared });

		expect(errorChain(error)).toEqual([error, shared]);
	});

	it('stops at the depth cap', () => {
		let deepest: Record<string, unknown> = { message: 'level 7' };
		let current = deepest;
		for (let level = 6; level >= 0; level--) {
			current = { message: `level ${level}`, cause: current };
		}
		deepest = current;

		const chain = errorChain(deepest);

		expect(chain).toHaveLength(6);
		expect(chain[5]).toMatchObject({ message: 'level 5' });
	});

	it('survives a self-referential cause chain', () => {
		const error = new Error('loop') as Error & { cause: unknown };
		error.cause = error;

		expect(errorChain(error)).toEqual([error]);
	});

	it('keeps a wrapped array in the chain', () => {
		const wrappedArray = [{ message: 'entry' }];
		const error = Object.assign(new Error('outer'), { cause: wrappedArray });

		expect(errorChain(error)).toEqual([error, wrappedArray]);
	});

	it('returns an empty chain for a non-object value', () => {
		expect(errorChain('not an object')).toEqual([]);
		expect(errorChain(null)).toEqual([]);
		expect(errorChain(undefined)).toEqual([]);
	});
});
