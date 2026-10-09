import { isContainedWithin } from '@n8n/backend-common';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Locates a node's output preview schema (`__schema__/v<version>/<resource>/<operation>.json`).
 * Canonical resolver for every consumer of `__schema__` files: the `/schemas`
 * HTTP route (exact version) and mock/pin-data generation (version fallback).
 * `__schema__` describes a node's OUTPUT items after its own post-processing,
 * never the service's wire format.
 */
export interface OutputSchemaRef {
	/** Directory that contains the node's `__schema__/` (dirname of the node's source path). */
	nodeDir: string;
	version: number | string;
	resource?: string;
	operation?: string;
	/**
	 * Fall back to other `vX.Y.Z` dirs when the exact version has no match:
	 * same major first (nearest below, then nearest above), then older majors
	 * newest-first, then newer majors nearest-first. Default false.
	 */
	versionFallback?: boolean;
	/**
	 * Output-layout variant for nodes whose shape depends on workflow context
	 * (e.g. an attached output parser): probes `v<X>/output.<variant>.json`
	 * before the plain `v<X>/output.json`. Only meaningful for refs without
	 * resource/operation, and only with `versionFallback`.
	 *
	 * For refs with an operation it names `<operation>.<variant>.json` instead,
	 * and wins over `parameters`. A name with anything but word characters and
	 * dashes is ignored.
	 */
	variant?: string;
	/**
	 * Node parameters that pick a shape variant. A file `<operation>.<param>-<value>.json`
	 * is used when the parameter (or, if absent, its default) equals `<value>`.
	 * Only meaningful for refs with an operation, and only with `versionFallback`.
	 */
	parameters?: Record<string, unknown>;
	/** Defaults for parameters missing from `parameters`, read from the node description. */
	parameterDefaults?: Record<string, unknown>;
}

/**
 * Variant name for AI roots with an `ai_outputParser` attached — their items
 * carry the parser's fields instead of the plain-text shape.
 */
export const OUTPUT_PARSER_SCHEMA_VARIANT = 'with-parser';

/**
 * Node-type-aware schema lookup. Generation code depends on this shape so it
 * stays free of filesystem and node-loading concerns.
 */
export type OutputSchemaLookup = (node: {
	type: string;
	typeVersion: number;
	resource?: string;
	operation?: string;
	/** Node has an `ai_outputParser` attached — resolves the `with-parser` layout variant. */
	hasOutputParser?: boolean;
	/** The node's parameters — pick a shape variant such as `simple: false`. */
	parameters?: Record<string, unknown>;
}) => Record<string, unknown> | undefined;

/** Pad "1" / "1.2" to the on-disk "1.0.0" / "1.2.0" directory format. */
function padVersion(version: number | string): string {
	return String(version).split('.').concat(['0', '0']).slice(0, 3).join('.');
}

/** Only `v` + dot-separated digits — ignores `v1.0.0-beta/`, `vendor/`, stray files. */
const VERSION_DIR_PATTERN = /^v\d+(\.\d+)*$/;

/** Parse a `vX.Y.Z` directory name into a comparable [X, Y, Z] tuple. */
function parseVersionDir(name: string): number[] {
	return name.slice(1).split('.').map(Number);
}

function compareVersionTuplesDesc(a: number[], b: number[]): number {
	for (let i = 0; i < Math.max(a.length, b.length); i++) {
		const diff = (b[i] ?? 0) - (a[i] ?? 0);
		if (diff !== 0) return diff;
	}
	return 0;
}

/**
 * Order fallback candidates by how plausibly their schemas match the
 * requested version's API generation: same major first (nearest below the
 * target, then nearest above), then older majors newest-first, then newer
 * majors nearest-first as the last resort. Plain newest-first would serve a
 * new major's reshaped schemas (e.g. Notion v3) to older node versions even
 * when a same-major dir exists.
 */
function orderFallbackCandidates(dirNames: string[], target: number[]): string[] {
	const dirs = dirNames.map((name) => ({ name, tuple: parseVersionDir(name) }));
	const byDesc = (a: (typeof dirs)[number], b: (typeof dirs)[number]) =>
		compareVersionTuplesDesc(a.tuple, b.tuple);
	const byAsc = (a: (typeof dirs)[number], b: (typeof dirs)[number]) =>
		compareVersionTuplesDesc(b.tuple, a.tuple);

	const sameMajor = dirs.filter((d) => d.tuple[0] === target[0]);
	return [
		...sameMajor.filter((d) => compareVersionTuplesDesc(d.tuple, target) >= 0).sort(byDesc),
		...sameMajor.filter((d) => compareVersionTuplesDesc(d.tuple, target) < 0).sort(byAsc),
		...dirs.filter((d) => d.tuple[0] < target[0]).sort(byDesc),
		...dirs.filter((d) => d.tuple[0] > target[0]).sort(byAsc),
	].map((d) => d.name);
}

/** Variant names are file-name fragments: word characters and dashes only. */
const VARIANT_NAME_PATTERN = /^[\w-]+$/;

/** `simple-false` → parameter `simple`, value `false`. */
function parseParameterVariant(variant: string): { param: string; value: string } | undefined {
	const separator = variant.indexOf('-');
	if (separator <= 0) return undefined;
	return { param: variant.slice(0, separator), value: variant.slice(separator + 1) };
}

