import { createTeamProject, createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { simpleGit } from 'simple-git';

import { createOwner } from '@test-integration/db/users';

import { WorkflowSerializer } from '../entities/workflow/workflow.serializer';
import { formatEntityFile } from '../io/entity-file-format';
import { N8nPackagesService } from '../n8n-packages.service';
import { packageManifestSchema } from '../spec/manifest.schema';

/** SHA-1 over git's blob object format: `blob <byte length>\0<content>`. */
function gitBlobHash(content: string): string {
	const bytes = Buffer.from(content, 'utf-8');
	const header = Buffer.from(`blob ${bytes.length}\0`, 'utf-8');
	return createHash('sha1')
		.update(Buffer.concat([header, bytes]))
		.digest('hex');
}

let service: N8nPackagesService;
let owner: User;
let repoDir: string;

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages']);
	await testDb.init();
	service = Container.get(N8nPackagesService);
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity', 'SharedWorkflow', 'ProjectRelation', 'Project']);
	owner = await createOwner();
	repoDir = await mkdtemp(join(tmpdir(), 'n8n-export-parity-'));
});

afterEach(async () => {
	await rm(repoDir, { recursive: true, force: true });
});

describe('exported files vs git blob hashes', () => {
	it('hashes a workflow serialized through formatEntityFile to the blob sha git records for its exported file', async () => {
		const project = await createTeamProject('Parity Project', owner);
		const workflow = await createWorkflow(
			{
				// Non-ASCII content pins the utf-8 byte length in the blob header.
				name: 'Zürich Parity Flow',
				nodes: [
					{
						id: 'set-greeting',
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [200, 0],
						parameters: {
							assignments: {
								assignments: [{ id: 'a1', name: 'greeting', type: 'string', value: 'grüße ✓' }],
							},
						},
					},
				],
				connections: {},
			},
			project,
		);

		await service.exportPackageToDirectory(
			{ user: owner, workflowIds: [workflow.id] },
			{ targetDir: repoDir },
		);

		const git = simpleGit(repoDir);
		await git.init();
		await git.addConfig('user.email', 'parity@example.com');
		await git.addConfig('user.name', 'Parity');
		await git.addConfig('commit.gpgsign', 'false');
		await git.add('.');
		await git.commit('export');

		const manifest = packageManifestSchema.parse(
			jsonParse(await readFile(join(repoDir, 'manifest.json'), 'utf-8')),
		);
		const workflowPath = `${manifest.workflows![0].target}/workflow.json`;
		const lsTree = await git.raw(['ls-tree', 'HEAD', '--', workflowPath]);
		const committedHash = lsTree.trim().split('\t')[0].split(' ')[2];
		expect(committedHash).toBeDefined();

		const persistedWorkflow = await Container.get(WorkflowRepository).findOneOrFail({
			where: { id: workflow.id },
			relations: { parentFolder: true, tags: true },
		});
		const serialized = Container.get(WorkflowSerializer).serialize(persistedWorkflow, {
			includeTags: true,
		});

		expect(gitBlobHash(formatEntityFile(serialized))).toBe(committedHash);
	});
});
