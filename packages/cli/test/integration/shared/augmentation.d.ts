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
