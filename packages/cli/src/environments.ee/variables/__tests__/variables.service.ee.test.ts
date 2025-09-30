import { createTeamProject, testDb } from '@n8n/backend-test-utils';
import { VariablesRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { createAdmin, createMember } from '@test-integration/db/users';
import { createProjectVariable, createVariable } from '@test-integration/db/variables';
import { mock } from 'jest-mock-extended';

import { VariablesService } from '../variables.service.ee';

import type { EventService } from '@/events/event.service';
import { CacheService } from '@/services/cache/cache.service';
import { ProjectService } from '@/services/project.service.ee';

describe('VariablesService', () => {
	let variablesService: VariablesService;
	let variablesRepository: VariablesRepository;
	let cacheService: CacheService;
	let projectService: ProjectService;
	let licenseState: { isVariablesLicensed: jest.Mock; getMaxVariables: jest.Mock };

	beforeAll(async () => {
		await testDb.init();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	beforeEach(() => {
		variablesRepository = Container.get(VariablesRepository);
		cacheService = Container.get(CacheService);
		projectService = Container.get(ProjectService);
		licenseState = {
			isVariablesLicensed: jest.fn().mockReturnValue(true),
			getMaxVariables: jest.fn().mockReturnValue(5),
		};

		variablesService = new VariablesService(
			cacheService,
			variablesRepository,
			mock<EventService>(),
			licenseState as any,
			projectService,
		);
	});

	afterEach(async () => {
		jest.clearAllMocks();
		await testDb.truncate(['Variables']);
	});

	describe('create', () => {
		test('user without variable:create scope should not be able to create a variable', async () => {
			// ARRANGE
			const user = await createMember();

			// ACT & ASSERT
			await expect(
				variablesService.create(user, {
					key: 'VAR1',
					type: 'string',
					value: 'value1',
				}),
			).rejects.toThrow('You are not allowed to create a variable');
		});

		test('user with variable:create scope should be able to create a variable', async () => {
			// ARRANGE
			const user = await createAdmin();

			// ACT
			const variable = await variablesService.create(user, {
				key: 'VAR1',
				type: 'string',
				value: 'value1',
			});

			// ASSERT
			expect(variable).toMatchObject({ key: 'VAR1', type: 'string', value: 'value1' });
		});

		test('user with project scope should be able to create a variable in that project', async () => {
			// ARRANGE
			const user = await createMember();
			const project = await createTeamProject(undefined, user);

			const variable = await variablesService.create(user, {
				key: 'VAR1',
				type: 'string',
				value: 'value1',
				projectId: project.id,
			});

			// ASSERT
			expect(variable).toMatchObject({
				key: 'VAR1',
				type: 'string',
				value: 'value1',
				projectId: project.id,
			});
		});

		test('user with global project variable scope should be able to create a variable in any project', async () => {
			// ARRANGE
			const user = await createAdmin();
			const project = await createTeamProject();

			const variable = await variablesService.create(user, {
				key: 'VAR1',
				type: 'string',
				value: 'value1',
				projectId: project.id,
			});

			// ASSERT
			expect(variable).toMatchObject({
				key: 'VAR1',
				type: 'string',
				value: 'value1',
				projectId: project.id,
			});
		});
	});

	describe('getAllCached', () => {
		it('should get all cached variables', async () => {
			// ARRANGE
			const user = await createAdmin();

			await variablesService.create(user, {
				key: 'VAR1',
				type: 'string',
				value: 'value1',
			});

			await variablesService.create(user, {
				key: 'VAR2',
				type: 'string',
				value: 'value2',
			});

			// ACT
			const variables = await variablesService.getAllCached();

			// ASSERT
			expect(variables).toHaveLength(2);
			expect(variables[0]).toMatchObject({ key: 'VAR1', type: 'string', value: 'value1' });
			expect(variables[1]).toMatchObject({ key: 'VAR2', type: 'string', value: 'value2' });
		});
	});

	describe('getAllForUser', () => {
		it('user with variable:read scope should be able to get variables', async () => {
			// ARRANGE
			const user = await createMember();
			const variable = await createVariable();

			// ACT
			const variations = await variablesService.getAllForUser(user, {});

			// ASSERT
			expect(variations).toHaveLength(1);
			expect(variations[0]).toMatchObject({
				id: variable.id,
				key: variable.key,
				type: variable.type,
				value: variable.value,
			});
		});

		it('user without projectVariable:list scope should not be able to get project variables', async () => {
			// ARRANGE
			const user = await createMember();
			const project = await createTeamProject();

			await createProjectVariable(undefined, undefined, project);

			// ACT & ASSERT
			const variables = await variablesService.getAllForUser(user, {});
			expect(variables).toHaveLength(0);
		});

		it('user with projectVariable:list scope should be able to get project variables', async () => {
			// ARRANGE
			const user = await createAdmin();
			const project = await createTeamProject();

			const variable = await createProjectVariable(undefined, undefined, project);

			// ACT
			const variables = await variablesService.getAllForUser(user, {});

			// ASSERT
			expect(variables).toHaveLength(1);
			expect(variables[0]).toMatchObject({
				id: variable.id,
				key: variable.key,
				type: variable.type,
				value: variable.value,
				project: { id: project.id, name: project.name },
			});
		});
	});

	describe('getForUser', () => {
		it('user with variable:read scope should be able to get a variable', async () => {
			// ARRANGE
			const user = await createMember();
			const variable = await createVariable();

			// ACT
			const fetchedVariable = await variablesService.getForUser(user, variable.id);

			// ASSERT
			expect(fetchedVariable).toBeDefined();
			expect(fetchedVariable).toMatchObject({
				id: variable.id,
				key: variable.key,
				type: variable.type,
				value: variable.value,
			});
		});

		it('user without projectVariable:read scope should not be able to get a project variable', async () => {
			// ARRANGE
			const user = await createMember();
			const project = await createTeamProject();

			const variable = await createProjectVariable(undefined, undefined, project);

			// ACT & ASSERT
			await expect(variablesService.getForUser(user, variable.id)).rejects.toThrow(
				'You are not allowed to access this variable',
			);
		});

		it('user with projectVariable:read scope should be able to get a project variable', async () => {
			// ARRANGE
			const user = await createAdmin();
			const project = await createTeamProject();

			const variable = await createProjectVariable(undefined, undefined, project);

			// ACT
			const fetchedVariable = await variablesService.getForUser(user, variable.id);

			// ASSERT
			expect(fetchedVariable).toBeDefined();
			expect(fetchedVariable).toMatchObject({
				id: variable.id,
				key: variable.key,
				type: variable.type,
				value: variable.value,
				project: { id: project.id, name: project.name },
			});
		});
	});
});
