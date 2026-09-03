import { createTeamProject, createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import type { WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { simpleGit } from 'simple-git';

import { createOwner } from '@test-integration/db/users';

import { WorkflowSerializer } from '../entities/workflow/workflow.serializer';
import { generateSlug } from '../io/slug.utils';

/**
 * POC for the promotion diff engine (Option 1: serialize + hash).
 * Throwaway — not the real feature. Validates the core algorithm end to end:
 * a real WorkflowSerializer output, canonicalized and hashed with git's own
 * blob format, joined by id against a real `git ls-tree` of a throwaway repo.
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

function canonicalize(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(canonicalize);
	if (value !== null && typeof value === 'object') {
		const sorted: Record<string, unknown> = {};
		for (const key of Object.keys(value as Record<string, unknown>).sort()) {
			sorted[key] = canonicalize((value as Record<string, unknown>)[key]);
		}
		return sorted;
	}
	return value;
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

describe('diff engine POC (Option 1: serialize + hash)', () => {
	let repoDir: string;
	let serializer: WorkflowSerializer;

	beforeAll(async () => {
		await testModules.loadModules(['n8n-packages']);
		await testDb.init();
		serializer = Container.get(WorkflowSerializer);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	beforeEach(async () => {
		await testDb.truncate(['WorkflowEntity', 'SharedWorkflow', 'ProjectRelation', 'Project']);
		repoDir = await mkdtemp(join(tmpdir(), 'diff-engine-poc-'));
		const git = simpleGit(repoDir);
		await git.init();
		await git.addConfig('user.email', 'poc@example.com');
		await git.addConfig('user.name', 'POC');
	});

	afterEach(async () => {
		await rm(repoDir, { recursive: true, force: true });
	});

	it('classifies created, deleted, modified, moved, moved+modified, and unchanged correctly', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Diff Engine POC', owner);
		const git = simpleGit(repoDir);

		function serializedContentOf(workflow: WorkflowEntity) {
			const serialized = serializer.serialize(workflow, { includeTags: false });
			return JSON.stringify(canonicalize(serialized));
		}

		// 1. UNCHANGED — identical content and path on both sides.
		const unchangedWf = await createWorkflow(
			{ name: 'Unchanged Flow', nodes: [], connections: {} },
			project,
		);
		await writeFile(
			join(repoDir, expectedPath(unchangedWf.id, unchangedWf.name)),
			serializedContentOf(unchangedWf),
		);

		// 2. CREATED — DB only, nothing written to git.
		const createdWf = await createWorkflow(
			{ name: 'Created Flow', nodes: [], connections: {} },
			project,
		);

		// 3. DELETED — git only, no corresponding DB row.
		const deletedId = '0000000000000001';
		await writeFile(join(repoDir, `old-flow-${deletedId}.json`), JSON.stringify({ id: deletedId }));

		// 4. MODIFIED — same path, different content (base has an older version with no nodes).
		const modifiedWf = await createWorkflow(
			{
				name: 'Modified Flow',
				nodes: [
					{
						id: 'n1',
						name: 'Start',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			},
			project,
		);
		const modifiedOldContent = JSON.stringify(
			canonicalize({
				...jsonParse<object>(serializedContentOf(modifiedWf)),
				nodes: [],
			}),
		);
		await writeFile(
			join(repoDir, expectedPath(modifiedWf.id, modifiedWf.name)),
			modifiedOldContent,
		);

		// 5. MOVED — identical content, different path.
		const movedWf = await createWorkflow(
			{ name: 'Moved Flow', nodes: [], connections: {} },
			project,
		);
		await writeFile(join(repoDir, `stale-folder-${movedWf.id}.json`), serializedContentOf(movedWf));

		// 6. MOVED + MODIFIED — different path AND different content.
		const movedModifiedWf = await createWorkflow(
			{
				name: 'Moved Modified Flow',
				nodes: [
					{
						id: 'n1',
						name: 'Start',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			},
			project,
		);
		const movedModifiedOldContent = JSON.stringify(
			canonicalize({
				...jsonParse<object>(serializedContentOf(movedModifiedWf)),
				nodes: [],
			}),
		);
		await writeFile(
			join(repoDir, `stale-folder-${movedModifiedWf.id}.json`),
			movedModifiedOldContent,
		);

		await git.add('.');
		await git.commit('seed base state');

		const baseMap = await buildBaseMap(repoDir);

		const desiredWorkflows = [unchangedWf, createdWf, modifiedWf, movedWf, movedModifiedWf];
		const desiredMap: SideMap = new Map();
		for (const wf of desiredWorkflows) {
			const canonical = serializedContentOf(wf);
			desiredMap.set(wf.id, {
				path: expectedPath(wf.id, wf.name),
				hash: gitBlobHash(canonical),
			});
		}

		const results = diff(baseMap, desiredMap);
		const byId = new Map(results.map((r) => [r.id, r]));

		expect(byId.has(unchangedWf.id)).toBe(false);
		expect(byId.get(createdWf.id)).toMatchObject({ status: 'created', internalStatus: 'created' });
		expect(byId.get(deletedId)).toMatchObject({ status: 'deleted', internalStatus: 'deleted' });
		expect(byId.get(modifiedWf.id)).toMatchObject({
			status: 'modified',
			internalStatus: 'modified',
		});
		expect(byId.get(movedWf.id)).toMatchObject({ status: 'modified', internalStatus: 'moved' });
		expect(byId.get(movedModifiedWf.id)).toMatchObject({
			status: 'modified',
			internalStatus: 'moved+modified',
		});
	});
});
