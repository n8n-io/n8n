import { writeFile, readFile } from 'fs/promises';
import { resolve } from 'path';
import child_process from 'child_process';
import { promisify } from 'util';

const exec = promisify(child_process.exec);

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
	await writeFile(packageFile, JSON.stringify(packageJson, null, 2) + '\n');
}
