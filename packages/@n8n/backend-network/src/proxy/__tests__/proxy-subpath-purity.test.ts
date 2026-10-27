import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// Guards the DI-less bundle: the `@n8n/backend-network/proxy` subpath must stay
// free of DI / config / backend-common / n8n-workflow at runtime, so callers
// that only need env-proxy resolution or a Node `http(s).Agent` don't drag the
// full `OutboundHttp` service and its backend dependencies into their bundle.
//
// This walks the *runtime* import graph from `src/proxy/index.ts` (following only
// relative, non-type imports/exports — `import type` / `export type` are erased
// by tsc) and asserts only the expected proxy externals are reachable.

const FORBIDDEN_PACKAGES = [
	'@n8n/di',
	'@n8n/backend-common',
	'@n8n/config',
	'cache-manager',
	'n8n-workflow',
	// Heavyweight HTTP clients the DI-less proxy subpath must never drag in.
	'axios',
	'undici',
];

const EXPECTED_EXTERNALS = [
	'http',
	'http-proxy-agent',
	'https',
	'https-proxy-agent',
	'proxy-from-env',
];

const ENTRY = resolve(__dirname, '../index.ts');

interface ImportRef {
	specifier: string;
	typeOnly: boolean;
}

/** Extract `import`/`export ... from` specifiers from a source file. */
function parseImports(source: string): ImportRef[] {
	const refs: ImportRef[] = [];

	const fromRe = /(?:^|\n)\s*(import|export)(\s+type)?\b[^;]*?\bfrom\s*['"]([^'"]+)['"]/g;
	let match: RegExpExecArray | null;
	while ((match = fromRe.exec(source)) !== null) {
		const [, , typeKeyword, specifier] = match;
		refs.push({ specifier, typeOnly: Boolean(typeKeyword) });
	}

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

describe('@n8n/backend-network/proxy subpath purity', () => {
	it('has a resolvable entry file', () => {
		expect(existsSync(ENTRY)).toBe(true);
	});

	it('does not pull DI / config / backend-common / n8n-workflow into the runtime graph', () => {
		const externals = collectRuntimeExternals(ENTRY);

		for (const forbidden of FORBIDDEN_PACKAGES) {
			const leaked = [...externals].some(
				(specifier) => specifier === forbidden || specifier.startsWith(`${forbidden}/`),
			);
			expect(
				leaked,
				`forbidden runtime dependency reachable from proxy subpath: ${forbidden}`,
			).toBe(false);
		}
	});

	it('only depends on the expected proxy externals at runtime', () => {
		const externals = collectRuntimeExternals(ENTRY);

		expect([...externals].sort()).toEqual(EXPECTED_EXTERNALS);
	});
});
