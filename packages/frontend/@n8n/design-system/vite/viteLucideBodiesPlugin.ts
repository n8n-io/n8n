import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { Plugin } from 'vite';

const ICON_PREFIX = 'virtual:lucide-icon/';
const RESOLVED_ICON_PREFIX = '\0virtual:lucide-icon/';
const LOADER_ID = 'virtual:lucide-icon-loader';
const RESOLVED_LOADER_ID = '\0virtual:lucide-icon-loader';
const BULK_ID = 'virtual:lucide-icons';
const RESOLVED_BULK_ID = '\0virtual:lucide-icons';

interface IconifyIconData {
	body: string;
}

interface IconifyJsonData {
	icons: Record<string, IconifyIconData>;
}

/**
 * Vite plugin that provides Lucide icon SVG bodies as virtual modules.
 *
 * Reads icon data from `@iconify/json` at build time and exposes three virtual modules:
 *
 * - `virtual:lucide-icon/<name>` — Individual icon body (default export: string | null)
 * - `virtual:lucide-icon-loader` — Map of lazy loaders for per-icon dynamic imports
 * - `virtual:lucide-icons` — All icon bodies in one module (for bulk loading)
 */
export function viteLucideBodiesPlugin(): Plugin {
	let icons: Record<string, IconifyIconData> | null = null;

	function getIcons(): Record<string, IconifyIconData> {
		if (!icons) {
			const require = createRequire(import.meta.url);
			const jsonPath = require.resolve('@iconify/json/json/lucide.json');
			const data: IconifyJsonData = JSON.parse(readFileSync(jsonPath, 'utf-8'));
			icons = data.icons;
		}
		return icons;
	}

	return {
		name: 'vite-plugin-lucide-bodies',

		resolveId(id) {
			if (id.startsWith(ICON_PREFIX)) return '\0' + id;
			if (id === LOADER_ID) return RESOLVED_LOADER_ID;
			if (id === BULK_ID) return RESOLVED_BULK_ID;
		},

		load(id) {
			if (id.startsWith(RESOLVED_ICON_PREFIX)) {
				const name = id.slice(RESOLVED_ICON_PREFIX.length);
				const icon = getIcons()[name];
				if (!icon) return 'export default null;';
				return `export default ${JSON.stringify(icon.body)};`;
			}

			if (id === RESOLVED_LOADER_ID) {
				const names = Object.keys(getIcons());
				const entries = names.map(
					(n) => `\t${JSON.stringify(n)}: () => import('virtual:lucide-icon/${n}')`,
				);
				return `export default {\n${entries.join(',\n')}\n};\n`;
			}

			if (id === RESOLVED_BULK_ID) {
				const allIcons = getIcons();
				const bodies: Record<string, string> = {};
				for (const [name, icon] of Object.entries(allIcons)) {
					bodies[name] = icon.body;
				}
				return `export default ${JSON.stringify(bodies)};`;
			}
		},
	};
}
