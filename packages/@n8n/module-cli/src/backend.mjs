import { fileURLToPath } from 'node:url';

import { writeTemplates } from './scaffold.mjs';

const TEMPLATE_DIR = fileURLToPath(new URL('templates/backend', import.meta.url));

/**
 * Writes `packages/modules/<name>/backend` — a reserved path and a README, nothing more.
 *
 * Deliberately NOT a workspace package: the backend runtime loads modules from
 * `packages/cli/src/modules/<name>`, so a `package.json` here would add an entry to the workspace,
 * the lockfile and every turbo task walk in exchange for code nothing ever imports. A stub is
 * fine; a stub that looks installed is not. `pnpm setup-backend-module` remains the way to create
 * a backend module that runs.
 */
export const createBackend = ({ packageDir, substitutions }) => {
	writeTemplates(TEMPLATE_DIR, packageDir, [['README.md.template', 'README.md']], substitutions);

	return { edits: [] };
};