/**
 * The value a node parameter has: its own value, even when null, else its default.
 * Own-property checks keep names such as `constructor` from reading the prototype.
 */
function effectiveParameterValue(ref: OutputSchemaRef, param: string): unknown {
	const { parameters, parameterDefaults } = ref;
	if (parameters && Object.hasOwn(parameters, param) && parameters[param] !== undefined) {
		return parameters[param];
	}
	return parameterDefaults && Object.hasOwn(parameterDefaults, param)
		? parameterDefaults[param]
		: undefined;
}

function variantMatchesParameters(variant: string, ref: OutputSchemaRef): boolean {
	const parsed = parseParameterVariant(variant);
	if (!parsed) return false;
	const effective = effectiveParameterValue(ref, parsed.param);
	const isPrimitive = ['string', 'number', 'boolean'].includes(typeof effective);
	return isPrimitive && String(effective) === parsed.value;
}

/** Variant names that have a `<operation>.<variant>.json` file in `dir`, sorted. */
function listOperationVariants(dir: string, operation: string): string[] {
	try {
		return readdirSync(dir)
			.filter((file) => file.startsWith(`${operation}.`) && file.endsWith('.json'))
			.map((file) => file.slice(operation.length + 1, -'.json'.length))
			.filter((variant) => VARIANT_NAME_PATTERN.test(variant))
			.sort();
	} catch {
		return [];
	}
}

/**
 * The `<operation>.<variant>.json` file for this ref in one version dir: the
 * explicit `variant` first, then the first file whose `<param>-<value>` name
 * matches the node parameters.
 */
function findOperationVariantFile(ref: OutputSchemaRef, versionPath: string): string | undefined {
	const { operation, resource, variant } = ref;
	if (!operation) return undefined;
	const dir = path.resolve(versionPath, resource ?? '');
	const variants = listOperationVariants(dir, operation);
	const match =
		variants.find((name) => name === variant) ??
		variants.find((name) => variantMatchesParameters(name, ref));
	return match ? path.join(dir, `${operation}.${match}.json`) : undefined;
}

/**
 * Resolve an output schema reference to a `.json` file path, or undefined
 * when the resolved path would escape the node's `__schema__` directory.
 *
 * Without `versionFallback` this is a pure path computation — existence is
 * the caller's concern (the `/schemas` route probes with fsAccess before
 * serving). With `versionFallback` it returns the first *existing* match,
 * trying the exact version first, then the other available version dirs in
 * the `orderFallbackCandidates` order; for refs without resource/operation it
 * also probes the version-level `v<X>/output.json` layout (used by trigger
 * nodes such as Webhook).
 */
export function resolveOutputSchemaPath(ref: OutputSchemaRef): string | undefined {
	const { nodeDir, version, resource, operation, versionFallback, variant } = ref;
	const schemaBaseDir = path.join(nodeDir, '__schema__');
	const exactVersionDir = `v${padVersion(version)}`;

	const buildPath = (versionDir: string, filename?: string) => {
		const parts = [versionDir, resource, operation, filename].filter(
			(part): part is string => typeof part === 'string' && part.length > 0,
		);
		const filePath = path.resolve(schemaBaseDir, parts.join('/') + '.json');
		return isContainedWithin(schemaBaseDir, filePath) ? filePath : undefined;
	};

	if (!versionFallback) return buildPath(exactVersionDir);

	let available: string[] = [];
	try {
		available = orderFallbackCandidates(
			readdirSync(schemaBaseDir).filter((dir) => VERSION_DIR_PATTERN.test(dir)),
			parseVersionDir(exactVersionDir),
		);
	} catch {
		return undefined;
	}

	// Nodes without resource/operation discriminators (currently only triggers,
	// e.g. Webhook) store their single schema as `v<X>/output.json`.
	const hasDiscriminators = Boolean(resource) || Boolean(operation);

	for (const versionDir of [...new Set([exactVersionDir, ...available])]) {
		const variantFile = findOperationVariantFile(ref, path.join(schemaBaseDir, versionDir));
		if (variantFile && isContainedWithin(schemaBaseDir, variantFile)) return variantFile;
		const filePath = buildPath(versionDir);
		if (filePath && existsSync(filePath)) return filePath;
		if (!hasDiscriminators) {
			// The requested variant wins over the plain layout; a version dir
			// without the variant file falls through to its `output.json`.
			if (variant) {
				const variantPath = buildPath(versionDir, `output.${variant}`);
				if (variantPath && existsSync(variantPath)) return variantPath;
			}
			const outputPath = buildPath(versionDir, 'output');
			if (outputPath && existsSync(outputPath)) return outputPath;
		}
	}

	return undefined;
}

/**
 * Resolve, read, and parse an output schema. Undefined on any failure —
 * schema previews are always best-effort enrichment.
 */
export function loadOutputSchema(ref: OutputSchemaRef): Record<string, unknown> | undefined {
	const filePath = resolveOutputSchemaPath(ref);
	if (!filePath) return undefined;
	try {
		const parsed: unknown = JSON.parse(readFileSync(filePath, 'utf-8'));
		if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
			return parsed as Record<string, unknown>;
		}
	} catch {}
	return undefined;
}
