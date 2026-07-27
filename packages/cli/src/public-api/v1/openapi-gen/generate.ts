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

const COMPONENT_SCHEMA_REF = /^#\/components\/schemas\/(.+)$/;
const SHARED_SCHEMA_DIR = 'shared/spec/schemas';
const YAML_OPTS = { aliasDuplicateObjects: false, singleQuote: true } as const;

export interface GeneratedArtifact {
	/** Where to write the fragment, relative to the `v1` directory. */
	outputPath: string;
	content: string;
}

/**
 * Lower-cased first char matches the existing hand-written schema-file convention (`tag.yml`)
 * E.g. `TagListPublic` -> `tagListPublic.generated.yml`.
 * `.generated.` marks it build-owned.
 **/
function schemaFileName(componentName: string): string {
	return `${componentName[0].toLowerCase()}${componentName.slice(1)}.generated.yml`;
}

/**
 * Rewrites every `$ref: '#/components/schemas/<Name>'` in an already-generated document node to a
 * file path, in place.
 */
function rewriteComponentRefs(node: unknown, toRef: (componentName: string) => string): void {
	if (Array.isArray(node)) {
		node.forEach((item) => rewriteComponentRefs(item, toRef));
		return;
	}

	if (node === null || typeof node !== 'object') {
		return;
	}

	const record = node as Record<string, unknown>;
	Object.entries(record).forEach(([key, value]) => {
		const match = key === '$ref' && typeof value === 'string' && COMPONENT_SCHEMA_REF.exec(value);
		if (match) {
			record[key] = toRef(match[1]);
		} else {
			rewriteComponentRefs(value, toRef);
		}
	});
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
	Object.entries(document.components?.schemas ?? {}).forEach(([componentName, schema]) => {
		rewriteComponentRefs(schema, schemaFileName);
		artifacts.push({
			outputPath: `${SHARED_SCHEMA_DIR}/${schemaFileName(componentName)}`,
			content: stringify(schema, YAML_OPTS),
		});
	});

	// One file per operation, with its shared-schema refs pointed at the files above.
	operations.forEach(({ outputPath, pathKey, method }) => {
		const operation = document.paths?.[pathKey]?.[method];
		rewriteComponentRefs(operation, (componentName) =>
			path.relative(
				path.dirname(outputPath),
				`${SHARED_SCHEMA_DIR}/${schemaFileName(componentName)}`,
			),
		);
		artifacts.push({ outputPath, content: stringify(operation, YAML_OPTS) });
	});

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
	const sharedZodSchemas = new Map<string, z.ZodTypeAny>();

	const sharedResponseSchemas = getSharedResponseSchemas();

	sharedResponseSchemas.forEach((schema, componentName) => {
		sharedZodSchemas.set(componentName, registry.register(componentName, schema));
	});

	const resolveSchema: SchemaResolver = (componentName, schema) =>
		sharedZodSchemas.get(componentName) ?? schema;

	const operations = getDecoratorGeneratedOperations(resolveSchema);
	operations.forEach(({ config }) => registry.registerPath(config));

	return buildArtifactsFromRegistry(
		registry,
		operations.map(({ outputPath, pathKey, method }) => ({ outputPath, pathKey, method })),
	);
}

/**
 * Regenerates every generated fragment and writes it under `v1Dir`. Creates parent directories
 * as needed — a decorator-routed operation may target a resource whose `spec/` folder doesn't
 * exist yet (a brand-new endpoint, never hand-written).
 */
export function generateDocs(v1Dir: string): void {
	const artifacts = getGeneratedArtifacts();

	artifacts.forEach(({ outputPath, content }) => {
		const fullPath = path.join(v1Dir, outputPath);
		fs.mkdirSync(path.dirname(fullPath), { recursive: true });
		fs.writeFileSync(fullPath, content);
	});
}
