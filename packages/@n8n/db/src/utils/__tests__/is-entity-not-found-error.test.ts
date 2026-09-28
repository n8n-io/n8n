import { EntityNotFoundError } from '@n8n/typeorm';

import { isEntityNotFoundError } from '../is-entity-not-found-error';

class DummyEntity {}

describe('isEntityNotFoundError', () => {
	it('returns true for an EntityNotFoundError', () => {
		const error = new EntityNotFoundError(DummyEntity, { id: 'missing' });
		expect(isEntityNotFoundError(error)).toBe(true);
	});

	it('returns false for an unrelated error', () => {
		const error = new Error('Connection terminated due to connection timeout');
		expect(isEntityNotFoundError(error)).toBe(false);
	});

	it('returns false for non-error values', () => {
		expect(isEntityNotFoundError(null)).toBe(false);
		expect(isEntityNotFoundError(undefined)).toBe(false);
		expect(isEntityNotFoundError('not found')).toBe(false);
	});
});
