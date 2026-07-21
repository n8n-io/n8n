import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import fs from 'node:fs';
import path from 'node:path';
import { stringify } from 'yaml';

import { getDecoratorGeneratedOperations } from './decorator-routes';

/**
 * Generates a single HTTP-method operation (not a whole path item) as a standalone YAML fragment,
 * for a hand-written path file to `$ref` at the operation level — e.g. `tags.yml`'s `get:` key
 * pointing at this instead of the whole `/tags` path item, while its `post:` key stays hand-written
 * next to it. This is how a path with some methods still eov-routed and others decorator-routed
 * coexists in one bundled document.
 *
 * zod-to-openapi has no standalone "convert this route" export — parameter/requestBody/response
 * processing only happens inside a registry + `OpenApiGeneratorV3.generateDocument`'s path-walking
 * logic. So the operation is generated via a throwaway registry holding just this one route and a
 * one-path document, taking just that operation back out; the wrapping `openapi`/`info` fields
 * never reach the output file.
 */
export function generateOperationYaml(
	pathKey: string,
	method: RouteConfig['method'],
	config: RouteConfig,
): string {
	const registry = new OpenAPIRegistry();
	registry.registerPath(config);

	const document = new OpenApiGeneratorV3(registry.definitions).generateDocument({
		openapi: '3.0.0',
		info: { title: 'throwaway', version: '0.0.0' },
	});

	const operation = document.paths?.[pathKey]?.[method];
	// singleQuote: true matches this repo's prettier config (.prettierrc.js) — without it, the
	// `yaml` package's default quoting differs from prettier's, so every regeneration produces a
	// spurious quote-style diff against what lefthook's prettier hook already reformatted at
	// commit time.
	return stringify(operation, { aliasDuplicateObjects: false, singleQuote: true });
}

/**
 * The single source of truth for every generated fragment: its `outputPath` (relative to the
 * `v1` directory) and freshly-rendered `content`. Both the build (`generateDocs`, which writes
 * these to disk) and the drift guard (`__tests__/generated-spec-drift.test.ts`, which asserts the
 * committed files still match) iterate this. Decorator-routed operations
 * (`getDecoratorGeneratedOperations`) need no manual registration — they're discovered by scanning
 * `@PublicApiController` classes, so a newly decorated route extends this automatically.
 */
export function getGeneratedArtifacts(): Array<{ outputPath: string; content: string }> {
	return getDecoratorGeneratedOperations().map(({ outputPath, pathKey, method, config }) => ({
		outputPath,
		content: generateOperationYaml(pathKey, method, config),
	}));
}

/**
 * Regenerates every generated operation and writes it under `v1Dir`. Creates parent directories
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
