import superagent = require('superagent');

/**
 * Make `SuperTest<T>` string-indexable.
 */
declare module 'supertest' {
	interface SuperTest<T extends superagent.SuperAgentRequest>
		extends superagent.SuperAgent<T>,
			Record<string, any> {}
}
