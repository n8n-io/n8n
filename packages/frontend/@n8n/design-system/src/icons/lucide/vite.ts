import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { Plugin } from 'vite';

import { BUCKET_COUNT, getBucketIndex } from './bucket';

const PREFIX = 'virtual:lucide-icons';
const RESOLVED_PREFIX = '\0' + PREFIX;
// The id basename becomes the emitted chunk name, so keep it self-documenting
// (`lucide-icons-bucket-7-<hash>.js` in dist instead of `7-<hash>.js`).
const BUCKET_PREFIX = `${PREFIX}/lucide-icons-bucket-`;
const RESOLVED_BUCKET_PREFIX = `${RESOLVED_PREFIX}/lucide-icons-bucket-`;

interface IconifyJson {
	icons: Record<string, { body: string }>;
}

/**
 * Vite plugin that exposes Lucide SVG bodies as hash-bucketed dynamic-import chunks.
 *
 * Single virtual module prefix:
 *   `virtual:lucide-icons`                        — default export: array of BUCKET_COUNT lazy bucket loaders
 *   `virtual:lucide-icons/lucide-icons-bucket-<n>` — default export: record of icon name → SVG body
 *
 * Icons are assigned to buckets via `getBucketIndex` (shared with the runtime
 * loader in `./index.ts`), so the loader can compute the right chunk for any
 * icon name without shipping a per-icon import map.
 */
export function lucideIconsPlugin(): Plugin {
	let buckets: Array<Record<string, string>> | null = null;

	const getBuckets = (): Array<Record<string, string>> => {
		if (!buckets) {
			const require = createRequire(import.meta.url);
			const jsonPath = require.resolve('@iconify/json/json/lucide.json');
			const raw = readFileSync(jsonPath, 'utf-8');
			let icons: IconifyJson['icons'];
			try {
				icons = (JSON.parse(raw) as IconifyJson).icons;
			} catch (cause) {
				throw new Error(`Failed to parse @iconify/json/json/lucide.json at ${jsonPath}`, {
					cause,
				});
			}
			const partitioned: Array<Record<string, string>> = Array.from(
				{ length: BUCKET_COUNT },
				() => ({}),
			);
			for (const [name, icon] of Object.entries(icons)) {
				const bucket = partitioned[getBucketIndex(name)];
				if (bucket) bucket[name] = icon.body;
			}
			buckets = partitioned;
		}
		return buckets;
	};

	return {
		name: 'n8n:lucide-icons',
		resolveId(id) {
			if (id === PREFIX || id.startsWith(BUCKET_PREFIX)) return '\0' + id;
			return undefined;
		},
		load(id) {
			if (id === RESOLVED_PREFIX) {
				const thunks = Array.from(
					{ length: BUCKET_COUNT },
					(_, index) => `() => import('${BUCKET_PREFIX}${index}')`,
				);
				return `export default [${thunks.join(', ')}];`;
			}
			if (id.startsWith(RESOLVED_BUCKET_PREFIX)) {
				// Only the generated loader array above references bucket ids, so any
				// malformed or out-of-range id is a plugin bug — fail the build loudly.
				const suffix = id.slice(RESOLVED_BUCKET_PREFIX.length);
				const bucket = /^\d+$/.test(suffix) ? getBuckets()[Number(suffix)] : undefined;
				if (!bucket) throw new Error(`Unknown lucide icon bucket module: ${id}`);
				return `export default ${JSON.stringify(bucket)};`;
			}
			return undefined;
		},
	};
}
