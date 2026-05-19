const fs = require('fs');
const path = require('path');

const ENV_FILES = [
	{ name: '.env', override: false },
	{ name: '.env.local', override: true },
];

/**
 * Load local development env files from the current working directory and the
 * monorepo root. `pnpm start` runs the CLI from `packages/cli/bin`, so a repo
 * root `.env` would otherwise be ignored by a cwd-only dotenv load.
 */
function loadDevelopmentEnvFiles(options = {}) {
	const dotenv = require('dotenv');
	const directories = getEnvSearchDirectories(options.cliBinDir ?? __dirname);

	for (const directory of directories) {
		for (const { name, override } of ENV_FILES) {
			const filePath = path.join(directory, name);
			if (!fs.existsSync(filePath)) continue;

			dotenv.config({ path: filePath, quiet: true, override });
		}
	}
}

function getEnvSearchDirectories(cliBinDir) {
	const directories = [];
	const seen = new Set();

	const addDirectory = (directory) => {
		const resolved = path.resolve(directory);
		if (seen.has(resolved)) return;
		seen.add(resolved);
		directories.push(resolved);
	};

	addDirectory(process.cwd());
	addDirectory(path.resolve(cliBinDir, '../../..'));

	return directories;
}

module.exports = {
	loadDevelopmentEnvFiles,
	getEnvSearchDirectories,
};
