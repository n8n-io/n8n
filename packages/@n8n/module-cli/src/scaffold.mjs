import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const srcDir = dirname(fileURLToPath(import.meta.url));

/** `packages/@n8n/module-cli/src` is four levels below the root of the repository. */
export const repoRoot = resolve(srcDir, '..', '..', '..', '..');
export const modulesRoot = join(repoRoot, 'packages', 'modules');

export class ScaffoldError extends Error {}

/**
 * One spelling must do all the work. The name is the directory, the last part of the name of the
 * package, the infix of each file and the id of the backend module.
 *
 * Each word must start with a letter. A digit after a hyphen makes two ids that give one Pascal
 * name and one camel name: `mcp-2` and `mcp2` both give `Mcp2`. The descriptor binding in the
 * manifest and the id of the Pinia store come from those names, so the two ids collide.
 */
export const isModuleId = (name) => /^[a-z][a-z0-9]*(-[a-z][a-z0-9]*)*$/.test(name);

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

/** Reads `templates/<stack>/<file>` and writes the result into the new package. */
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
 * Each registration edits lines. Do not read a file, parse it and write it again. `tsconfig.json`
 * holds comments that a JSON cycle removes. `modules.manifest.ts` is TypeScript. A new write of
 * `package.json` changes the format of the full file and hides the one new line.
 *
 * `editor` gives back the new lines. It gives back `undefined` to keep the file as it is. A second
 * run then adds no second copy of a registration, and a run after a failure is safe.
 */
export const editLines = (file, editor) => {
	const lines = readFileSync(file, 'utf8').split('\n');
	const edited = editor(lines);
	if (!edited) return false;
	writeFileSync(file, edited.join('\n'));
	return true;
};

/** Gives the index of the line that matches `pattern`. A silent skip writes a broken module. */
export const lineIndex = (lines, pattern, file) => {
	const at = lines.findIndex((line) => pattern.test(line));
	if (at === -1) {
		throw new ScaffoldError(`Could not find ${pattern} in ${file}. Register the module by hand.`);
	}
	return at;
};

/**
 * Biome is the only formatter for the files this command writes and edits. An added line can be
 * longer than the limit of 100 columns, and Biome then puts it on more than one line. Format the
 * files here, or the next `format:check` in CI fails on a module that nobody touched by hand.
 *
 * A failure here does not stop the command. The module is complete at this point, and `pnpm format`
 * does the same work.
 */
export const formatFiles = (files) => {
	const biome = join(repoRoot, 'node_modules', '.bin', 'biome');
	if (!existsSync(biome)) return false;

	try {
		execFileSync(biome, ['format', '--write', ...files], { cwd: repoRoot, stdio: 'inherit' });
		return true;
	} catch {
		return false;
	}
};
