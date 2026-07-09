import { isContainedWithin } from '@n8n/backend-common';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Locates a node's output preview schema (`__schema__/v<version>/<resource>/<operation>.json`).
 * Canonical resolver for every consumer of `__schema__` files: the `/schemas`
 * HTTP route (exact version) and mock/pin-data generation (nearest-version
 * fallback). See `.agents/specs/schema-preview-mock-data-harmonization.md`.
 */
export interface OutputSchemaRef {
	/** Directory that contains the node's `__schema__/` (dirname of the node's source path). */
	nodeDir: string;
	version: number | string;
	resource?: string;
	operation?: string;
	/** Fall back to the nearest available `vX.Y.Z` dir (numeric sort, newest first). Default false. */
	versionFallback?: boolean;
}

/**
 * Node-type-aware schema lookup. Generation code depends on this shape so it
 * stays free of filesystem and node-loading concerns.
 */
export type OutputSchemaLookup = (node: {
	type: string;
	typeVersion: number;
	resource?: string;
	operation?: string;
}) => Record<string, unknown> | undefined;

/** Pad "1" / "1.2" to the on-disk "1.0.0" / "1.2.0" directory format. */
function padVersion(version: number | string): string {
	return String(version).split('.').concat(['0', '0']).slice(0, 3).join('.');
}

/** Sort `vX.Y.Z` directory names numerically, newest first. */
function compareVersionDirsDesc(a: string, b: string): number {
	const partsA = a.slice(1).split('.').map(Number);
	const partsB = b.slice(1).split('.').map(Number);
	for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
		const diff = (partsB[i] ?? 0) - (partsA[i] ?? 0);
		if (diff !== 0) return diff;
	}
	return 0;
}

/**
 * Resolve an output schema reference to a `.json` file path, or undefined
 * when the resolved path would escape the node's `__schema__` directory.
 *
 * Without `versionFallback` this is a pure path computation — existence is
 * the caller's concern (the `/schemas` route probes with fsAccess before
 * serving). With `versionFallback` it returns the first *existing* match,
 * trying the exact version first, then all available versions newest-first.
 */
export function resolveOutputSchemaPath(ref: OutputSchemaRef): string | undefined {
	const { nodeDir, version, resource, operation, versionFallback } = ref;
	const schemaBaseDir = path.join(nodeDir, '__schema__');
	const exactVersionDir = `v${padVersion(version)}`;

	const buildPath = (versionDir: string) => {
		const parts = [versionDir, resource, operation].filter(
			(part): part is string => typeof part === 'string' && part.length > 0,
		);
		const filePath = path.resolve(schemaBaseDir, parts.join('/') + '.json');
		return isContainedWithin(schemaBaseDir, filePath) ? filePath : undefined;
	};

	if (!versionFallback) return buildPath(exactVersionDir);

	let available: string[] = [];
	try {
		available = readdirSync(schemaBaseDir)
			.filter((dir) => dir.startsWith('v'))
			.sort(compareVersionDirsDesc);
	} catch {
		return undefined;
	}

	for (const versionDir of [...new Set([exactVersionDir, ...available])]) {
		const filePath = buildPath(versionDir);
		if (filePath && existsSync(filePath)) return filePath;
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
