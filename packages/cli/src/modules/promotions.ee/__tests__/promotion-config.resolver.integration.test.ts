import type { PromotionConfigSettings } from '@n8n/api-types';
import {
	createTeamProject,
	getPersonalProject,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { createOwner } from '@test-integration/db/users';

import { PromotionConfigRepository } from '../database/repositories/promotion-config.repository';
import { PromotionConnectionProjectRepository } from '../database/repositories/promotion-connection-project.repository';
import { PromotionConnectionRepository } from '../database/repositories/promotion-connection.repository';
import { PromotionProviderRepository } from '../database/repositories/promotion-provider.repository';
import { PromotionConfigResolver } from '../promotion-config.resolver';

let providerRepository: PromotionProviderRepository;
let connectionRepository: PromotionConnectionRepository;
let configRepository: PromotionConfigRepository;
let linkRepository: PromotionConnectionProjectRepository;
let resolver: PromotionConfigResolver;
let owner: User;

const APPLY_SETTINGS = { schemaVersion: 1, branchName: 'dev' } as const;

beforeAll(async () => {
	await testModules.loadModules(['promotions']);
	await testDb.init();

	providerRepository = Container.get(PromotionProviderRepository);
	connectionRepository = Container.get(PromotionConnectionRepository);
	configRepository = Container.get(PromotionConfigRepository);
	linkRepository = Container.get(PromotionConnectionProjectRepository);
	resolver = new PromotionConfigResolver(
		configRepository,
		connectionRepository,
		linkRepository,
		Container.get(ProjectRepository),
	);
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	// Delete children before parents to satisfy the foreign keys.
	await linkRepository.delete({});
	await configRepository.delete({});
	await connectionRepository.delete({});
	await providerRepository.delete({});
	await testDb.truncate(['SharedWorkflow', 'ProjectRelation', 'Project']);
	owner = await createOwner();
});

async function createConnection(options: {
	name: string;
	scope: 'instance' | 'projects';
	remoteUrl?: string;
	settings?: PromotionConfigSettings;
}) {
	const provider = await providerRepository.insertProvider({
		name: options.name,
		type: 'git',
		authType: 'token',
		config: { schemaVersion: 1 },
		auth: `encrypted-${options.name}`,
	});
	const connection = await connectionRepository.insertConnection({
		name: options.name,
		scope: options.scope,
		providerId: provider.id,
		target: {
			schemaVersion: 1,
			remoteUrl: options.remoteUrl ?? `https://example.com/org/${options.name}.git`,
		},
	});
	if (options.settings) {
		await configRepository.insertConfig({
			connectionId: connection.id,
			direction: 'apply',
			name: 'Apply',
			settings: options.settings,
		});
	}
	return { connection, provider };
}

describe('PromotionConfigResolver', () => {
	describe('resolveForConnection', () => {
		it('returns everything an operation needs in one snapshot', async () => {
			const { connection, provider } = await createConnection({
				name: 'instanceRepo',
				scope: 'instance',
				settings: APPLY_SETTINGS,
			});

			const input = await resolver.resolveForConnection(connection.id, 'apply');

			// The target and the credentials come from the same read, so a concurrent
			// edit cannot pair old credentials with a new remote.
			expect(input).toMatchObject({
				connectionId: connection.id,
				connectionScope: 'instance',
				providerId: provider.id,
				providerType: 'git',
				authType: 'token',
				encryptedAuth: 'encrypted-instanceRepo',
				target: { remoteUrl: 'https://example.com/org/instanceRepo.git' },
				config: { direction: 'apply', settings: APPLY_SETTINGS },
			});
		});

		it('rejects stored settings this version cannot read, before any Git work', async () => {
			const { connection } = await createConnection({ name: 'instanceRepo', scope: 'instance' });
			await configRepository.insertConfig({
				connectionId: connection.id,
				direction: 'apply',
				name: 'Apply',
				settings: { schemaVersion: 2, branchName: 'dev' } as unknown as PromotionConfigSettings,
			});

			await expect(resolver.resolveForConnection(connection.id, 'apply')).rejects.toThrow(
				BadRequestError,
			);
		});
	});

	describe('resolveForProject', () => {
		it("uses the project's own connection over the instance one", async () => {
			await createConnection({
				name: 'instanceRepo',
				scope: 'instance',
				settings: APPLY_SETTINGS,
			});
			const { connection: projectConnection } = await createConnection({
				name: 'teamRepo',
				scope: 'projects',
				settings: APPLY_SETTINGS,
			});
			const project = await createTeamProject('Orders', owner);
			await linkRepository.linkProject(project.id, projectConnection.id);

			const input = await resolver.resolveForProject(project.id, 'apply');

			expect(input.connectionId).toBe(projectConnection.id);
		});

		it('falls back to the instance connection for an unlinked project', async () => {
			const { connection: instanceConnection } = await createConnection({
				name: 'instanceRepo',
				scope: 'instance',
				settings: APPLY_SETTINGS,
			});
			const project = await createTeamProject('Orders', owner);

			const input = await resolver.resolveForProject(project.id, 'apply');

			expect(input.connectionId).toBe(instanceConnection.id);
		});

		it('explains the missing direction rather than falling back to the instance connection', async () => {
			await createConnection({
				name: 'instanceRepo',
				scope: 'instance',
				settings: APPLY_SETTINGS,
			});
			// Linked, but the Apply direction was never set up on this connection.
			const { connection: projectConnection } = await createConnection({
				name: 'teamRepo',
				scope: 'projects',
			});
			const project = await createTeamProject('Orders', owner);
			await linkRepository.linkProject(project.id, projectConnection.id);

			await expect(resolver.resolveForProject(project.id, 'apply')).rejects.toThrow(
				'The promotion connection for this project has no apply configuration',
			);
		});

		it('rejects a personal project', async () => {
			await createConnection({
				name: 'instanceRepo',
				scope: 'instance',
				settings: APPLY_SETTINGS,
			});
			const personalProject = await getPersonalProject(owner);

			await expect(resolver.resolveForProject(personalProject.id, 'apply')).rejects.toThrow(
				BadRequestError,
			);
		});
	});
});
