import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { UnexpectedError } from 'n8n-workflow';
import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { stringify } from 'yaml';
import type { z } from 'zod';

import { HTTP_METHODS } from '@/public-api/public-api-route-resolver';

import {
	getDecoratorGeneratedOperations,
	getSharedResponseSchemas,
	type NamedResponseDto,
	type SchemaResolver,
} from './decorator-routes';

const COMPONENT_SCHEMA_REF = /^#\/components\/schemas\/(.+)$/;
const SHARED_SCHEMA_DIR = 'shared/spec/schemas';
const YAML_OPTS = { aliasDuplicateObjects: false, singleQuote: true, lineWidth: 0 } as const;

// Generated root that registers every decorator-routed operation, sitting next to `openapi.yml` so
// its `$ref`s to the fragment files resolve on the same relative basis.
export const DECORATOR_ROOT_FILENAME = 'openapi.decorator-routes.generated.yml';

/** The subset of an OpenAPI document this module reads/merges. Everything else passes through. */
export interface OpenApiDocument {
	paths?: Record<string, Record<string, unknown>>;
	components?: Record<string, Record<string, unknown>>;
	[key: string]: unknown;
}

export interface GeneratedArtifact {
	/** Where to write the fragment, relative to the `v1` directory. */
	outputPath: string;
	content: string;
}

/**
 * Lower-cased first char matches the existing hand-written schema-file convention (`tag.yml`)
 */
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
 * component schema under {@link SHARED_SCHEMA_DIR}.
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
			path.posix.relative(
				path.posix.dirname(outputPath),
				`${SHARED_SCHEMA_DIR}/${schemaFileName(componentName)}`,
			),
		);
		artifacts.push({ outputPath, content: stringify(operation, YAML_OPTS) });
	});

	return artifacts;
}

/**
 * Registers every shared response DTO as a named component on `registry`, keyed by DTO class
 * identity (see `getSharedResponseSchemas`) so a schema is only ever "the same" as another when
 * it's the exact same class.
 */
export function registerSharedSchemas(
	registry: OpenAPIRegistry,
	sharedResponseSchemas: Map<NamedResponseDto, z.ZodTypeAny>,
): Map<NamedResponseDto, z.ZodTypeAny> {
	const sharedZodSchemas = new Map<NamedResponseDto, z.ZodTypeAny>();
	const dtoByComponentName = new Map<string, NamedResponseDto>();

	sharedResponseSchemas.forEach((schema, dto) => {
		const clashing = dtoByComponentName.get(dto.name);
		if (clashing && clashing !== dto) {
			throw new UnexpectedError(
				`Two different shared response DTOs are both named '${dto.name}' - their generated ` +
					'OpenAPI component names would collide. Rename one of the DTO classes.',
			);
		}
		dtoByComponentName.set(dto.name, dto);

		sharedZodSchemas.set(dto, registry.register(dto.name, schema));
	});

	return sharedZodSchemas;
}

/**
 * The decorator-routes root: `paths` `$ref`ing each operation fragment by its file path. Bundling
 * this (see build.mjs) yields a resolved document whose paths are merged into the hand-written spec.
 */
function buildDecoratorRootDocument(
	operations: Array<{ pathKey: string; method: string; outputPath: string }>,
): OpenApiDocument {
	const paths: Record<string, Record<string, unknown>> = {};
	operations.forEach(({ pathKey, method, outputPath }) => {
		const pathItem = (paths[pathKey] ??= {});
		if (pathItem[method]) {
			throw new UnexpectedError(
				`Two @PublicApiController routes both map to ${method.toUpperCase()} ${pathKey}.`,
			);
		}
		// `./<outputPath>` — the root sits at the v1 dir root and outputPath is relative to that dir.
		pathItem[method] = { $ref: `./${outputPath}` };
	});
	return { openapi: '3.0.0', info: { title: 'decorator-routes', version: '0.0.0' }, paths };
}

export function getGeneratedArtifacts(): GeneratedArtifact[] {
	const registry = new OpenAPIRegistry();
	const sharedZodSchemas = registerSharedSchemas(registry, getSharedResponseSchemas());

	// Look up an already-registered schema instead of re-registering it avoiding inlining the same schema
	const resolveSchema: SchemaResolver = (dto, schema) => sharedZodSchemas.get(dto) ?? schema;

	const operations = getDecoratorGeneratedOperations(resolveSchema);
	operations.forEach(({ config }) => registry.registerPath(config));

	const artifacts = buildArtifactsFromRegistry(
		registry,
		operations.map(({ outputPath, pathKey, method }) => ({ outputPath, pathKey, method })),
	);

	// The root that wires the fragments into the bundle — committed and drift-checked like the rest.
	artifacts.push({
		outputPath: DECORATOR_ROOT_FILENAME,
		content: stringify(buildDecoratorRootDocument(operations), YAML_OPTS),
	});

	return artifacts;
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

function mergeComponents(
	base: OpenApiDocument['components'],
	extra: OpenApiDocument['components'],
): OpenApiDocument['components'] {
	if (!extra) return base;
	const merged: NonNullable<OpenApiDocument['components']> = { ...base };
	for (const [section, items] of Object.entries(extra)) {
		const target = { ...(merged[section] ?? {}) };
		for (const [name, definition] of Object.entries(items)) {
			// A component may legitimately appear in both bundles (the same shared file hoisted
			// independently) — that's a harmless duplicate. Only differing definitions are a clash.
			if (name in target && !isDeepStrictEqual(target[name], definition)) {
				throw new UnexpectedError(
					`OpenAPI component components.${section}.${name} is defined differently by a hand-written ` +
						'path and a @PublicApiController route — rename one so they no longer collide.',
				);
			}
			target[name] = definition;
		}
		merged[section] = target;
	}
	return merged;
}

/**
 * Merges the decorator-routed document into the hand-written (eov) one at *method* granularity, so a
 * path served partly by eov and partly by a controller (e.g. eov `POST /tags` + decorator `GET
 * /tags`) ends up whole. A path+method declared on both sides is a hard error — the same operation
 * can't have two definitions. Both inputs are expected to be already-bundled (all `$ref`s resolved),
 * so their `components` are merged too, deduping the shared files each side hoisted independently.
 */
export function mergeDecoratorDocument(
	base: OpenApiDocument,
	decorator: OpenApiDocument,
): OpenApiDocument {
	const paths: Record<string, Record<string, unknown>> = { ...(base.paths ?? {}) };

	for (const [pathKey, methods] of Object.entries(decorator.paths ?? {})) {
		const existing = paths[pathKey];
		if (!existing) {
			paths[pathKey] = methods;
			continue;
		}
		const combined = { ...existing };
		for (const [method, operation] of Object.entries(methods)) {
			if (HTTP_METHODS.some((m) => m === method) && combined[method] !== undefined) {
				throw new UnexpectedError(
					`Duplicate OpenAPI operation ${method.toUpperCase()} ${pathKey}: it is declared by both a ` +
						'hand-written (eov) path and a @PublicApiController route — remove the hand-written one.',
				);
			}
			combined[method] = operation;
		}
		paths[pathKey] = combined;
	}

	return { ...base, paths, components: mergeComponents(base.components, decorator.components) };
}
