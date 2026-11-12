import { BadRequestError } from '@n8n/errors';
import type { Request } from 'express';
import { z } from 'zod';

import {
	matchesPathTemplate,
	parsePathParam,
	toRequestPath,
	toEndpointPath,
	toPublicApiResult,
	toRouteName,
} from '@/public-api/public-api-controller.utils';

describe('parsePathParam', () => {
	const positiveIdSchema = z.string().regex(/^(?!0+$)\d+$/, 'must be a positive integer');

	it('returns the param when it passes its schema', () => {
		expect(parsePathParam('widgetId', positiveIdSchema, { widgetId: '12' })).toBe('12');
	});

	it('throws a BadRequestError that names the param when it fails its schema', () => {
		const parseInvalid = () => parsePathParam('widgetId', positiveIdSchema, { widgetId: 'abc' });

		expect(parseInvalid).toThrow(BadRequestError);
		expect(parseInvalid).toThrow('request/params/widgetId must be a positive integer');
	});

	it('checks only the named param', () => {
		expect(parsePathParam('widgetId', positiveIdSchema, { widgetId: '12', other: 'x' })).toBe('12');
	});
});

describe('matchesPathTemplate', () => {
	it('matches a template with the same static segments', () => {
		expect(matchesPathTemplate('/widgets', '/widgets')).toBe(true);
	});

	it('matches a :param segment against any single segment', () => {
		expect(matchesPathTemplate('/widgets/:widgetId', '/widgets/w-1')).toBe(true);
	});

	it('rejects a path with more or fewer segments than the template', () => {
		expect(matchesPathTemplate('/widgets/:widgetId', '/widgets')).toBe(false);
		expect(matchesPathTemplate('/widgets/:widgetId', '/widgets/w-1/parts')).toBe(false);
	});

	it('rejects a path whose static segment differs', () => {
		expect(matchesPathTemplate('/widgets/:widgetId/parts', '/gadgets/w-1/parts')).toBe(false);
	});

	it('compares static segments case-insensitively', () => {
		expect(matchesPathTemplate('/widgets', '/WIDGETS')).toBe(true);
	});

	it('ignores a trailing slash on the path', () => {
		expect(matchesPathTemplate('/widgets', '/widgets/')).toBe(true);
	});
});

describe('toRequestPath', () => {
	const requestAt = (path: string) => ({ path }) as Request;

	it('joins the controller prefix with the request path, without a version', () => {
		expect(toRequestPath('/widgets', requestAt('/w-1'))).toBe('/widgets/w-1');
	});

	it('uses the request path alone when the prefix is the root', () => {
		expect(toRequestPath('/', requestAt('/widgets'))).toBe('/widgets');
	});

	it('drops a trailing slash', () => {
		expect(toRequestPath('/widgets', requestAt('/'))).toBe('/widgets');
	});

	it('keeps the root path', () => {
		expect(toRequestPath('/', requestAt('/'))).toBe('/');
	});
});

describe('toRouteName', () => {
	it('joins the upper-cased method with the prefixed template', () => {
		expect(toRouteName('get', '/widgets', '/:widgetId')).toBe('GET /widgets/{widgetId}');
	});

	it('drops the trailing slash of a root route', () => {
		expect(toRouteName('get', '/widgets', '/')).toBe('GET /widgets');
	});

	it('keeps the root path when the prefix is the root and the template is the root', () => {
		expect(toRouteName('get', '/', '/')).toBe('GET /');
	});
});

describe('toEndpointPath', () => {
	it('prefixes the path with the API version', () => {
		expect(toEndpointPath('v1', '/widgets', '/:widgetId')).toBe('/v1/widgets/:widgetId');
	});

	it('drops the trailing slash of a root route', () => {
		expect(toEndpointPath('v1', '/widgets', '/')).toBe('/v1/widgets');
	});

	it('omits the prefix when it is the root', () => {
		expect(toEndpointPath('v1', '/', '/executions')).toBe('/v1/executions');
	});
});

describe('toPublicApiResult', () => {
	it.each([
		[200, '2xx'],
		[201, '2xx'],
		[204, '2xx'],
		[304, '2xx'],
		[400, '4xx'],
		[401, '4xx'],
		[403, '4xx'],
		[404, '4xx'],
		[429, '4xx'],
		[500, '5xx'],
		[503, '5xx'],
	])('classifies status %i as %s', (statusCode, expectedResult) => {
		expect(toPublicApiResult(statusCode)).toBe(expectedResult);
	});
});
