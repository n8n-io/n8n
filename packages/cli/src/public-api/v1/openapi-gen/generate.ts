import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import fs from 'node:fs';
import path from 'node:path';
import { stringify } from 'yaml';
import type { ZodType } from 'zod';

import { createDataTableRequestSchema } from './data-tables.schemas';
import { dataTablesRoutes } from './data-tables.path';

interface GeneratedPath {
	/** Where to write the generated fragment, relative to the `v1` directory. */
	outputPath: string;
	routes: RouteConfig[];
}

interface GeneratedSchema {
	/** Where to write the generated fragment, relative to the `v1` directory. */
	outputPath: string;
	/** The name this schema was registered under via `.openapi(ref)`. */
	ref: string;
	schema: ZodType;
}

/**
 * Resources that have opted into generating their `openapi.yml` path from Zod DTOs instead of
 * hand-written YAML. To add another endpoint: write its routes as `RouteConfig[]` in a sibling
 * `<resource>.path.ts` (see `data-tables.path.ts` for the pattern — request schemas come from the
 * real DTO, responses/errors stay as $refs to existing hand-written schema files until a response
 * DTO exists), then add one entry here and point the matching `openapi.yml` path at the generated
 * output.
 */
const GENERATED_PATHS: Record<string, GeneratedPath> = {
	'/data-tables': {
		outputPath: 'handlers/data-tables/spec/paths/data-tables.generated.yml',
		routes: dataTablesRoutes,
	},
};

/**
 * Named component schemas (registered via `.openapi(ref)` in a sibling `<resource>.schemas.ts`)
 * generated as their own standalone file, for a hand-written `$ref` elsewhere to point at — see
 * `createDataTableRequestRef` in `data-tables.path.ts`. Generated independently from any path that
 * references them, so either can be regenerated without touching the other.
 */
const GENERATED_SCHEMAS: Record<string, GeneratedSchema> = {
	createDataTableRequest: {
		outputPath: 'handlers/data-tables/spec/schemas/createDataTableRequest.generated.yml',
		ref: 'createDataTableRequest',
		schema: createDataTableRequestSchema,
	},
};

/**
 * zod-to-openapi has no standalone "convert these routes" export — parameter/requestBody/response
 * processing only happens inside a registry + `OpenApiGeneratorV3.generateDocument`'s path-walking
 * logic. So each path is generated via a throwaway registry holding just that path's routes and a
 * one-path document, taking just that merged path item back out; the wrapping `openapi`/`info`
 * fields never reach the output file.
 */
export function generatePathYaml(pathKey: string, routes: RouteConfig[]): string {
	const registry = new OpenAPIRegistry();
	routes.forEach((route) => registry.registerPath(route));

	const document = new OpenApiGeneratorV3(registry.definitions).generateDocument({
		openapi: '3.0.0',
		info: { title: 'throwaway', version: '0.0.0' },
	});

	// singleQuote: true matches this repo's prettier config (.prettierrc.js) — without it, the
	// `yaml` package's default quoting differs from prettier's, so every regeneration produces a
	// spurious quote-style diff against what lefthook's prettier hook already reformatted at
	// commit time.
	return stringify(document.paths?.[pathKey], { aliasDuplicateObjects: false, singleQuote: true });
}

/**
 * Generates a single named component schema as a standalone YAML fragment. Unlike
 * `generatePathYaml`, this schema isn't referenced by any route in its own throwaway registry —
 * it has to be registered explicitly via `registry.register(ref, schema)`, or `generateComponents`
 * would have nothing to walk. Request-body schemas render the same regardless of `generateDocument`
 * vs `generateComponents` here — zod-to-openapi doesn't have zod-openapi's request/response
 * schemaType split.
 */
export function generateSchemaYaml(schema: ZodType, ref: string): string {
	const registry = new OpenAPIRegistry();
	registry.register(ref, schema);

	const { components } = new OpenApiGeneratorV3(registry.definitions).generateComponents();
	return stringify(components?.schemas?.[ref], { aliasDuplicateObjects: false, singleQuote: true });
}

/**
 * The single source of truth for every generated fragment: its `outputPath` (relative to the
 * `v1` directory) and freshly-rendered `content`. Both the build (`generateDocs`, which writes
 * these to disk) and the drift guard (`__tests__/generated-spec-drift.test.ts`, which asserts the
 * committed files still match) iterate this, so adding a resource to `GENERATED_PATHS`/
 * `GENERATED_SCHEMAS` automatically extends both.
 */
export function getGeneratedArtifacts(): Array<{ outputPath: string; content: string }> {
	return [
		...Object.entries(GENERATED_PATHS).map(([pathKey, { outputPath, routes }]) => ({
			outputPath,
			content: generatePathYaml(pathKey, routes),
		})),
		...Object.values(GENERATED_SCHEMAS).map(({ outputPath, ref, schema }) => ({
			outputPath,
			content: generateSchemaYaml(schema, ref),
		})),
	];
}

/**
 * Regenerates every path/schema in `GENERATED_PATHS`/`GENERATED_SCHEMAS` and writes it under
 * `v1Dir`.
 *
 * `v1Dir` must be `<package>/src/public-api/v1` specifically — `redocly bundle` (see
 * `scripts/build.mjs`'s `bundleOpenApiSpecs`) always resolves `openapi.yml`'s `$ref`s against the
 * `src` tree, writing only its final bundled output to `dist`. That holds regardless of whether
 * this function itself is running from source (tests) or from compiled `dist` JS (the real build,
 * where `__dirname` would point at `dist` and silently write the fragment somewhere the bundler
 * never looks) — hence taking the target directory as an explicit argument instead of deriving it
 * from `__dirname`.
 */
export function generateDocs(v1Dir: string): void {
	for (const { outputPath, content } of getGeneratedArtifacts()) {
		fs.writeFileSync(path.join(v1Dir, outputPath), content);
	}
}
