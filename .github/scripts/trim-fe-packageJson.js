const { writeFileSync } = require('fs');
const { resolve } = require('path');
const baseDir = resolve(__dirname, '../..');

const trimPackageJson = (packageName) => {
	const filePath = resolve(baseDir, 'packages', packageName, 'package.json');
	const { scripts, peerDependencies, devDependencies, dependencies, ...packageJson } = require(
		filePath,
	);
	if (packageName === 'frontend/@n8n/chat') {
		packageJson.dependencies = dependencies;
	}
	writeFileSync(filePath, JSON.stringify(packageJson, null, 2) + '\n', 'utf-8');
};

trimPackageJson('frontend/@n8n/chat');
trimPackageJson('frontend/@n8n/design-system');
trimPackageJson('frontend/editor-ui');
