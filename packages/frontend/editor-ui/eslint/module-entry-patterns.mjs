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

/** The subpath of an `exports` key, as a consumer writes it after the package name. */
const subpathOf = (key) => key.replace(/^\.\//, '');

/**
 * The `!` patterns that re-allow one declared subpath. `no-restricted-imports` matches a `group`
 * with gitignore semantics, which costs two adjustments:
 *
 * 1. A gitignore `*` stops at a `/`. A `*` in an `exports` key does not — Node matches it across
 *    one, and so do the Vite alias and the tsconfig `paths` entry that mirror the key. So a
 *    `"./*"` module resolves `<name>/one/two`, and `!<name>/*` would refuse it. Widen it to `**`.
 * 2. gitignore refuses to re-include a path whose parent directory is excluded, and `<name>/**`
 *    excludes every directory inside the package. So a nested key such as `"./views/*"` needs
 *    each ancestor directory unexcluded first. The trailing slash keeps that to the directory:
 *    `!<name>/views/` un-prunes the directory without making the bare `<name>/views` — which no
 *    `exports` key declares and nothing resolves — an allowed specifier.
 *
 * `src/app/moduleEntries.test.ts` runs each key shape through ESLint. Both adjustments look
 * unnecessary until it does.
 */
const negations = (name, subpath) => {
	const segments = subpath.split('/');
	const ancestors = segments
		.slice(0, -1)
		.map((_, index) => `!${name}/${segments.slice(0, index + 1).join('/')}/`);

	return [...ancestors, `!${name}/${subpath.replace('*', '**')}`];
};

/**
 * One `no-restricted-imports` pattern for one module package: ban every path inside it, then
 * re-allow the entries its `exports` map declares.
 *
 * A module that declares `"./*"` re-allows all of them, which is the documented opt-out back
 * into a wildcard.
 */
export const moduleEntryPattern = ({ name, exports }) => {
	const keys = Object.keys(exports ?? { '.': '' });
	const entries = keys.map((key) => (key === '.' ? name : `${name}/${subpathOf(key)}`));
	const allowed = keys
		.filter((key) => key !== '.')
		.flatMap((key) => negations(name, subpathOf(key)));

	return {
		group: [`${name}/**`, ...allowed],
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
