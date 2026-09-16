const { writeFileSync } = require('fs');
const { resolve } = require('path');
const baseDir = resolve(__dirname, '../..');

/**
 * `keepRuntimeDeps` packages publish a `dist` their consumers resolve, so npm
 * has to install what that `dist` imports — dropping the declarations ships
 * code that cannot resolve. Packages published only as a bundled app keep
 * nothing.
 */
const trimPackageJson = (packageName, { keepRuntimeDeps = false } = {}) => {
	const filePath = resolve(baseDir, 'packages', packageName, 'package.json');
	const { scripts, peerDependencies, devDependencies, dependencies, ...packageJson } = require(
		filePath,
	);
	if (keepRuntimeDeps) {
		if (dependencies) packageJson.dependencies = dependencies;
		if (peerDependencies) packageJson.peerDependencies = peerDependencies;
	}
	writeFileSync(filePath, JSON.stringify(packageJson, null, 2) + '\n', 'utf-8');
};

trimPackageJson('frontend/@n8n/chat', { keepRuntimeDeps: true });
trimPackageJson('frontend/@n8n/design-system', { keepRuntimeDeps: true });
trimPackageJson('frontend/editor-ui');
