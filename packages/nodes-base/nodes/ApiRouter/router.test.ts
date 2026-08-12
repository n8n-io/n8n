import { UserError } from 'n8n-workflow';

import {
	buildRouteTable,
	matchRoute,
	normalizePath,
	parseRouteSegments,
	routeShape,
	segmentsFromCatchAll,
	validateConfiguration,
} from './router';
import type { ApiRouterEndpoint } from './types';

const endpoint = (
	method: ApiRouterEndpoint['method'],
	path: string,
	extra: Partial<ApiRouterEndpoint> = {},
): ApiRouterEndpoint => ({ method, path, ...extra });

describe('normalizePath', () => {
	test.each([
		['/orders/42', ['orders', '42']],
		['orders/42/', ['orders', '42']],
		['/orders//42', ['orders', '42']],
		['///', []],
		['', []],
		['/', []],
		['/orders?include=items', ['orders']],
		['/orders/a%2Fb', ['orders', 'a/b']],
		['/orders/hello%20world', ['orders', 'hello world']],
		['/orders/%E2%82%AC', ['orders', '€']],
		['/orders/%zz', ['orders', '%zz']],
	])('%s', (input, expected) => {
		expect(normalizePath(input)).toEqual(expected);
	});

	it('is case sensitive', () => {
		expect(normalizePath('/Orders')).toEqual(['Orders']);
	});
});

describe('parseRouteSegments', () => {
	it('marks colon-prefixed segments as parameters', () => {
		expect(parseRouteSegments('/orders/:id/items')).toEqual([
			{ kind: 'static', value: 'orders' },
			{ kind: 'param', name: 'id' },
			{ kind: 'static', value: 'items' },
		]);
	});
});

describe('routeShape', () => {
	it('ignores parameter names', () => {
		expect(routeShape(parseRouteSegments('/orders/:id'))).toBe(
			routeShape(parseRouteSegments('/orders/:orderId')),
		);
	});
});

describe('matchRoute', () => {
	const table = buildRouteTable([
		endpoint('GET', '/orders'),
		endpoint('POST', '/orders'),
		endpoint('GET', '/orders/:id'),
		endpoint('DELETE', '/orders/:id'),
		endpoint('GET', '/orders/new'),
		endpoint('GET', '/:tenant/reports'),
	]);

	it('matches a static route and extracts no params', () => {
		expect(matchRoute(table, 'GET', ['orders'])).toEqual({
			type: 'matched',
			route: expect.objectContaining({ index: 0 }),
			params: {},
		});
	});

	it('extracts path parameters', () => {
		expect(matchRoute(table, 'GET', ['orders', '42'])).toEqual({
			type: 'matched',
			route: expect.objectContaining({ index: 2 }),
			params: { id: '42' },
		});
	});

	it('prefers an exact static route over a parameter route', () => {
		const match = matchRoute(table, 'GET', ['orders', 'new']);
		expect(match).toMatchObject({ type: 'matched', route: { index: 4 } });
	});

	it('falls back to the parameter route when the method rules out the static one', () => {
		expect(matchRoute(table, 'DELETE', ['orders', 'new'])).toMatchObject({
			type: 'matched',
			route: { index: 3 },
			params: { id: 'new' },
		});
	});

	it('prefers the leftmost static segment on a tie', () => {
		const tied = buildRouteTable([
			endpoint('GET', '/:tenant/reports'),
			endpoint('GET', '/reports/:id'),
		]);
		expect(matchRoute(tied, 'GET', ['reports', 'reports'])).toMatchObject({
			type: 'matched',
			route: { index: 1 },
		});
	});

	it('does not match a static segment that differs only in case', () => {
		expect(matchRoute(table, 'GET', ['Orders'])).toEqual({ type: 'notFound' });
	});

	it('captures a differently-cased segment as a parameter value', () => {
		expect(matchRoute(table, 'GET', ['orders', 'New'])).toMatchObject({
			type: 'matched',
			route: { index: 2 },
			params: { id: 'New' },
		});
	});

	it('uppercases the request method before comparing', () => {
		expect(matchRoute(table, 'get', ['orders'])).toMatchObject({ type: 'matched' });
	});

	it('returns 405 with the declared methods when only the method mismatches', () => {
		expect(matchRoute(table, 'PATCH', ['orders'])).toEqual({
			type: 'methodNotAllowed',
			allow: ['GET', 'POST'],
		});
	});

	it('lists every method of every matching path pattern in Allow', () => {
		expect(matchRoute(table, 'PATCH', ['orders', '42'])).toEqual({
			type: 'methodNotAllowed',
			allow: ['DELETE', 'GET'],
		});
	});

	it('returns 404 when no path pattern matches', () => {
		expect(matchRoute(table, 'GET', ['customers'])).toEqual({ type: 'notFound' });
	});

	it('returns 404 when the segment count differs', () => {
		expect(matchRoute(table, 'GET', ['orders', '42', 'items'])).toEqual({ type: 'notFound' });
	});

	it('returns 404 for an empty table', () => {
		expect(matchRoute([], 'GET', ['orders'])).toEqual({ type: 'notFound' });
	});
});

describe('validateConfiguration', () => {
	it('accepts a well-formed table', () => {
		expect(() =>
			validateConfiguration('shop', [endpoint('GET', '/orders'), endpoint('GET', '/orders/:id')]),
		).not.toThrow();
	});

	it('rejects a base path with a parameter marker', () => {
		expect(() => validateConfiguration('shop/:id', [])).toThrow(UserError);
	});

	it('rejects a base path with a wildcard', () => {
		expect(() => validateConfiguration('shop/*', [])).toThrow(UserError);
	});

	it('rejects two endpoints with the same method and shape', () => {
		expect(() =>
			validateConfiguration('shop', [
				endpoint('GET', '/orders/:id'),
				endpoint('GET', '/orders/:orderId'),
			]),
		).toThrow(/resolve to the same route/);
	});

	it('allows the same shape on different methods', () => {
		expect(() =>
			validateConfiguration('shop', [
				endpoint('GET', '/orders/:id'),
				endpoint('POST', '/orders/:id'),
			]),
		).not.toThrow();
	});

	it('rejects a parameter name used twice in one route', () => {
		expect(() => validateConfiguration('shop', [endpoint('GET', '/:id/orders/:id')])).toThrow(
			/more than once/,
		);
	});

	it('rejects an unnamed parameter', () => {
		expect(() => validateConfiguration('shop', [endpoint('GET', '/orders/:')])).toThrow(
			/unnamed path parameter/,
		);
	});
});

describe('segmentsFromCatchAll', () => {
	it('orders segments numerically, not lexicographically', () => {
		const params: Record<string, string> = {};
		for (let i = 1; i <= 12; i++) params[`s${i}`] = String(i);

		expect(segmentsFromCatchAll(params)).toEqual([
			'1',
			'2',
			'3',
			'4',
			'5',
			'6',
			'7',
			'8',
			'9',
			'10',
			'11',
			'12',
		]);
	});

	it('ignores keys that are not catch-all segments', () => {
		expect(segmentsFromCatchAll({ s1: 'orders', id: '42' })).toEqual(['orders']);
	});

	it('returns nothing for an empty param set', () => {
		expect(segmentsFromCatchAll({})).toEqual([]);
	});
});
