/**
 * Recovery for workflow source files that call an SDK function without
 * importing it. A build fails with "X is not defined"; when X is a known SDK
 * export, the import line can be repaired without asking the author to rewrite
 * the file.
 */

import { SDK_IMPORTABLE_FUNCTIONS } from './emit-instance-ai';

const SDK_IMPORTABLE_SYMBOLS = new Set<string>(SDK_IMPORTABLE_FUNCTIONS);

const SDK_IMPORT_REGEX = /import\s*\{([^}]*)\}\s*from\s*['"]@n8n\/workflow-sdk['"]/;

export interface AutoImportResult {
	source: string;
	symbols: string[];
}

/** Adds missing known SDK symbols to the import for "X is not defined" errors; undefined when not applicable. */
export function autoImportMissingSdkSymbols(
	source: string,
	errors: string[],
): AutoImportResult | undefined {
	const missing = new Set<string>();
	for (const error of errors) {
		for (const match of error.matchAll(/\b([A-Za-z_$][\w$]*) is not defined\b/g)) {
			if (SDK_IMPORTABLE_SYMBOLS.has(match[1])) missing.add(match[1]);
		}
	}
	if (missing.size === 0) return undefined;

	const symbols = Array.from(missing);
	const existing = SDK_IMPORT_REGEX.exec(source);
	if (existing) {
		const names = new Set(
			existing[1]
				.split(',')
				.map((name) => name.trim())
				.filter(Boolean),
		);
		for (const symbol of symbols) names.add(symbol);
		return {
			source: source.replace(
				SDK_IMPORT_REGEX,
				`import {\n  ${Array.from(names).join(',\n  ')},\n} from '@n8n/workflow-sdk'`,
			),
			symbols,
		};
	}
	return {
		source: `import { ${symbols.join(', ')} } from '@n8n/workflow-sdk';\n\n${source}`,
		symbols,
	};
}
