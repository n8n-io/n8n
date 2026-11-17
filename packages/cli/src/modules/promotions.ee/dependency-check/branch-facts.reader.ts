import { Service } from '@n8n/di';

import {
	PackageDirectoryInventoryReader,
	type PackageDirectoryInventory,
	type PackageFileSource,
} from '@/modules/n8n-packages/io/directory/package-directory-inventory-reader';
import { entityIdOfSegment, PACKAGE_ENTITY_LAYOUT } from '@/modules/n8n-packages/io/manifest-entry';
import type { PackageReader } from '@/modules/n8n-packages/io/package-reader';
import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';

import { targetKey, type BranchFact } from './dependency-check.types';

/**
 * The package of a branch, as the caller holds it:
 *
 * - a reader over the files of one commit (the manifest is optional),
 * - an inventory that the caller already read, or
 * - `null` when the branch holds no package yet.
 */
export type BranchPackageInput =
	| { reader: PackageFileSource & Partial<Pick<PackageReader, 'readManifest'>> }
	| { inventory: PackageDirectoryInventory; manifest?: Pick<PackageManifest, 'requirements'> }
	| null;

export type BranchRead = { fact: BranchFact; inventory: PackageDirectoryInventory };

const EMPTY_INVENTORY: PackageDirectoryInventory = {
	projects: [],
	workflows: [],
	folders: [],
	credentials: [],
	variables: [],
	dataTables: [],
};

/** Turns a branch package into the facts of the check. */
@Service()
export class BranchFactsReader {
	constructor(private readonly inventoryReader: PackageDirectoryInventoryReader) {}

	async read(branch: BranchPackageInput): Promise<BranchRead> {
		if (branch === null) return { fact: toBranchFact(EMPTY_INVENTORY), inventory: EMPTY_INVENTORY };
		if ('inventory' in branch) {
			return {
				fact: toBranchFact(branch.inventory, branch.manifest),
				inventory: branch.inventory,
			};
		}

		const { reader } = branch;
		const { entries, extraFolders } = splitDuplicateCredentials(await reader.listEntries());
		const inventory = await this.inventoryReader.read({
			listEntries: async () => entries,
			readFile: async (path) => await reader.readFile(path),
		});
		let manifest: Pick<PackageManifest, 'requirements'> | undefined;
		try {
			manifest = await reader.readManifest?.();
		} catch {
			// A branch without a readable manifest has no reasons. The check then reads it as a
			// branch of an earlier version.
		}

		const fact = toBranchFact(inventory, manifest);
		const projectIdByDirectory = new Map(inventory.projects.map(({ path, id }) => [path, id]));
		for (const [credentialId, directories] of extraFolders) {
			const folders = fact.credentialFolders[credentialId] ?? [];
			for (const directory of directories) {
				const projectId = projectIdByDirectory.get(directory);
				if (projectId !== undefined && !folders.includes(projectId)) folders.push(projectId);
			}
			fact.credentialFolders[credentialId] = folders;
		}
		return { fact, inventory };
	}
}

/**
 * The inventory reader refuses a package with one credential id in two files. The check must
 * report that case, so the extra files are left out of the read and listed apart. A file under
 * a project wins over a top-level file, because only the project file names an owner.
 */
function splitDuplicateCredentials(paths: string[]): {
	entries: string[];
	extraFolders: Map<string, string[]>;
} {
	const { directory, fileName } = PACKAGE_ENTITY_LAYOUT.credentials;
	const projectsDirectory = PACKAGE_ENTITY_LAYOUT.projects.directory;
	const byId = new Map<string, Array<{ path: string; projectDirectory: string | null }>>();
	for (const path of [...paths].sort()) {
		const segments = path.split('/');
		if (segments[segments.length - 1] !== fileName) continue;
		const inProject = segments[0] === projectsDirectory && segments.length === 5;
		const collection = inProject ? segments[2] : segments[0];
		if (collection !== directory || (!inProject && segments.length !== 3)) continue;
		const id = entityIdOfSegment(segments[segments.length - 2]);
		const files = byId.get(id) ?? [];
		files.push({
			path,
			projectDirectory: inProject ? `${projectsDirectory}/${segments[1]}` : null,
		});
		byId.set(id, files);
	}

	const hidden = new Set<string>();
	const extraFolders = new Map<string, string[]>();
	for (const [id, files] of byId) {
		if (files.length < 2) continue;
		const inProjects = files.filter(({ projectDirectory }) => projectDirectory !== null);
		const kept = inProjects[0] ?? files[0];
		for (const file of files) if (file !== kept) hidden.add(file.path);
		extraFolders.set(
			id,
			inProjects.slice(1).flatMap(({ projectDirectory }) => projectDirectory ?? []),
		);
	}
	return { entries: paths.filter((path) => !hidden.has(path)), extraFolders };
}

export function toBranchFact(
	inventory: PackageDirectoryInventory,
	manifest?: Pick<PackageManifest, 'requirements'>,
): BranchFact {
	const fact: BranchFact = {
		credentialFolders: {},
		credentials: {},
		topLevelCredentialIds: [],
		workflows: {},
		requirements: {},
		projects: {},
	};
	for (const { id, name } of inventory.projects) fact.projects[id] = { name };
	for (const { id, name, projectId } of inventory.workflows) {
		fact.workflows[id] = { projectId, name };
	}
	for (const { projectId, credential } of inventory.credentials) {
		fact.credentials[credential.id] = { name: credential.name, type: credential.type };
		if (projectId === null) fact.topLevelCredentialIds.push(credential.id);
		else fact.credentialFolders[credential.id] = [projectId];
	}

	// A row matters only while the branch does not hold its target.
	for (const row of manifest?.requirements?.credentials ?? []) {
		if (row.id in fact.credentialFolders) continue;
		fact.requirements[targetKey('credential', row.id)] = {
			...(row.reason ? { reason: row.reason } : {}),
			...(row.name ? { name: row.name } : {}),
			...(row.type ? { credentialType: row.type } : {}),
		};
	}
	for (const row of manifest?.requirements?.workflows ?? []) {
		if (row.id in fact.workflows) continue;
		fact.requirements[targetKey('workflow', row.id)] = {
			...(row.reason ? { reason: row.reason } : {}),
			...(row.name ? { name: row.name } : {}),
		};
	}
	return fact;
}
