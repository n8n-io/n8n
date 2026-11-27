import type { CapturedRequest } from './network';

// A GraphQL operation keyword is a whole word. Commas, braces and spaces all separate definitions, so
// only a letter, a digit or an underscore before or after the word makes it part of a longer name.
const OPERATION = /(?<![_A-Za-z0-9])(query|mutation|subscription)(?![_A-Za-z0-9])/g;

function isGraphqlQuery(body: Buffer | undefined): boolean {
	if (!body) return false;
	let doc: unknown;
	try {
		doc = JSON.parse(body.toString('utf8'));
	} catch {
		return false;
	}
	const query =
		typeof doc === 'object' && doc !== null ? (doc as { query?: unknown }).query : undefined;
	if (typeof query !== 'string') return false;
	const words = [...query.matchAll(OPERATION)].map((match) => match[1]);
	// A document with a mutation or a subscription anywhere is a write.
	if (words.includes('mutation') || words.includes('subscription')) return false;
	// Text that is no GraphQL, such as a search term, is not a read. A query has the keyword or opens
	// with a selection set.
	return words.includes('query') || query.trimStart().startsWith('{');
}

/**
 * A request may reach the real service only when it is read-shaped: GET, HEAD, a GraphQL query on a
 * vendor GraphQL path, or a POST that a vendor file lists as a read. A wrong "write" costs a thinner answer. A wrong "read" can
 * change real data, so every doubt means write.
 */
export function isReadShaped(
	req: Pick<CapturedRequest, 'method' | 'url' | 'body'>,
	readPaths: readonly RegExp[] = [],
	graphqlPaths: readonly RegExp[] = [],
): boolean {
	const method = req.method.toUpperCase();
	if (method === 'GET' || method === 'HEAD') return true;
	if (method !== 'POST') return false;
	// A body that looks like a query proves nothing on a REST path, so only a vendor GraphQL path counts.
	if (graphqlPaths.some((path) => path.test(req.url.pathname)) && isGraphqlQuery(req.body)) {
		return true;
	}
	return readPaths.some((path) => path.test(req.url.pathname));
}
