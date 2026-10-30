import './zod-extend';

import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { isRecord } from '@n8n/utils/is-record';

import type { ResolvedPublicApiRoute } from '@/public-api/public-api-route-resolver';

import { applySchemaModifiers } from './schema-modifiers';

const REQUEST_BODY_COMPONENT = 'RequestBody';

/**
 * Converts a route's `@Body` DTO into JSON Schema, using the same conversion the build runs when
 * it writes the OpenAPI files. zod-to-openapi can only convert a schema that a registry holds, so
 * this registers one under a throwaway name and then reads the result back out.
 */
export function buildRequestBodyJsonSchema(
	route: ResolvedPublicApiRoute,
): Record<string, unknown> | undefined {
	if (!route.requestBodyDto) return undefined;

	const registry = new OpenAPIRegistry();
	registry.register(REQUEST_BODY_COMPONENT, route.requestBodyDto.schema);

	const { components } = new OpenApiGeneratorV3(registry.definitions).generateComponents();
	const schema = components?.schemas?.[REQUEST_BODY_COMPONENT];

	applySchemaModifiers(schema);

	return isRecord(schema) ? schema : undefined;
}
