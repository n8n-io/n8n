import { fileURLToPath } from 'node:url';

import { writeTemplates } from './scaffold.mjs';

const TEMPLATE_DIR = fileURLToPath(new URL('templates/backend', import.meta.url));

/**
 * Writes `packages/modules/<name>/backend`. The directory holds a README and no more.
 *
 * This half is not a workspace package on purpose. The backend runtime reads its modules from
 * `packages/cli/src/modules/<name>`. A `package.json` here would add the directory to the
 * workspace, to the lockfile and to each walk of the turbo tasks, for code that nothing imports.
 * `pnpm setup-backend-module` stays the command for a backend module that runs.
 */
export const createBackend = ({ packageDir, substitutions }) => {
	writeTemplates(TEMPLATE_DIR, packageDir, [['README.md.template', 'README.md']], substitutions);

	return { edits: [] };
};
