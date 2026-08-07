import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const srcDir = dirname(fileURLToPath(import.meta.url));

/** `packages/@n8n/module-cli/src` → the repo root, four levels up. */
export const repoRoot = resolve(srcDir, '..', '..', '..', '..');
export const modulesRoot = join(repoRoot, 'packages', 'modules');

export class ScaffoldError extends Error {}

/** The one spelling has to be canonical: it is the directory, the package suffix, the file infix
 *  and the backend module id all at once. */
export const isModuleId = (name) => /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name);

const capitalize = (word) => word[0].toUpperCase() + word.slice(1);

export const substitutionsFor = (name) => {
	const words = name.split('-');
	return {
		name,
		PascalName: words.map(capitalize).join(''),
		camelName: words.map((word, i) => (i === 0 ? word : capitalize(word))).join(''),
		TitleName: words.map(capitalize).join(' '),
	};
};

/** Renders `templates/<stack>/<file>` and writes the result into the new package. */
export const writeTemplates = (templateDir, targetDir, files, substitutions) => {
	for (const [template, target] of files) {
		const body = readFileSync(join(templateDir, template), 'utf8').replace(
			/\{\{(\w+)\}\}/g,
			(_match, key) => {
				if (!(key in substitutions)) {
					throw new ScaffoldError(`Template ${template} uses unknown {{${key}}}`);
				}
				return substitutions[key];
			},
		);

		const absolute = join(targetDir, target);
		mkdirSync(dirname(absolute), { recursive: true });
		writeFileSync(absolute, body);
	}
};

/**
 * Line-level edits rather than parse-and-reserialize: `tsconfig.json` carries comments a JSON
 * round-trip would drop, `modules.manifest.ts` is TypeScript, and rewriting `package.json`
 * wholesale would bury the one added line in a reformat.
 *
 * `editor` returns the modified lines, or `undefined` to leave the file alone — which is what
 * makes every registration idempotent, so re-running after a partial failure is safe.
 */
export const editLines = (file, editor) => {
	const lines = readFileSync(file, 'utf8').split('\n');
	const edited = editor(lines);
	if (!edited) return false;
	writeFileSync(file, edited.join('\n'));
	return true;
};

/** Index of the line matching `pattern`, or a hard failure — a silent skip would ship broken. */
export const lineIndex = (lines, pattern, file) => {
	const at = lines.findIndex((line) => pattern.test(line));
	if (at === -1) {
		throw new ScaffoldError(`Could not find ${pattern} in ${file}. Register the module by hand.`);
	}
	return at;
};
