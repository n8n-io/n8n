/**
 * Structural test: Package Boundary Enforcement
 *
 * Validates the dependency flow across the monorepo:
 *
 *   @n8n/api-types ─┐
 *   n8n-workflow ────┤ (foundation layer — no upward imports)
 *                    ↓
 *   n8n-core ────────┤ (can import workflow, not cli/frontend)
 *                    ↓
 *   n8n (cli) ───────┤ (orchestrator — can import most things)
 *                    ↓
 *   n8n-editor-ui    │ (frontend — no backend imports except types/workflow)
 *   @n8n/design-system (pure UI — no backend imports at all)
 *
 * Each package defines what it is FORBIDDEN from importing.
 * If this test fails, someone crossed an architectural boundary.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..', '..', '..');

/**
 * Known boundary violations that predate this test.
 * Each entry is "relative/file/path → package-name".
 * These should be fixed and removed over time — do NOT add new entries.
 */
const KNOWN_VIOLATIONS = new Set([
	'packages/nodes-base/nodes/Airtop/constants.ts → n8n-core',
	'packages/nodes-base/nodes/Form/utils/utils.ts → n8n-core',
	'packages/nodes-base/nodes/Merge/v3/actions/mode/combineBySql.ts → n8n-core',
]);

/**
 * For each package, list the packages it must NEVER import from.
 * Key = filesystem path relative to repo root.
 * Value = array of package names that are forbidden imports.
 */
const FORBIDDEN_IMPORTS: Record<string, string[]> = {
	// Foundation layer: workflow must not import from anything above it
	'packages/workflow/src': [
		'n8n-core',
		'n8n', // the cli package
		'n8n-editor-ui',
		'@n8n/design-system',
		'n8n-nodes-base',
		'@n8n/n8n-nodes-langchain',
	],

	// Foundation layer: api-types must not import from core/cli/frontend
	'packages/@n8n/api-types/src': [
		'n8n-core',
		'n8n',
		'n8n-editor-ui',
		'@n8n/design-system',
		'n8n-nodes-base',
		'@n8n/n8n-nodes-langchain',
	],

	// Middle layer: core can use workflow, but not cli or frontend
	'packages/core/src': [
		'n8n', // must not import the cli package
		'n8n-editor-ui',
		'@n8n/design-system',
	],

	// Nodes: can use workflow, but not core/cli/frontend
	'packages/nodes-base/nodes': ['n8n-core', 'n8n', 'n8n-editor-ui', '@n8n/design-system'],

	// Frontend: design-system is pure UI — no backend imports at all
	'packages/frontend/@n8n/design-system/src': [
		'n8n-core',
		'n8n',
		'n8n-editor-ui',
		'n8n-nodes-base',
		'@n8n/n8n-nodes-langchain',
		'@n8n/api-types',
	],

	// Frontend: editor-ui can use api-types and workflow, but not core/cli
	'packages/frontend/editor-ui/src': [
		'n8n-core',
		'n8n', // must not import the cli/backend package
		'n8n-nodes-base',
		'@n8n/n8n-nodes-langchain',
	],
};

/**
 * Recursively collect all .ts and .vue files in a directory.
 */
function collectSourceFiles(dir: string): string[] {
	const results: string[] = [];
	if (!fs.existsSync(dir)) return results;

	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (
				entry.name === 'node_modules' ||
				entry.name === 'dist' ||
				entry.name === '__tests__' ||
				entry.name === 'test'
			)
				continue;
			results.push(...collectSourceFiles(fullPath));
		} else if (
			/\.(ts|vue)$/.test(entry.name) &&
			!entry.name.endsWith('.test.ts') &&
			!entry.name.endsWith('.spec.ts')
		) {
			results.push(fullPath);
		}
	}
	return results;
}

/**
 * Extract imported package names from a file's content.
 * Matches: import ... from 'pkg' / import ... from "pkg" / require('pkg')
 */
function extractImports(content: string): string[] {
	const imports: string[] = [];

	// ES imports: import ... from 'package' or import 'package'
	const esImportRegex = /(?:import|export)\s+.*?from\s+['"]([^./][^'"]*)['"]/g;
	const sideEffectImportRegex = /import\s+['"]([^./][^'"]*)['"]/g;

	// Dynamic imports: import('package') or require('package')
	const dynamicImportRegex = /(?:import|require)\s*\(\s*['"]([^./][^'"]*)['"]\s*\)/g;

	for (const regex of [esImportRegex, sideEffectImportRegex, dynamicImportRegex]) {
		let match;
		while ((match = regex.exec(content)) !== null) {
			const raw = match[1];
			// Normalize scoped packages: '@n8n/foo/bar' → '@n8n/foo'
			const pkg = raw.startsWith('@') ? raw.split('/').slice(0, 2).join('/') : raw.split('/')[0];
			imports.push(pkg);
		}
	}

	return [...new Set(imports)];
}

interface Violation {
	file: string;
	importedPackage: string;
}

describe('Package Boundary Enforcement', () => {
	for (const [relDir, forbidden] of Object.entries(FORBIDDEN_IMPORTS)) {
		const absDir = path.join(REPO_ROOT, relDir);
		const packageLabel = relDir.replace('/src', '').replace('/nodes', '');

		it(`${packageLabel} must not import from forbidden packages`, () => {
			const files = collectSourceFiles(absDir);
			const violations: Violation[] = [];

			for (const file of files) {
				const content = fs.readFileSync(file, 'utf-8');
				const imports = extractImports(content);

				for (const pkg of imports) {
					if (forbidden.includes(pkg)) {
						const relFile = path.relative(REPO_ROOT, file);
						const key = `${relFile} → ${pkg}`;
						if (KNOWN_VIOLATIONS.has(key)) continue;

						violations.push({
							file: relFile,
							importedPackage: pkg,
						});
					}
				}
			}

			if (violations.length > 0) {
				const report = violations
					.map((v) => `  ${v.file} imports "${v.importedPackage}"`)
					.join('\n');
				expect.fail(
					`Found ${violations.length} boundary violation(s) in ${packageLabel}:\n${report}\n\n` +
						'See docs/principles/golden-rules.md and AGENTS.md for the expected dependency flow.',
				);
			}
		});
	}
});
