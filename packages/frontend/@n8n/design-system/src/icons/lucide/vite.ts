import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { Plugin } from 'vite';

const PREFIX = 'virtual:lucide-icons';
const RESOLVED_PREFIX = '\0' + PREFIX;
const ITEM_PREFIX = `${PREFIX}/`;
const RESOLVED_ITEM_PREFIX = `${RESOLVED_PREFIX}/`;

interface IconifyJson {
	icons: Record<string, { body: string }>;
}

/**
 * Vite plugin that exposes Lucide SVG bodies as per-icon dynamic-import chunks.
 *
 * Single virtual module prefix:
 *   `virtual:lucide-icons`          — default export: map of lazy loaders
 *   `virtual:lucide-icons/<name>`   — default export: SVG body string (or null)
 */
export function lucideIconsPlugin(): Plugin {
	let icons: IconifyJson['icons'] | null = null;

	const getIcons = (): IconifyJson['icons'] => {
		if (!icons) {
			const require = createRequire(import.meta.url);
			const jsonPath = require.resolve('@iconify/json/json/lucide.json');
			const raw = readFileSync(jsonPath, 'utf-8');
			try {
				icons = (JSON.parse(raw) as IconifyJson).icons;
			} catch (cause) {
				throw new Error(`Failed to parse @iconify/json/json/lucide.json at ${jsonPath}`, {
					cause,
				});
			}
		}
		return icons;
	};

	return {
		name: 'n8n:lucide-icons',
		resolveId(id) {
			if (id === PREFIX || id.startsWith(ITEM_PREFIX)) return '\0' + id;
			return undefined;
		},
		load(id) {
			if (id === RESOLVED_PREFIX) {
				const names = Object.keys(getIcons());
				const entries = names.map(
					(n) => `${JSON.stringify(n)}: () => import('${ITEM_PREFIX}${n}')`,
				);
				return `export default { ${entries.join(', ')} };`;
			}
			if (id.startsWith(RESOLVED_ITEM_PREFIX)) {
				const name = id.slice(RESOLVED_ITEM_PREFIX.length);
				const body = getIcons()[name]?.body;
				return body === undefined
					? 'export default null;'
					: `export default ${JSON.stringify(body)};`;
			}
			return undefined;
		},
	};
}
