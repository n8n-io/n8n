const { writeFileSync } = require('fs');
const { resolve } = require('path');
const baseDir = resolve(__dirname, '../..');

const trimPackageJson = (packageName) => {
	const filePath = resolve(baseDir, 'packages', packageName, 'package.json');
	const { scripts, peerDependencies, devDependencies, dependencies, ...packageJson } = require(
		filePath,
	);
	if (packageName === '@n8n/chat') {
		packageJson.dependencies = dependencies;
	}
	writeFileSync(filePath, JSON.stringify(packageJson, null, 2) + '\n', 'utf-8');
};

trimPackageJson('@n8n/chat');
trimPackageJson('design-system');
trimPackageJson('editor-ui');
