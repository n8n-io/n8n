import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

import { resolvePublicApiRoutes } from '@/public-api/public-api-route-resolver';

import { buildRequestBodyJsonSchema, getDecoratorGeneratedOperations } from '../decorator-routes';

/**
 * The build writes a request body schema into the spec. `/discover` builds the same schema at
 * runtime, through `buildRequestBodyJsonSchema`, for a route whose media type is `discoverable`
 * (JSON; not multipart). Nothing else checks that the two agree.
 */
const V1_DIR = path.resolve(__dirname, '../..');

// The build writes one spec file per route and names it after the handler method, so the handler
// name is what links a route to its file.
const SPEC_FILE_BY_HANDLER = new Map(
	getDecoratorGeneratedOperations().map((operation) => [
		operation.config.operationId,
		operation.outputPath,
	]),
);

function schemaInSpecFile(handlerName: string, mediaType: string): unknown {
	const specFile = SPEC_FILE_BY_HANDLER.get(handlerName);
	if (!specFile) throw new Error(`The build generated no spec file for ${handlerName}`);

	const spec = parse(fs.readFileSync(path.join(V1_DIR, specFile), 'utf8')) as {
		requestBody?: { content?: Record<string, { schema?: unknown }> };
	};

	return spec.requestBody?.content?.[mediaType]?.schema;
}

describe('buildRequestBodyJsonSchema', () => {
	const discoverableRoutesWithBody = resolvePublicApiRoutes().filter(
		(route) => route.requestBodyDto && route.requestBodyHandler?.discoverable,
	);

	it.each(discoverableRoutesWithBody)('$handlerName matches its committed spec file', (route) => {
		assert(route.requestBodyMedia, 'expected a route with a body to have a resolved media type');

		expect(buildRequestBodyJsonSchema(route)).toEqual(
			schemaInSpecFile(route.handlerName, route.requestBodyMedia.mediaType),
		);
	});
});
