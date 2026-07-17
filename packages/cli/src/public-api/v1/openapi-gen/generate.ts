import fs from 'node:fs';
import path from 'node:path';

import type { ZodType } from 'zod';
import { stringify } from 'yaml';
import { createDocument, createSchema } from 'zod-openapi';
import type { ZodOpenApiPathItemObject } from 'zod-openapi';

import { createDataTableRequestSchema } from './data-tables.schemas';
import { dataTablesPath } from './data-tables.path';

interface GeneratedPath {
	/** Where to write the generated fragment, relative to the `v1` directory. */
	outputPath: string;
	pathItem: ZodOpenApiPathItemObject;
}

interface GeneratedSchema {
	/** Where to write the generated fragment, relative to the `v1` directory. */
	outputPath: string;
	/** The `ref` name this schema was registered under via `.openapi({ ref })`. */
	ref: string;
	schema: ZodType;
}

/**
 * Resources that have opted into generating their `openapi.yml` path from Zod DTOs instead of
 * hand-written YAML. To add another endpoint: write its `get`/`post`/etc. as a
 * `ZodOpenApiPathItemObject` in a sibling `<resource>.path.ts` (see `data-tables.path.ts` for the
 * pattern — request schemas come from the real DTO, responses/errors stay as $refs to existing
 * hand-written schema files until a response DTO exists), then add one entry here and point the
 * matching `openapi.yml` path at the generated output.
 */
const GENERATED_PATHS: Record<string, GeneratedPath> = {
	'/data-tables': {
		outputPath: 'handlers/data-tables/spec/paths/data-tables.generated.yml',
		pathItem: dataTablesPath,
	},
};

/**
 * Named component schemas (registered via `.openapi({ ref })` in a sibling `<resource>.schemas.ts`)
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
 * `zod-openapi` has no standalone "convert a single path item" export — `parameters`/
 * `requestBody`/`responses` processing only happens inside `createDocument`'s path-walking
 * logic. So each path is generated via a throwaway one-path document, taking just that one path
 * back out; the wrapping `openapi`/`info` fields never reach the output file.
 */
export function generatePathYaml(pathItem: ZodOpenApiPathItemObject): string {
	const document = createDocument({
		openapi: '3.0.0',
		info: { title: 'throwaway', version: '0.0.0' },
		paths: { '/x': pathItem },
	});

	// singleQuote: true matches this repo's prettier config (.prettierrc.js) — without it, the
	// `yaml` package's default quoting differs from prettier's, so every regeneration produces a
	// spurious quote-style diff against what lefthook's prettier hook already reformatted at
	// commit time.
	return stringify(document.paths?.['/x'], { aliasDuplicateObjects: false, singleQuote: true });
}

/**
 * Generates a single named component schema as a standalone YAML fragment. `createSchema()`
 * returns a ref-tagged schema itself as just `{ $ref: '#/components/schemas/<ref>' }` — the
 * actual content lives in `components[ref]`, which is what gets written out here (request-body
 * schemas use `schemaType: 'input'`, matching how `createDocument` treats request bodies).
 */
export function generateSchemaYaml(schema: ZodType, ref: string): string {
	const { components } = createSchema(schema, { schemaType: 'input' });
	return stringify(components?.[ref], { aliasDuplicateObjects: false, singleQuote: true });
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
		...Object.values(GENERATED_PATHS).map(({ outputPath, pathItem }) => ({
			outputPath,
			content: generatePathYaml(pathItem),
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
