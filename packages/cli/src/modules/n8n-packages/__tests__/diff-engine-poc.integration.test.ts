import { createTeamProject, createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { simpleGit } from 'simple-git';

import { createOwner } from '@test-integration/db/users';

import { WorkflowExporter } from '../entities/workflow/workflow.exporter';
import { WorkflowSerializer } from '../entities/workflow/workflow.serializer';
import { DirectoryPackageWriter } from '../io/directory/directory-package-writer';
import { generateSlug } from '../io/slug.utils';
import { WorkflowVersionPolicy } from '../n8n-packages.types';

/**
 * POC for the promotion diff engine (Option 1: serialize + hash).
 * Throwaway — not the real feature. Validates the core algorithm end to end:
 * the Base side is what the real WorkflowExporter writes to disk, the Desired
 * side is the real WorkflowSerializer output formatted the way the exporter
 * formats it and hashed with git's own blob format. The two sides are joined
 * by id against a real `git ls-tree` of a throwaway repo.
 *
 * Path generation here is a stub (`<slug>-<id>.json`) — real path
 * determinism/collision handling is tracked in a separate ticket.
 */

const ID_LENGTH = 16;

function parseIdFromPath(path: string): string {
	const withoutExt = path.endsWith('.json') ? path.slice(0, -'.json'.length) : path;
	return withoutExt.slice(-ID_LENGTH);
}

function expectedPath(id: string, name: string): string {
	return `${generateSlug(name, 'workflow')}-${id}.json`;
}

function gitBlobHash(content: string): string {
	const bytes = Buffer.from(content, 'utf-8');
	const header = Buffer.from(`blob ${bytes.length}\0`, 'utf-8');
	return createHash('sha1')
		.update(Buffer.concat([header, bytes]))
		.digest('hex');
}

interface Snapshot {
	path: string;
	hash: string;
}
type SideMap = Map<string, Snapshot>;

async function buildBaseMap(repoDir: string): Promise<SideMap> {
	const git = simpleGit(repoDir);
	const raw = await git.raw(['ls-tree', '-r', 'HEAD']);
	const map: SideMap = new Map();
	for (const line of raw.split('\n').filter(Boolean)) {
		const [meta, path] = line.split('\t');
		const sha = meta.split(' ')[2];
		map.set(parseIdFromPath(path), { path, hash: sha });
	}
	return map;
}

type ExternalStatus = 'created' | 'deleted' | 'modified';
type InternalStatus = ExternalStatus | 'moved' | 'moved+modified';

interface DiffEntry {
	id: string;
	status: ExternalStatus;
	internalStatus: InternalStatus;
	basePath?: string;
	desiredPath?: string;
}

function diff(base: SideMap, desired: SideMap): DiffEntry[] {
	const results: DiffEntry[] = [];
	const allIds = new Set<string>([...base.keys(), ...desired.keys()]);
	for (const id of allIds) {
		const b = base.get(id);
		const d = desired.get(id);
		if (!b) {
			results.push({ id, status: 'created', internalStatus: 'created', desiredPath: d!.path });
			continue;
		}
		if (!d) {
			results.push({ id, status: 'deleted', internalStatus: 'deleted', basePath: b.path });
			continue;
		}
		const hashSame = b.hash === d.hash;
		const pathSame = b.path === d.path;
		if (hashSame && pathSame) continue; // unchanged, dropped from output

		const internalStatus: InternalStatus = hashSame
			? 'moved'
			: pathSame
				? 'modified'
				: 'moved+modified';
		// UI has no distinct "Moved" badge yet — fold moved/moved+modified into modified,
		// but keep internalStatus for callers that need the real classification.
		results.push({
			id,
			status: 'modified',
			internalStatus,
			basePath: b.path,
			desiredPath: d.path,
		});
	}
	return results;
}

const START_NODE: INode = {
	id: 'n1',
	name: 'Start',
	type: 'n8n-nodes-base.manualTrigger',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

describe('diff engine POC (Option 1: serialize + hash)', () => {
	let repoDir: string;
	let owner: User;
	let exporter: WorkflowExporter;
	let serializer: WorkflowSerializer;
	let workflowRepository: WorkflowRepository;

	beforeAll(async () => {
		await testModules.loadModules(['n8n-packages']);
		await testDb.init();
		exporter = Container.get(WorkflowExporter);
		serializer = Container.get(WorkflowSerializer);
		workflowRepository = Container.get(WorkflowRepository);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	beforeEach(async () => {
		await testDb.truncate(['WorkflowEntity', 'SharedWorkflow', 'ProjectRelation', 'Project']);
		owner = await createOwner();
		repoDir = await mkdtemp(join(tmpdir(), 'diff-engine-poc-'));
		const git = simpleGit(repoDir);
		await git.init();
		await git.addConfig('user.email', 'poc@example.com');
		await git.addConfig('user.name', 'POC');
	});

	afterEach(async () => {
		await rm(repoDir, { recursive: true, force: true });
	});

	/** The Base side: the bytes the real exporter puts on the branch. */
	async function exportedContentOf(workflowId: string): Promise<string> {
		const exportDir = await mkdtemp(join(tmpdir(), 'diff-engine-poc-export-'));
		const { entries } = await exporter.export({
			user: owner,
			workflowIds: [workflowId],
			writer: new DirectoryPackageWriter(exportDir),
			includeTags: false,
			workflowVersionPolicy: WorkflowVersionPolicy.Latest,
		});
		const content = await readFile(join(exportDir, entries[0].target, 'workflow.json'), 'utf-8');
		await rm(exportDir, { recursive: true, force: true });
		return content;
	}

	/** The Desired side: what the engine hashes from the live instance, without writing a file. */
	async function engineContentOf(workflowId: string): Promise<string> {
		const workflow = await workflowRepository.findOneOrFail({
			where: { id: workflowId },
			relations: { parentFolder: true },
		});
		return JSON.stringify(serializer.serialize(workflow, { includeTags: false }), null, '\t');
	}

	async function replaceNodes(workflowId: string, nodes: INode[]) {
		const workflow = await workflowRepository.findOneByOrFail({ id: workflowId });
		workflow.nodes = nodes;
		await workflowRepository.save(workflow);
	}

	it('classifies created, deleted, modified, moved, moved+modified, and unchanged correctly', async () => {
		const project = await createTeamProject('Diff Engine POC', owner);
		const git = simpleGit(repoDir);

		// 1. UNCHANGED — the branch holds exactly what the exporter writes today.
		const unchanged = await createWorkflow(
			{ name: 'Unchanged Flow', nodes: [], connections: {} },
			project,
		);
		await writeFile(
			join(repoDir, expectedPath(unchanged.id, unchanged.name)),
			await exportedContentOf(unchanged.id),
		);

		// 2. CREATED — DB only, nothing written to git.
		const created = await createWorkflow(
			{ name: 'Created Flow', nodes: [], connections: {} },
			project,
		);

		// 3. DELETED — git only, no corresponding DB row.
		const deletedId = '0000000000000001';
		await writeFile(join(repoDir, `old-flow-${deletedId}.json`), JSON.stringify({ id: deletedId }));

		// 4. MODIFIED — the branch holds the export from before a node was added.
		const modified = await createWorkflow(
			{ name: 'Modified Flow', nodes: [], connections: {} },
			project,
		);
		await writeFile(
			join(repoDir, expectedPath(modified.id, modified.name)),
			await exportedContentOf(modified.id),
		);
		await replaceNodes(modified.id, [START_NODE]);

		// 5. MOVED — identical content, different path.
		const moved = await createWorkflow({ name: 'Moved Flow', nodes: [], connections: {} }, project);
		await writeFile(
			join(repoDir, `stale-folder-${moved.id}.json`),
			await exportedContentOf(moved.id),
		);

		// 6. MOVED + MODIFIED — different path AND a node added since the export.
		const movedModified = await createWorkflow(
			{ name: 'Moved Modified Flow', nodes: [], connections: {} },
			project,
		);
		await writeFile(
			join(repoDir, `stale-folder-${movedModified.id}.json`),
			await exportedContentOf(movedModified.id),
		);
		await replaceNodes(movedModified.id, [START_NODE]);

		await git.add('.');
		await git.commit('seed base state');

		const baseMap = await buildBaseMap(repoDir);

		const desiredMap: SideMap = new Map();
		for (const workflow of [unchanged, created, modified, moved, movedModified]) {
			desiredMap.set(workflow.id, {
				path: expectedPath(workflow.id, workflow.name),
				hash: gitBlobHash(await engineContentOf(workflow.id)),
			});
		}

		const results = diff(baseMap, desiredMap);
		const byId = new Map(results.map((r) => [r.id, r]));

		expect(byId.has(unchanged.id)).toBe(false);
		expect(byId.get(created.id)).toMatchObject({ status: 'created', internalStatus: 'created' });
		expect(byId.get(deletedId)).toMatchObject({ status: 'deleted', internalStatus: 'deleted' });
		expect(byId.get(modified.id)).toMatchObject({
			status: 'modified',
			internalStatus: 'modified',
		});
		expect(byId.get(moved.id)).toMatchObject({ status: 'modified', internalStatus: 'moved' });
		expect(byId.get(movedModified.id)).toMatchObject({
			status: 'modified',
			internalStatus: 'moved+modified',
		});
	});

	it('hashes the live workflow to the blob sha git recorded for its export, also after a save that changes no content', async () => {
		const project = await createTeamProject('Diff Engine POC', owner);
		const git = simpleGit(repoDir);
		const workflow = await createWorkflow(
			{ name: 'Stable Flow', nodes: [START_NODE], connections: {} },
			project,
		);

		const firstExport = await exportedContentOf(workflow.id);
		expect(await exportedContentOf(workflow.id)).toBe(firstExport);

		await writeFile(join(repoDir, expectedPath(workflow.id, workflow.name)), firstExport);
		await git.add('.');
		await git.commit('seed base state');
		const [base] = [...(await buildBaseMap(repoDir)).values()];

		expect(gitBlobHash(await engineContentOf(workflow.id))).toBe(base.hash);

		const saved = await workflowRepository.findOneByOrFail({ id: workflow.id });
		saved.versionCounter += 1;
		saved.triggerCount += 1;
		await workflowRepository.save(saved);

		expect(gitBlobHash(await engineContentOf(workflow.id))).toBe(base.hash);
	});
});
