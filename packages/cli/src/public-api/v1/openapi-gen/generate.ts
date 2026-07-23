import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import fs from 'node:fs';
import path from 'node:path';
import { stringify } from 'yaml';
import type { z } from 'zod';

import {
	getDecoratorGeneratedOperations,
	getSharedResponseSchemas,
	type SchemaResolver,
} from './decorator-routes';

/**
 * `v1`-relative directory for generated schemas shared across operations. Mirrors the hand-written
 * `shared/spec/{parameters,responses,schemas}` layout the eov specs already use, so a generated
 * operation fragment references a shared schema exactly like it references a shared pagination
 * parameter — by relative file path. That's deliberate: a fragment is a bare operation with no
 * `components` section of its own, so an internal `#/components/schemas/...` pointer (what
 * zod-to-openapi emits) would dangle. `redocly bundle` follows the file `$ref` transitively, so
 * the shared file is pulled into the bundled document without `openapi.yml` referencing it.
 */
const SHARED_SCHEMA_DIR = 'shared/spec/schemas';

// singleQuote: true matches this repo's prettier config (.prettierrc.js) — without it, the `yaml`
// package's default quoting differs from prettier's, so every regeneration produces a spurious
// quote-style diff against what lefthook's prettier hook already reformatted at commit time.
const YAML_OPTS = { aliasDuplicateObjects: false, singleQuote: true } as const;

export interface GeneratedArtifact {
	/** Where to write the fragment, relative to the `v1` directory. */
	outputPath: string;
	content: string;
}

/** `TagListPublic` -> `tagListPublic.generated.yml`. Lower-cased first char matches the existing
 * hand-written schema-file convention (`tag.yml`), `.generated.` marks it build-owned. */
function schemaFileName(componentName: string): string {
	return `${componentName[0].toLowerCase()}${componentName.slice(1)}.generated.yml`;
}

/**
 * Rewrites every `$ref: '#/components/schemas/<Name>'` in an already-generated document node to a
 * file path, in place. zod-to-openapi only ever emits internal component pointers; the fragment
 * layout needs file refs instead. `toRef` maps a component name to the path to write — relative to
 * the referencing fragment for an operation, or a bare sibling filename for one shared schema
 * referencing another.
 */
function rewriteComponentRefs(node: unknown, toRef: (componentName: string) => string): void {
	if (Array.isArray(node)) {
		for (const item of node) rewriteComponentRefs(item, toRef);
		return;
	}
	if (node === null || typeof node !== 'object') return;

	const record = node as Record<string, unknown>;
	for (const [key, value] of Object.entries(record)) {
		const match =
			key === '$ref' && typeof value === 'string' && /^#\/components\/schemas\/(.+)$/.exec(value);
		if (match) {
			record[key] = toRef(match[1]);
		} else {
			rewriteComponentRefs(value, toRef);
		}
	}
}

interface OperationTarget {
	outputPath: string;
	pathKey: string;
	method: RouteConfig['method'];
}

/**
 * Generates the whole document from one registry (holding every operation and every shared schema)
 * and slices it back into the committed fragment files: one per operation, plus one per shared
 * component schema under {@link SHARED_SCHEMA_DIR}. Generating a single document — rather than one
 * throwaway document per operation, the pre-registry approach — is what lets zod-to-openapi emit a
 * `$ref` to a shared schema instead of re-inlining it into each operation.
 *
 * Exported for the registry unit test, which drives it with a hand-built registry.
 */
export function buildArtifactsFromRegistry(
	registry: OpenAPIRegistry,
	operations: OperationTarget[],
): GeneratedArtifact[] {
	const document = new OpenApiGeneratorV3(registry.definitions).generateDocument({
		openapi: '3.0.0',
		info: { title: 'throwaway', version: '0.0.0' },
	});

	const artifacts: GeneratedArtifact[] = [];

	// One file per shared component schema. A shared schema referencing another resolves to a
	// sibling file in the same directory, hence the bare filename.
	for (const [componentName, schema] of Object.entries(document.components?.schemas ?? {})) {
		rewriteComponentRefs(schema, schemaFileName);
		artifacts.push({
			outputPath: `${SHARED_SCHEMA_DIR}/${schemaFileName(componentName)}`,
			content: stringify(schema, YAML_OPTS),
		});
	}

	// One file per operation, with its shared-schema refs pointed at the files above.
	for (const { outputPath, pathKey, method } of operations) {
		const operation = document.paths?.[pathKey]?.[method];
		rewriteComponentRefs(operation, (componentName) =>
			path.relative(
				path.dirname(outputPath),
				`${SHARED_SCHEMA_DIR}/${schemaFileName(componentName)}`,
			),
		);
		artifacts.push({ outputPath, content: stringify(operation, YAML_OPTS) });
	}

	return artifacts;
}

/**
 * The single source of truth for every generated fragment: its `outputPath` (relative to the
 * `v1` directory) and freshly-rendered `content`. Both the build (`generateDocs`, which writes
 * these to disk) and the drift guard (`__tests__/generated-spec-drift.test.ts`, which asserts the
 * committed files still match) iterate this. Decorator-routed operations are discovered by scanning
 * `@PublicApiController` classes, so a newly decorated route (and any schema it newly shares)
 * extends this automatically.
 */
export function getGeneratedArtifacts(): GeneratedArtifact[] {
	const registry = new OpenAPIRegistry();

	// Register shared schemas first so the operations built below embed the registered instance
	// (which zod-to-openapi renders as a `$ref`) rather than the raw one (which it inlines).
	const registered = new Map<string, z.ZodTypeAny>();
	for (const [componentName, schema] of getSharedResponseSchemas()) {
		registered.set(componentName, registry.register(componentName, schema));
	}
	const resolveSchema: SchemaResolver = (componentName, schema) =>
		registered.get(componentName) ?? schema;

	const operations = getDecoratorGeneratedOperations(resolveSchema);
	for (const { config } of operations) registry.registerPath(config);

	return buildArtifactsFromRegistry(
		registry,
		operations.map(({ outputPath, pathKey, method }) => ({ outputPath, pathKey, method })),
	);
}

/**
 * Regenerates every generated fragment and writes it under `v1Dir`. Creates parent directories
 * as needed — a decorator-routed operation may target a resource whose `spec/` folder doesn't
 * exist yet (a brand-new endpoint, never hand-written).
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
		const fullPath = path.join(v1Dir, outputPath);
		fs.mkdirSync(path.dirname(fullPath), { recursive: true });
		fs.writeFileSync(fullPath, content);
	}
}
