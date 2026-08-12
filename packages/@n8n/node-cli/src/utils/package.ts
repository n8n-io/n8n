import fs from 'node:fs/promises';
import path from 'node:path';
import prettier from 'prettier';

import { writeFileSafe } from './filesystem';
import { jsonParse } from './json';

export type N8nPackageJson = {
	name: string;
	version: string;
	n8n?: {
		nodes?: string[];
		credentials?: string[];
		strict?: boolean;
	};
};

export async function updatePackageJson(
	dirPath: string,
	updater: (packageJson: N8nPackageJson) => N8nPackageJson,
) {
	const packageJsonPath = path.resolve(dirPath, 'package.json');
	const packageJson = jsonParse<N8nPackageJson>(await fs.readFile(packageJsonPath, 'utf-8'));

	if (!packageJson) return;

	const updatedPackageJson = updater(packageJson);

	await writeFileSafe(
		packageJsonPath,
		await prettier.format(JSON.stringify(updatedPackageJson), { parser: 'json' }),
	);
}

export async function getPackageJson(dirPath: string) {
	const packageJsonPath = path.resolve(dirPath, 'package.json');
	const packageJson = jsonParse<N8nPackageJson>(await fs.readFile(packageJsonPath, 'utf-8'));

	return packageJson;
}

export async function isN8nNodePackage(dirPath = process.cwd()) {
	const packageJson = await getPackageJson(dirPath).catch(() => null);

	return Array.isArray(packageJson?.n8n?.nodes);
}

export async function getPackageJsonNodes(dirPath: string) {
	const packageJson = await getPackageJson(dirPath);
	return packageJson?.n8n?.nodes ?? [];
}

export async function setNodesPackageJson(dirPath: string, nodes: string[]) {
	await updatePackageJson(dirPath, (packageJson) => {
		packageJson['n8n'] ??= {};
		packageJson['n8n'].nodes = nodes;
		return packageJson;
	});
}

export async function addCredentialPackageJson(dirPath: string, credential: string) {
	await updatePackageJson(dirPath, (packageJson) => {
		packageJson['n8n'] ??= {};
		packageJson['n8n'].credentials ??= [];
		packageJson['n8n'].credentials.push(credential);
		return packageJson;
	});
}
