import { jsonParse } from 'n8n-workflow';
import { access, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';

import { CUSTOM_NODES_PACKAGE_NAME } from './constants';
import { DirectoryLoader } from './directory-loader';
import { isDirectoryEntry, isFileEntry, isFilePath, readDirectoryEntries } from './fs-utils';
import type { n8n } from './types';

async function collectCustomFiles(
	rootDir: string,
): Promise<{ nodes: string[]; credentials: string[] }> {
	const nodes: string[] = [];
	const credentials: string[] = [];
	const ancestorRealDirs = new Set<string>([rootDir]);

	const walk = async (dir: string, realDir: string): Promise<void> => {
		const entries = await readDirectoryEntries(dir);

		for (const entry of entries) {
			if (entry.name.startsWith('.')) continue;

			const fullPath = path.join(dir, entry.name);

			if (await isDirectoryEntry(dir, entry)) {
				if (entry.name === 'node_modules') continue;

				let nextRealDir = path.join(realDir, entry.name);
				if (entry.isSymbolicLink()) {
					try {
						nextRealDir = await realpath(fullPath);
					} catch {
						continue;
					}
				}
				if (ancestorRealDirs.has(nextRealDir)) continue;
				ancestorRealDirs.add(nextRealDir);
				try {
					await walk(fullPath, nextRealDir);
				} finally {
					ancestorRealDirs.delete(nextRealDir);
				}
			} else if (await isFileEntry(dir, entry)) {
				if (entry.name.endsWith('.node.js')) {
					nodes.push(fullPath);
				} else if (entry.name.endsWith('.credentials.js')) {
					credentials.push(fullPath);
				}
			}
		}
	};

	await walk(rootDir, rootDir);
	return { nodes, credentials };
}

async function findCustomPackageManifests(rootDir: string): Promise<string[]> {
	const nodeModulesDir = path.join(rootDir, 'node_modules');
	const entries = await readDirectoryEntries(nodeModulesDir);
	const manifests: string[] = [];

	for (const entry of entries) {
		if (entry.name.startsWith('.')) continue;
		if (!(await isDirectoryEntry(nodeModulesDir, entry))) continue;

		const entryDir = path.join(nodeModulesDir, entry.name);
		const directManifest = path.join(entryDir, 'package.json');
		if (await isFilePath(directManifest)) {
			manifests.push(directManifest);
		}

		if (entry.name.startsWith('@')) {
			const scopedEntries = await readDirectoryEntries(entryDir);
			for (const scopedEntry of scopedEntries) {
				if (scopedEntry.name.startsWith('.')) continue;
				if (!(await isDirectoryEntry(entryDir, scopedEntry))) continue;

				const scopedManifest = path.join(entryDir, scopedEntry.name, 'package.json');
				if (await isFilePath(scopedManifest)) {
					manifests.push(scopedManifest);
				}
			}
		}
	}

	return manifests;
}

/**
 * Loader for source files of nodes and credentials located in a custom dir,
 * e.g. `~/.n8n/custom`
 */
export class CustomDirectoryLoader extends DirectoryLoader {
	packageName = CUSTOM_NODES_PACKAGE_NAME;

	constructor(directory: string, excludeNodes: string[] = [], includeNodes: string[] = []) {
		super(directory, excludeNodes, includeNodes);

		this.excludeNodes = this.extractNodeTypes(excludeNodes, this.packageName);
		this.includeNodes = this.extractNodeTypes(includeNodes, this.packageName);
	}

	override async loadAll() {
		const rootDir = path.resolve(this.directory);
		const { nodes, credentials } = await collectCustomFiles(rootDir);

		// Dev packages are linked here. Load their manifest entries, not their dependencies.
		const packageFiles = await findCustomPackageManifests(rootDir);
		for (const packageFile of packageFiles) {
			try {
				const { n8n } = jsonParse<n8n.PackageJson>(await readFile(packageFile, 'utf8'));
				if (!n8n) {
					this.logger.debug(`Skipping custom node package "${packageFile}": no n8n field found.`);
					continue;
				}

				const packageDirectory = path.dirname(packageFile);
				const packageNodes = Array.isArray(n8n.nodes)
					? n8n.nodes.map((nodePath) => path.resolve(packageDirectory, nodePath))
					: [];
				const packageCredentials = Array.isArray(n8n.credentials)
					? n8n.credentials.map((credentialPath) => path.resolve(packageDirectory, credentialPath))
					: [];

				// Skip the whole package if a build has not produced all its manifest entries.
				await Promise.all(
					[...packageNodes, ...packageCredentials].map(async (filePath) => await access(filePath)),
				);
				nodes.push(...packageNodes);
				credentials.push(...packageCredentials);
			} catch (error) {
				this.logger.warn(
					`Skipping custom node package "${packageFile}": failed to read its manifest or find its files.`,
					{ error },
				);
			}
		}

		for (const nodePath of nodes) {
			try {
				this.loadNodeFromFile(nodePath);
			} catch (error) {
				this.logger.warn(`Skipping custom node "${nodePath}": failed to load.`, { error });
			}
		}

		for (const credentialPath of credentials) {
			try {
				this.loadCredentialFromFile(credentialPath);
			} catch (error) {
				this.logger.warn(`Skipping custom credential "${credentialPath}": failed to load.`, {
					error,
				});
			}
		}
	}
}
