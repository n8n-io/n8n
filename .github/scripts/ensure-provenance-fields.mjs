import { writeFile, readFile, copyFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import child_process from 'child_process';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const exec = promisify(child_process.exec);

const commonFiles = ['LICENSE.md', 'LICENSE_EE.md'];

const baseDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const packages = JSON.parse((await exec('pnpm ls -r --only-projects --json')).stdout);

for (let { name, path, version, private: isPrivate } of packages) {
	if (isPrivate) continue;

	const packageFile = resolve(path, 'package.json');
	const packageJson = {
		...JSON.parse(await readFile(packageFile, 'utf-8')),
		// Add these fields to all published package.json files to ensure provenance checks pass
		license: 'SEE LICENSE IN LICENSE.md',
		homepage: 'https://n8n.io',
		author: {
			name: 'Jan Oberhauser',
			email: 'jan@n8n.io',
		},
		repository: {
			type: 'git',
			url: 'git+https://github.com/n8n-io/n8n.git',
		},
	};

	// Copy over LICENSE.md and LICENSE_EE.md into every published package, and ensure they get included in the published package
	await Promise.all(
		commonFiles.map(async (file) => {
			await copyFile(resolve(baseDir, file), resolve(path, file));
			if (packageJson.files && !packageJson.files.includes(file)) {
				packageJson.files.push(file);
			}
		}),
	);

	await writeFile(packageFile, JSON.stringify(packageJson, null, 2) + '\n');
}
