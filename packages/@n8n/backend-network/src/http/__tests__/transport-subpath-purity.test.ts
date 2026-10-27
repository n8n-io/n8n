import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// Guards the DI-less bundle: the `@n8n/backend-network/transport` subpath
// must stay free of DI / config / backend-common / n8n-workflow at runtime, so
// DI-less callers can build transport without dragging the full `OutboundHttp`
// service and its backend dependencies into their bundle.
//
// This walks the *runtime* import graph from `src/transport.ts` (following only
// relative, non-type imports/exports — `import type` / `export type` are erased
// by tsc) and asserts no forbidden package is reachable.

const FORBIDDEN_PACKAGES = [
	'@n8n/di',
	'@n8n/backend-common',
	'@n8n/config',
	'cache-manager',
	'n8n-workflow',
	// The transport subpath is the undici-only fetch path; it must never regress
	// into the legacy axios stack.
	'axios',
];

const ENTRY = resolve(__dirname, '../../transport.ts');

interface ImportRef {
	specifier: string;
	typeOnly: boolean;
}

/** Extract `import`/`export ... from` specifiers from a source file. */
function parseImports(source: string): ImportRef[] {
	const refs: ImportRef[] = [];

	// `import ... from '<s>'` / `export ... from '<s>'`. Requiring `from` (and
	// disallowing `;` before it) avoids matching value expressions like
	// `?? 'env'` inside a function body.
	const fromRe = /(?:^|\n)\s*(import|export)(\s+type)?\b[^;]*?\bfrom\s*['"]([^'"]+)['"]/g;
	let match: RegExpExecArray | null;
	while ((match = fromRe.exec(source)) !== null) {
		const [, , typeKeyword, specifier] = match;
		refs.push({ specifier, typeOnly: Boolean(typeKeyword) });
	}

	// Bare side-effect imports: `import '<s>';` (always runtime).
	const bareRe = /(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g;
	while ((match = bareRe.exec(source)) !== null) {
		refs.push({ specifier: match[1], typeOnly: false });
	}

	return refs;
}

function resolveRelative(fromFile: string, specifier: string): string | undefined {
	const base = resolve(dirname(fromFile), specifier);
	const candidates = [base, `${base}.ts`, resolve(base, 'index.ts')];
	return candidates.find((candidate) => existsSync(candidate) && candidate.endsWith('.ts'));
}

/** All bare (non-relative) specifiers reachable at runtime from the entry file. */
function collectRuntimeExternals(entry: string): Set<string> {
	const externals = new Set<string>();
	const visited = new Set<string>();

	const visit = (file: string) => {
		if (visited.has(file)) return;
		visited.add(file);

		const source = readFileSync(file, 'utf8');
		for (const { specifier, typeOnly } of parseImports(source)) {
			if (typeOnly) continue; // erased at compile time — no runtime dependency
			if (specifier.startsWith('.')) {
				const resolved = resolveRelative(file, specifier);
				if (resolved) visit(resolved);
				continue;
			}
			externals.add(specifier);
		}
	};

	visit(entry);
	return externals;
}

describe('@n8n/backend-network/transport subpath purity', () => {
	it('has a resolvable entry file', () => {
		expect(existsSync(ENTRY)).toBe(true);
	});

	it('does not pull DI / config / backend-common into the runtime graph', () => {
		const externals = collectRuntimeExternals(ENTRY);

		for (const forbidden of FORBIDDEN_PACKAGES) {
			const leaked = [...externals].some(
				(specifier) => specifier === forbidden || specifier.startsWith(`${forbidden}/`),
			);
			expect(
				leaked,
				`forbidden runtime dependency reachable from transport subpath: ${forbidden}`,
			).toBe(false);
		}
	});

	it('only depends on undici at runtime', () => {
		const externals = collectRuntimeExternals(ENTRY);

		expect([...externals].sort()).toEqual(['undici']);
	});
});
