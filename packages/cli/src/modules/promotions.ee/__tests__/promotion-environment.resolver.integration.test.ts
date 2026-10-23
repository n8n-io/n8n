import type { PromotionDirection, PromotionEnvironmentSettings } from '@n8n/api-types';
import {
	createTeamProject,
	getPersonalProject,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { BadRequestError } from '@n8n/errors';
import { createOwner } from '@test-integration/db/users';

import { PromotionEnvironmentProjectRepository } from '../database/repositories/promotion-environment-project.repository';
import { PromotionEnvironmentRepository } from '../database/repositories/promotion-environment.repository';
import { PromotionProviderRepository } from '../database/repositories/promotion-provider.repository';
import { PromotionEnvironmentResolver } from '../promotion-environment.resolver';

let providerRepository: PromotionProviderRepository;
let environmentRepository: PromotionEnvironmentRepository;
let linkRepository: PromotionEnvironmentProjectRepository;
let resolver: PromotionEnvironmentResolver;
let owner: User;

const APPLY_SETTINGS = { schemaVersion: 1, branchName: 'dev' } as const;
const PROMOTE_SETTINGS = {
	schemaVersion: 1,
	baseBranchName: 'staging',
	createBranchOnPromotion: false,
} as const;

beforeAll(async () => {
	await testModules.loadModules(['promotions']);
	await testDb.init();

	providerRepository = Container.get(PromotionProviderRepository);
	environmentRepository = Container.get(PromotionEnvironmentRepository);
	linkRepository = Container.get(PromotionEnvironmentProjectRepository);
	resolver = new PromotionEnvironmentResolver(
		environmentRepository,
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
	await environmentRepository.delete({});
	await providerRepository.delete({});
	await testDb.truncate(['SharedWorkflow', 'ProjectRelation', 'Project']);
	owner = await createOwner();
});

async function createEnvironment(options: {
	name: string;
	scope: 'instance' | 'projects';
	direction?: PromotionDirection;
	settings?: PromotionEnvironmentSettings;
}) {
	const direction = options.direction ?? 'apply';
	const provider = await providerRepository.insertProvider({
		name: options.name,
		type: 'git',
		authType: 'token',
		config: { schemaVersion: 1 },
		auth: `encrypted-${options.name}`,
	});
	const environment = await environmentRepository.insertEnvironment({
		name: options.name,
		scope: options.scope,
		providerId: provider.id,
		remote: { schemaVersion: 1, remoteUrl: `https://example.com/org/${options.name}.git` },
		direction,
		settings: options.settings ?? (direction === 'apply' ? APPLY_SETTINGS : PROMOTE_SETTINGS),
	});
	return { environment, provider };
}

describe('PromotionEnvironmentResolver', () => {
	describe('resolveForEnvironment', () => {
		it('returns everything an operation needs in one snapshot', async () => {
			const { environment, provider } = await createEnvironment({
				name: 'instanceRepo',
				scope: 'instance',
			});

			const input = await resolver.resolveForEnvironment(environment.id, 'apply');

			// The remote and the credentials come from the same read, so a concurrent
			// edit cannot pair old credentials with a new remote.
			expect(input).toMatchObject({
				environmentId: environment.id,
				scope: 'instance',
				providerId: provider.id,
				providerType: 'git',
				authType: 'token',
				encryptedAuth: 'encrypted-instanceRepo',
				remote: { remoteUrl: 'https://example.com/org/instanceRepo.git' },
				config: { direction: 'apply', settings: APPLY_SETTINGS },
			});
		});

		it('rejects stored settings this version cannot read, before any Git work', async () => {
			const { environment } = await createEnvironment({
				name: 'instanceRepo',
				scope: 'instance',
				settings: {
					schemaVersion: 2,
					branchName: 'dev',
				} as unknown as PromotionEnvironmentSettings,
			});

			await expect(resolver.resolveForEnvironment(environment.id, 'apply')).rejects.toThrow(
				BadRequestError,
			);
		});
	});

	describe('resolveForProject', () => {
		it("uses the project's environment for that direction over the instance one", async () => {
			await createEnvironment({ name: 'instanceRepo', scope: 'instance' });
			const { environment: projectEnvironment } = await createEnvironment({
				name: 'teamRepo',
				scope: 'projects',
			});
			const project = await createTeamProject('Orders', owner);
			await linkRepository.linkProject(project.id, projectEnvironment.id, 'apply');

			const input = await resolver.resolveForProject(project.id, 'apply');

			expect(input.environmentId).toBe(projectEnvironment.id);
		});

		it('falls back to the instance environment for a direction the project has no environment for', async () => {
			const { environment: instanceApply } = await createEnvironment({
				name: 'instanceRepo',
				scope: 'instance',
			});
			const { environment: projectPromote } = await createEnvironment({
				name: 'teamRepo',
				scope: 'projects',
				direction: 'promote',
			});
			const project = await createTeamProject('Orders', owner);
			await linkRepository.linkProject(project.id, projectPromote.id, 'promote');

			const input = await resolver.resolveForProject(project.id, 'apply');

			expect(input.environmentId).toBe(instanceApply.id);
		});

		it('rejects a personal project', async () => {
			await createEnvironment({ name: 'instanceRepo', scope: 'instance' });
			const personalProject = await getPersonalProject(owner);

			await expect(resolver.resolveForProject(personalProject.id, 'apply')).rejects.toThrow(
				BadRequestError,
			);
		});
	});
});
