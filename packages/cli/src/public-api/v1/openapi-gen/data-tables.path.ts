// Must run before importing @n8n/api-types: extendZodWithOpenApi patches `.describe()` itself,
// so any DTO/schema module that calls `.describe()` at load time (like data-table.schema.ts)
// needs the patch already active, or its description is silently dropped — not overridden, just
// absent, since zod-to-openapi only ever reads from its own internal metadata store, never zod's
// native `_def.description`. Import order here is load-bearing.
import './zod-extend';

import { PublicApiListDataTableQueryDto } from '@n8n/api-types';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

/**
 * Response schemas keep $ref-ing the existing hand-written `../schemas/dataTable*.yml` files
 * unchanged — there's no response DTO in `@n8n/api-types` today (the handler returns the
 * TypeORM entity with `project` stripped ad hoc), so generating a response shape here would be
 * inventing a contract, not reflecting one.
 *
 * The request body schema (`createDataTableRequest`) IS generated from the real DTO, but as a
 * separate, independently-regenerated artifact (see `data-tables.schemas.ts` /
 * `generate.ts`'s `GENERATED_SCHEMAS`) rather than embedded inline here — this `$ref` is a plain
 * hand-written pointer to that generated file, matching how `dataTableList.yml`/`dataTable.yml`
 * are referenced below.
 */
const createDataTableRequestRef = { $ref: '../schemas/createDataTableRequest.generated.yml' };

/**
 * `filter` IS the real DTO field (a `z.string().transform(jsonParse)`), `.openapi()`-overridden
 * at the registration site only — the underlying `@n8n/api-types` schema is untouched. Naive
 * registration collapses it to a bare `{ type: 'string' }` with no format/example: ZodEffects
 * has no OpenAPI-native representation.
 */
const filterParam = PublicApiListDataTableQueryDto.schema.shape.filter.openapi({
	type: 'string',
	format: 'jsonString',
	description: 'JSON string of filter conditions',
	example: '{"name":"my-table"}',
});

/**
 * `sortBy` introspects perfectly, no override needed — and generating it surfaces something the
 * hand-written spec this supersedes didn't: the real `enum` of valid sort values. That spec just
 * said `type: string` with a free-text description; the DTO knows the exhaustive list.
 */
const sortByParam = PublicApiListDataTableQueryDto.schema.shape.sortBy.openapi({
	example: 'name:asc',
});

/**
 * `limit`/`cursor` are intentionally NOT generated from `PublicApiListDataTableQueryDto` — its
 * `offset`/`limit` fields are `z.string().transform(...)` chains that introspect down to a bare
 * `{ type: 'string' }` with the `maximum`/`default` constraints silently dropped, and the wire
 * parameter is `cursor`, not `offset` (cursor decoding happens in `validCursor` middleware,
 * upstream of this DTO). Left as $refs to the existing shared parameter files, same as today —
 * nothing about pagination is changing in this swap. Unlike zod-openapi, these can't sit in the
 * same flat `parameters` array as the zod-derived ones below: zod-to-openapi keeps `parameters`
 * typed as plain OpenAPI ParameterObject/ReferenceObject (no zod schemas allowed there), so
 * DTO-derived params have to go through the separate `request.query` bucket instead.
 */
const limitParamRef = { $ref: '../../../../shared/spec/parameters/limit.yml' };
const cursorParamRef = { $ref: '../../../../shared/spec/parameters/cursor.yml' };

const listDataTablesRoute: RouteConfig = {
	method: 'get',
	path: '/data-tables',
	tags: ['DataTable'],
	summary: 'List all data tables',
	description:
		'Retrieve a list of all data tables with optional filtering, sorting, and pagination.',
	operationId: 'list-data-tables',
	'x-eov-operation-id': 'listDataTables',
	'x-required-scope': 'dataTable:list',
	'x-eov-operation-handler': 'v1/handlers/data-tables/data-tables.handler',
	parameters: [limitParamRef, cursorParamRef],
	request: {
		query: z.object({ filter: filterParam, sortBy: sortByParam }),
	},
	responses: {
		200: {
			description: 'Successfully retrieved data tables',
			content: { 'application/json': { schema: { $ref: '../schemas/dataTableList.yml' } } },
		},
		400: { $ref: '../../../../shared/spec/responses/badRequest.yml' },
		401: { $ref: '../../../../shared/spec/responses/unauthorized.yml' },
	},
	security: [{ ApiKeyAuth: [] }],
};

const createDataTableRoute: RouteConfig = {
	method: 'post',
	path: '/data-tables',
	tags: ['DataTable'],
	summary: 'Create a new data table',
	description:
		'Create a new data table in your personal project or a team project you have access to.',
	operationId: 'create-data-table',
	'x-eov-operation-id': 'createDataTable',
	'x-required-scope': 'dataTable:create',
	'x-eov-operation-handler': 'v1/handlers/data-tables/data-tables.handler',
	request: {
		body: {
			required: true,
			content: {
				'application/json': {
					schema: createDataTableRequestRef,
					examples: {
						personalProject: {
							summary: 'Default (personal project)',
							value: {
								name: 'customers',
								columns: [
									{ name: 'email', type: 'string' },
									{ name: 'status', type: 'string' },
									{ name: 'age', type: 'number' },
								],
							},
						},
						scopedProject: {
							summary: 'Explicit project',
							value: {
								name: 'customers',
								projectId: 'a1b2c3d4',
								columns: [
									{ name: 'email', type: 'string' },
									{ name: 'status', type: 'string' },
								],
							},
						},
					},
				},
			},
		},
	},
	responses: {
		201: {
			description: 'Data table created successfully',
			content: { 'application/json': { schema: { $ref: '../schemas/dataTable.yml' } } },
		},
		400: { $ref: '../../../../shared/spec/responses/badRequest.yml' },
		401: { $ref: '../../../../shared/spec/responses/unauthorized.yml' },
		403: { $ref: '../../../../shared/spec/responses/forbidden.yml' },
		409: { $ref: '../../../../shared/spec/responses/conflict.yml' },
	},
	security: [{ ApiKeyAuth: [] }],
};

/**
 * Unlike zod-openapi's `ZodOpenApiPathItemObject` (one object holding every HTTP method for a
 * path), zod-to-openapi's unit of registration is one `RouteConfig` per method+path — there's no
 * "path item" type of its own. Same-path routes only get merged together at generation time,
 * inside the registry/generator's own path-walking logic.
 */
export const dataTablesRoutes: RouteConfig[] = [listDataTablesRoute, createDataTableRoute];
