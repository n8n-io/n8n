import path from 'path';
import fs from 'fs';
import glob from 'fast-glob';
import yaml from 'yamljs';

function getLatestVersionPaths(paths: string[]) {
	const latestVersions: Record<string, { version: string; path: string }> = {};

	paths.forEach((path) => {
		const parts = path.split('/');
		const version = parts[parts.length - 2].replace(/\D/g, '');
		const apiProvider = parts.slice(0, -2).join('/');

		if (
			!latestVersions[apiProvider] ||
			compareVersions(version, latestVersions[apiProvider].version) > 0
		) {
			latestVersions[apiProvider] = { version, path };
		}
	});

	return Object.values(latestVersions).map((entry) => entry.path);
}

function compareVersions(v1, v2) {
	const num1 = parseInt(v1, 10);
	const num2 = parseInt(v2, 10);
	return num1 - num2;
}

const paths = glob.sync([path.join(__dirname, '**/*.yaml')]);
const uniquePaths = getLatestVersionPaths(paths);

uniquePaths.forEach((filePath) => {
	const yamlContents = fs.readFileSync(filePath, 'utf8');
	const data = yaml.parse(yamlContents);

	const targetPath = filePath
		.replace('.yaml', '.json')
		.replace('openapi-directory', 'openapi-directory-json');
	const targetDir = path.dirname(targetPath);
	if (!fs.existsSync(targetDir)) {
		fs.mkdirSync(targetDir, { recursive: true });
	}

	fs.writeFileSync(targetPath, JSON.stringify(data, null, 2));
});
