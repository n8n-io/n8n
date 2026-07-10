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
// Per-icon SVG body, imported directly (not bucketed) so the eager icon set in
// N8nIcon renders synchronously without pulling in unplugin-icons at build time.
const BODY_PREFIX = `${PREFIX}/body/`;
const RESOLVED_BODY_PREFIX = `${RESOLVED_PREFIX}/body/`;

interface IconifyJson {
	icons: Record<string, { body: string }>;
	aliases?: Record<string, { parent: string }>;
}

/**
 * Vite plugin that exposes Lucide SVG bodies as virtual modules.
 *
 * Virtual module prefixes:
 *   `virtual:lucide-icons`                        — default export: array of BUCKET_COUNT lazy bucket loaders
 *   `virtual:lucide-icons/lucide-icons-bucket-<n>` — default export: record of icon name → SVG body
 *   `virtual:lucide-icons/body/<name>`             — default export: a single icon's SVG body string
 *
 * Bucketed chunks back the runtime fallback loader (`./index.ts`); the `body/`
 * modules back the eagerly-bundled common icon set. Icons are assigned to
 * buckets via `getBucketIndex` (shared with the loader), so the loader can
 * compute the right chunk for any icon name without shipping a per-icon map.
 */
export function lucideIconsPlugin(): Plugin {
	let iconData: IconifyJson | null = null;
	let buckets: Array<Record<string, string>> | null = null;

	const getIconData = (): IconifyJson => {
		if (!iconData) {
			const require = createRequire(import.meta.url);
			const jsonPath = require.resolve('@iconify/json/json/lucide.json');
			const raw = readFileSync(jsonPath, 'utf-8');
			try {
				iconData = JSON.parse(raw) as IconifyJson;
			} catch (cause) {
				throw new Error(`Failed to parse @iconify/json/json/lucide.json at ${jsonPath}`, {
					cause,
				});
			}
		}
		return iconData;
	};

	// Follow the iconify `aliases` chain (e.g. `loader-2` → parent) to a real body.
	const resolveBody = (name: string): string | null => {
		const { icons, aliases } = getIconData();
		let current: string | undefined = name;
		for (let depth = 0; current && depth < 5; depth++) {
			if (icons[current]) return icons[current].body;
			current = aliases?.[current]?.parent;
		}
		return null;
	};

	const getBuckets = (): Array<Record<string, string>> => {
		if (!buckets) {
			const partitioned: Array<Record<string, string>> = Array.from(
				{ length: BUCKET_COUNT },
				() => ({}),
			);
			for (const [name, icon] of Object.entries(getIconData().icons)) {
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
			if (id === PREFIX || id.startsWith(BUCKET_PREFIX) || id.startsWith(BODY_PREFIX)) {
				return '\0' + id;
			}
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
			if (id.startsWith(RESOLVED_BODY_PREFIX)) {
				const name = id.slice(RESOLVED_BODY_PREFIX.length);
				const body = resolveBody(name);
				// A missing name is a typo in the eager import list — fail loudly.
				if (body === null) throw new Error(`Unknown lucide icon: ${name}`);
				return `export default ${JSON.stringify(body)};`;
			}
			return undefined;
		},
	};
}
