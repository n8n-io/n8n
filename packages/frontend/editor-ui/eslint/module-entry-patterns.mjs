import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Resolved on call, not at import. Under vitest's jsdom, `import.meta.url` is not a file URL, so
 * `fileURLToPath` throws — and `moduleEntries.test.ts` imports `moduleEntryPattern` from here.
 * Only ESLint, which loads this file from disk in Node, calls the scan below.
 */
const modulesDir = () => fileURLToPath(new URL('../../../modules', import.meta.url));

/** The manifest of the frontend package of every module under `packages/modules`. */
const moduleManifests = () => {
	const dir = modulesDir();

	return readdirSync(dir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => join(dir, entry.name, 'frontend', 'package.json'))
		.filter((manifest) => existsSync(manifest))
		.map((manifest) => JSON.parse(readFileSync(manifest, 'utf8')))
		.filter(({ name }) => typeof name === 'string' && name.startsWith('@n8n/frontend-module-'));
};

/** The specifiers an `exports` map declares, as a consumer writes them. */
const declaredEntries = (name, exports) =>
	Object.keys(exports ?? { '.': '' }).map((subpath) =>
		subpath === '.' ? name : `${name}/${subpath.replace(/^\.\//, '')}`,
	);

/**
 * `no-restricted-imports` matches a `group` with gitignore semantics, where `*` stops at a `/`.
 * A `*` in an `exports` key does not: Node matches it across `/`, and so do the Vite alias and
 * the tsconfig `paths` entry that mirror it. So a `"./*"` module resolves `<name>/one/two`, and
 * `!<name>/*` would still refuse it. Widen the `*` to `**` to keep lint and resolution in step.
 */
const negate = (entry) => `!${entry.replace('*', '**')}`;

/**
 * One `no-restricted-imports` pattern for one module package: ban every path inside it, then
 * re-allow the entries its `exports` map declares.
 *
 * A module that declares `"./*"` re-allows all of them, which is the documented opt-out back
 * into a wildcard. `src/app/moduleEntries.test.ts` covers that case, and the two-segment
 * specifier that broke it.
 */
export const moduleEntryPattern = ({ name, exports }) => {
	const entries = declaredEntries(name, exports);

	return {
		group: [`${name}/**`, ...entries.filter((entry) => entry !== name).map(negate)],
		message: `${name} is reachable only at its declared entries: ${entries.join(', ')}. A deeper path is internal to the module. To add an entry, put it in the "exports" map of the package and in the paths of editor-ui/tsconfig.json.`,
	};
};

/**
 * Deep-import ratchet: a module package is reachable only at the entries its own `exports` map
 * declares. Every other file under its `src` is internal, and a module has to be free to move
 * one.
 *
 * The Vite aliases and the `paths` in `tsconfig.json` no longer resolve a deep path, so this is
 * about the message: it names the entries to import instead. The list comes from the `exports`
 * maps on disk, not from a copy of them here, so a new module and a new entry are both covered
 * on the day they land.
 */
export const moduleEntryPatterns = () => moduleManifests().map(moduleEntryPattern);
