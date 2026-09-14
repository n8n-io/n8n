import { getMetadataArgsStorage } from '@n8n/typeorm';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

// Register all core entity decorators
import '@n8n/db';

import {
	TRANSFERRED_PROJECT_RESOURCES,
	NOT_TRANSFERRED_PROJECT_RESOURCES,
} from '../ownership-transfer.manifest';

const REPO_ROOT = path.resolve(__dirname, '../../../../../..');

function findEntityFiles(dir: string): string[] {
	// Detect entity files by content, not filename convention — some modules
	// declare entities in files without the `.entity.ts` suffix (e.g. insights).
	return readdirSync(dir, { withFileTypes: true, recursive: true })
		.filter(
			(entry) =>
				entry.isFile() &&
				entry.name.endsWith('.ts') &&
				!entry.name.endsWith('.test.ts') &&
				!entry.parentPath.includes('__tests__'),
		)
		.map((entry) => path.join(entry.parentPath, entry.name))
		.filter((file) => readFileSync(file, 'utf8').includes('@Entity('));
}

/**
 * Guard: every entity that belongs to a Project must be explicitly
 * accounted for in the ownership-transfer manifest, so that adding a new
 * project-owned resource cannot silently drop user data on user deletion.
 *
 * If this test fails with an unhandled entity: handle it in
 * `OwnershipTransferService.transferAllResources()` and add it to
 * `transferred` in `ownership-transfer.manifest.json`, or consciously exclude
 * it via `notTransferred` with the reason.
 */
describe('ownership-transfer manifest', () => {
	const projectOwnedEntityNames = new Set<string>();
	let moduleEntityFileCount = 0;

	beforeAll(async () => {
		// Register module entity decorators via the filesystem so that a newly
		// added module entity is picked up without editing this test.
		const moduleEntityFiles = findEntityFiles(path.resolve(__dirname, '../../../modules'));
		moduleEntityFileCount = moduleEntityFiles.length;
		await Promise.all(moduleEntityFiles.map(async (file) => await import(file)));

		const storage = getMetadataArgsStorage();
		const entityTargets = new Set(
			storage.tables.map((t) => t.target).filter((t): t is Function => typeof t === 'function'),
		);

		for (const relation of storage.relations) {
			if (typeof relation.target !== 'function' || !entityTargets.has(relation.target)) continue;
			const relationType =
				typeof relation.type === 'function' && !entityTargets.has(relation.type as Function)
					? (relation.type as () => unknown)()
					: relation.type;
			const typeName = typeof relationType === 'function' ? relationType.name : relationType;
			if (typeName === 'Project' && relation.target.name !== 'Project') {
				projectOwnedEntityNames.add(relation.target.name);
			}
		}

		for (const column of storage.columns) {
			if (typeof column.target !== 'function' || !entityTargets.has(column.target)) continue;
			if (column.propertyName === 'projectId' && column.target.name !== 'Project') {
				projectOwnedEntityNames.add(column.target.name);
			}
		}
	}, 120_000);

	const manifestEntries = [...TRANSFERRED_PROJECT_RESOURCES, ...NOT_TRANSFERRED_PROJECT_RESOURCES];
	const manifestNames = new Set(manifestEntries.map((entry) => entry.name));

	it('registers module entities', () => {
		expect(moduleEntityFileCount).toBeGreaterThan(0);
	});

	it('detects known project-owned entities', () => {
		// sanity check that metadata reflection works at all
		expect(projectOwnedEntityNames).toContain('SharedWorkflow');
	});

	it('accounts for every project-owned entity', () => {
		const unhandled = [...projectOwnedEntityNames].filter((name) => !manifestNames.has(name));
		expect(unhandled.sort()).toEqual([]);
	});

	it('has no stale manifest entries', () => {
		const stale = [...manifestNames].filter((name) => !projectOwnedEntityNames.has(name));
		expect(stale.sort()).toEqual([]);
	});

	it('lists each entity only once', () => {
		expect(manifestNames.size).toBe(manifestEntries.length);
	});

	it('pins every entry to the file that declares the entity', () => {
		const broken = manifestEntries
			.filter((entry) => {
				const filePath = path.join(REPO_ROOT, entry.path);
				if (!existsSync(filePath)) return true;
				return !new RegExp(`\\bclass ${entry.name}\\b`).test(readFileSync(filePath, 'utf8'));
			})
			.map((entry) => `${entry.name} → ${entry.path}`);
		expect(broken).toEqual([]);
	});
});
