import superagent = require('superagent');
import type { ObjectLiteral } from 'typeorm';

/**
 * Make `SuperTest<T>` string-indexable.
 */
declare module 'supertest' {
	interface SuperTest<T extends superagent.SuperAgentRequest>
		extends superagent.SuperAgent<T>,
			Record<string, any> {}
}

/**
 * Prevent `repository.delete({})` (non-criteria) from triggering the type error
 * `Expression produces a union type that is too complex to represent.ts(2590)`
 */
declare module 'typeorm' {
	interface Repository<Entity extends ObjectLiteral> {
		delete(criteria: {}): Promise<void>;
	}
}
