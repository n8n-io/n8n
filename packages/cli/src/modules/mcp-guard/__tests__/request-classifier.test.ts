import { isReadShaped } from '../request-classifier';

const req = (method: string, path = '/x', body?: unknown) => ({
	method,
	url: new URL(`https://example.test${path}`),
	body:
		body === undefined
			? undefined
			: Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)),
});

const GRAPHQL = [/^\/graphql$/];

describe('isReadShaped', () => {
	it.each(['GET', 'HEAD', 'get', 'head'])('treats %s as a read', (method) => {
		expect(isReadShaped(req(method))).toBe(true);
	});

	it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'TRACE'])(
		'treats %s as a write',
		(method) => {
			expect(isReadShaped(req(method, '/gmail/v1/users/me/messages/send'))).toBe(false);
		},
	);

	it('treats a GraphQL query as a read', () => {
		expect(
			isReadShaped(req('POST', '/graphql', { query: 'query { viewer { id } }' }), [], GRAPHQL),
		).toBe(true);
		expect(isReadShaped(req('POST', '/graphql', { query: '{ viewer { id } }' }), [], GRAPHQL)).toBe(
			true,
		);
	});

	it.each([
		'mutation { issueCreate { id } }',
		'subscription { a }',
		'query A { a } mutation B { b }',
		'{ a } mutation { b }',
		'query A { a },mutation B { b }',
		'query A { a }\nmutation B { b }',
	])('treats a GraphQL document with a mutation as a write: %s', (query) => {
		expect(isReadShaped(req('POST', '/graphql', { query }), [], GRAPHQL)).toBe(false);
	});

	it('treats a query-shaped body on a path that is not a GraphQL path as a write', () => {
		const trash = req('POST', '/gmail/v1/users/me/messages/abc/trash', { query: '{' });
		expect(isReadShaped(trash)).toBe(false);
		expect(isReadShaped(trash, [], GRAPHQL)).toBe(false);
		expect(isReadShaped(req('POST', '/other', { query: 'query { a }' }), [], GRAPHQL)).toBe(false);
	});

	it('treats an unparseable or non-GraphQL POST body as a write', () => {
		expect(isReadShaped(req('POST', '/graphql', 'not json'), [], GRAPHQL)).toBe(false);
		expect(isReadShaped(req('POST', '/graphql', { other: 1 }), [], GRAPHQL)).toBe(false);
		expect(isReadShaped(req('POST', '/graphql'), [], GRAPHQL)).toBe(false);
		expect(isReadShaped(req('POST', '/graphql', { query: 5 }), [], GRAPHQL)).toBe(false);
		expect(isReadShaped(req('POST', '/search', { query: 'search term' }), [], GRAPHQL)).toBe(false);
	});

	it('treats a POST as a read only when a read path matches', () => {
		const readPaths = [/^\/api\/conversations\.history$/];
		expect(isReadShaped(req('POST', '/api/conversations.history'), readPaths)).toBe(true);
		expect(isReadShaped(req('POST', '/api/chat.postMessage'), readPaths)).toBe(false);
	});

	it('never lets a read path turn a DELETE, PUT or PATCH into a read', () => {
		const readPaths = [/.*/];
		for (const method of ['DELETE', 'PUT', 'PATCH']) {
			expect(isReadShaped(req(method, '/anything'), readPaths)).toBe(false);
		}
	});
});
