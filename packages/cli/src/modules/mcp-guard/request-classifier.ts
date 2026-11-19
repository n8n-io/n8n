import type { CapturedRequest } from './net-interceptor';

// A GraphQL operation keyword at the start of a definition. Anything else in the text is not one.
const OPERATION = /(?:^|[}\s])(query|mutation|subscription)\b/g;

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
	return !words.includes('mutation') && !words.includes('subscription');
}

/**
 * A request may reach the real service only when it is read-shaped: GET, HEAD, a GraphQL query, or a
 * POST that a vendor file lists as a read. A wrong "write" costs a thinner answer. A wrong "read" can
 * change real data, so every doubt means write.
 */
export function isReadShaped(
	req: Pick<CapturedRequest, 'method' | 'url' | 'body'>,
	readPaths: readonly RegExp[] = [],
): boolean {
	const method = req.method.toUpperCase();
	if (method === 'GET' || method === 'HEAD') return true;
	if (method !== 'POST') return false;
	if (isGraphqlQuery(req.body)) return true;
	return readPaths.some((path) => path.test(req.url.pathname));
}
