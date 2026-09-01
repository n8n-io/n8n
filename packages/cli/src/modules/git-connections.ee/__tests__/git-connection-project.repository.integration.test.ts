import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import { GitConnectionProjectRepository } from '../database/repositories/git-connection-project.repository';
import { GitConnectionRepository } from '../database/repositories/git-connection.repository';

let connectionRepository: GitConnectionRepository;
let projectLinkRepository: GitConnectionProjectRepository;

async function createConnection(name = 'conn') {
	return await connectionRepository.save(
		connectionRepository.create({
			name,
			repositoryUrl: 'https://github.com/o/r.git',
			branchName: 'main',
			connectionType: 'https',
			publicKey: null,
			encryptedPrivateKey: null,
			encryptedUsername: 'enc:user',
			encryptedPassword: 'enc:pass',
			keyGeneratorType: null,
			baseCommit: null,
		}),
	);
}

async function link(gitConnectionId: string, projectId: string) {
	await projectLinkRepository.insert({ gitConnectionId, projectId });
}

beforeAll(async () => {
	await testModules.loadModules(['git-connections']);
	await testDb.init();

	connectionRepository = Container.get(GitConnectionRepository);
	projectLinkRepository = Container.get(GitConnectionProjectRepository);
});

beforeEach(async () => {
	// Delete links before connections to satisfy the foreign key.
	await projectLinkRepository.delete({});
	await connectionRepository.delete({});
});

afterAll(async () => {
	await testDb.terminate();
});

describe('GitConnectionProjectRepository.syncConnectionProjects (integration)', () => {
	it('links projects that were not previously linked', async () => {
		const connection = await createConnection();
		const [a, b] = [await createTeamProject(), await createTeamProject()];

		await projectLinkRepository.syncConnectionProjects(connection.id, [a.id, b.id]);

		expect(await projectLinkRepository.findProjectIdsByConnection(connection.id)).toEqual(
			[a.id, b.id].sort(),
		);
	});

	it('prunes links for projects no longer in the working copy', async () => {
		const connection = await createConnection();
		const [a, b, c] = [
			await createTeamProject(),
			await createTeamProject(),
			await createTeamProject(),
		];
		await link(connection.id, a.id);
		await link(connection.id, b.id);
		await link(connection.id, c.id);

		await projectLinkRepository.syncConnectionProjects(connection.id, [a.id, b.id]);

		expect(await projectLinkRepository.findProjectIdsByConnection(connection.id)).toEqual(
			[a.id, b.id].sort(),
		);
	});

	it('moves a project already linked to another connection', async () => {
		const source = await createConnection('source');
		const target = await createConnection('target');
		const project = await createTeamProject();
		await link(source.id, project.id);

		await projectLinkRepository.syncConnectionProjects(target.id, [project.id]);

		expect(await projectLinkRepository.findProjectIdsByConnection(source.id)).toEqual([]);
		expect(await projectLinkRepository.findProjectIdsByConnection(target.id)).toEqual([project.id]);
	});

	it('is idempotent when the imported set is unchanged', async () => {
		const connection = await createConnection();
		const [a, b] = [await createTeamProject(), await createTeamProject()];

		await projectLinkRepository.syncConnectionProjects(connection.id, [a.id, b.id]);
		await projectLinkRepository.syncConnectionProjects(connection.id, [a.id, b.id]);

		expect(await projectLinkRepository.findProjectIdsByConnection(connection.id)).toEqual(
			[a.id, b.id].sort(),
		);
	});

	it('leaves existing links untouched for an empty import', async () => {
		const connection = await createConnection();
		const project = await createTeamProject();
		await link(connection.id, project.id);

		await projectLinkRepository.syncConnectionProjects(connection.id, []);

		expect(await projectLinkRepository.findProjectIdsByConnection(connection.id)).toEqual([
			project.id,
		]);
	});
});
