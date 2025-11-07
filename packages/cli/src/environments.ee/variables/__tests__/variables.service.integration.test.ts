import { createTeamProject, linkUserToProject, testDb } from '@n8n/backend-test-utils';
import { VariablesRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { AssignableProjectRole } from '@n8n/permissions';
import { mock } from 'jest-mock-extended';

import type { EventService } from '@/events/event.service';
import { CacheService } from '@/services/cache/cache.service';
import { ProjectService } from '@/services/project.service.ee';
import { createAdmin, createMember } from '@test-integration/db/users';
import { createProjectVariable, createVariable } from '@test-integration/db/variables';

import { VariablesService } from '../variables.service.ee';

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

		test('user should not be able to create global variable that already exists', async () => {
			// ARRANGE
			const user = await createAdmin();

			await variablesService.create(user, {
				key: 'VAR1',
				type: 'string',
				value: 'value1',
			});

			// ACT & ASSERT
			await expect(
				variablesService.create(user, {
					key: 'VAR1',
					type: 'string',
					value: 'value1',
				}),
			).rejects.toThrow('A global variable with key "VAR1" already exists');
		});

		test('user should not be able to create project variable that already exists in the same project', async () => {
			// ARRANGE
			const user = await createAdmin();
			const project = await createTeamProject();

			await variablesService.create(user, {
				key: 'VAR1',
				type: 'string',
				value: 'value1',
				projectId: project.id,
			});

			// ACT & ASSERT
			await expect(
				variablesService.create(user, {
					key: 'VAR1',
					type: 'string',
					value: 'value1',
					projectId: project.id,
				}),
			).rejects.toThrow('A variable with key "VAR1" already exists in the specified project');
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
			const firstVar = variables.find((v) => v.key === 'VAR1');
			const secondVar = variables.find((v) => v.key === 'VAR2');
			expect(firstVar).toMatchObject({ key: 'VAR1', type: 'string', value: 'value1' });
			expect(secondVar).toMatchObject({ key: 'VAR2', type: 'string', value: 'value2' });
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

		it('state filter should work for global variable', async () => {
			// ARRANGE
			const user = await createAdmin();

			await createVariable('VAR1', 'value1');
			await createVariable('VAR2', '');

			// ACT
			const variables = await variablesService.getAllForUser(user, { state: 'empty' });

			// ASSERT
			expect(variables).toHaveLength(1);
			expect(variables[0]).toMatchObject({ key: 'VAR2' });
		});

		it('state and project filter should work for project variable', async () => {
			// ARRANGE
			const user = await createAdmin();
			const project1 = await createTeamProject();
			const project2 = await createTeamProject();

			await createProjectVariable('VAR1', 'value1', project1);
			await createProjectVariable('VAR2', '', project1);
			await createProjectVariable('VAR3', 'value3', project2);

			// ACT
			const variables = await variablesService.getAllForUser(user, {
				state: 'empty',
				projectId: project1.id,
			});

			// ASSERT
			expect(variables).toHaveLength(1);
			expect(variables[0]).toMatchObject({ key: 'VAR2', project: { id: project1.id } });
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

	describe('deleteForUser', () => {
		it('user without global variable:delete scope should not be able to delete a global variable', async () => {
			// ARRANGE
			const user = await createMember();
			const variable = await createVariable();

			// ACT & ASSERT
			await expect(variablesService.deleteForUser(user, variable.id)).rejects.toThrow(
				'You are not allowed to delete this variable',
			);
		});

		it('user with global variable:delete scope should be able to delete a global variable', async () => {
			// ARRANGE
			const user = await createAdmin();
			const variable = await createVariable();

			// ACT
			await variablesService.deleteForUser(user, variable.id);

			// ASSERT
			expect(await variablesService.getAllForUser(user, {})).toHaveLength(0);
		});

		it('user with global projectVariable:delete scope should be able to delete a project variable', async () => {
			// ARRANGE
			const user = await createAdmin();
			const project = await createTeamProject();

			const variable = await createProjectVariable(undefined, undefined, project);

			// ACT
			await variablesService.deleteForUser(user, variable.id);

			// ASSERT
			const variables = await variablesService.getAllForUser(user, {});
			expect(variables).toHaveLength(0);
		});

		it('user without projectVariable:delete scope should not be able to delete a project variable', async () => {
			// ARRANGE
			const user = await createMember();
			const project = await createTeamProject();
			await linkUserToProject(user, project, 'project:viewer');

			const variable = await createProjectVariable(undefined, undefined, project);

			// ACT & ASSERT
			await expect(variablesService.deleteForUser(user, variable.id)).rejects.toThrow(
				'You are not allowed to delete this variable',
			);
		});

		it.each<AssignableProjectRole>(['project:admin', 'project:editor'])(
			'user with projectVariable:delete scope (role %s) should be able to delete a project variable in that project',
			async (role) => {
				// ARRANGE
				const user = await createMember();
				const project = await createTeamProject();
				await linkUserToProject(user, project, role);

				const variable = await createProjectVariable(undefined, undefined, project);

				// ACT
				await variablesService.deleteForUser(user, variable.id);

				// ASSERT
				const variables = await variablesService.getAllForUser(user, {});
				expect(variables).toHaveLength(0);
			},
		);
	});

	describe('update', () => {
		it('user without global variable:update scope should not be able to update a global variable', async () => {
			// ARRANGE
			const user = await createMember();
			const variable = await createVariable('VAR1', 'value1');

			// ACT & ASSERT
			await expect(
				variablesService.update(user, variable.id, {
					key: 'VAR1',
					type: 'string',
					value: 'value2',
				}),
			).rejects.toThrow('You are not allowed to update this variable');
		});

		it('user with global variable:update scope should be able to update a global variable', async () => {
			// ARRANGE
			const user = await createAdmin();
			const variable = await createVariable('VAR1', 'value1');

			// ACT
			const updatedVariable = await variablesService.update(user, variable.id, {
				value: 'value2',
			});

			// ASSERT
			expect(updatedVariable).toBeDefined();
			expect(updatedVariable).toMatchObject({
				id: variable.id,
				key: 'VAR1',
				type: 'string',
				value: 'value2',
			});
		});

		it('user without projectVariable:update scope should not be able to update a project variable', async () => {
			// ARRANGE
			const user = await createMember();
			const project = await createTeamProject();
			const variable = await createProjectVariable('VAR1', 'value1', project);

			// ACT & ASSERT
			await expect(
				variablesService.update(user, variable.id, {
					value: 'value2',
				}),
			).rejects.toThrow('You are not allowed to update this variable');
		});

		it('user without projectVariable:update scope on destination project should not be able to update a project variable', async () => {
			// ARRANGE
			const user = await createMember();
			const project1 = await createTeamProject();
			const project2 = await createTeamProject();
			await linkUserToProject(user, project1, 'project:editor');

			const variable = await createProjectVariable('VAR1', 'value1', project1);

			// ACT & ASSERT
			await expect(
				variablesService.update(user, variable.id, {
					key: 'VAR1',
					type: 'string',
					value: 'value2',
					projectId: project2.id,
				}),
			).rejects.toThrow('You are not allowed to move this variable to the specified project');
		});

		it('user without global projectVariable:update scope should not be able to update a project variable to global', async () => {
			// ARRANGE
			const user = await createMember();
			const project = await createTeamProject();
			await linkUserToProject(user, project, 'project:editor');

			const variable = await createProjectVariable('VAR1', 'value1', project);

			// ACT & ASSERT
			await expect(
				variablesService.update(user, variable.id, {
					key: 'VAR1',
					type: 'string',
					value: 'value2',
					projectId: null,
				}),
			).rejects.toThrow('You are not allowed to move this variable to the global scope');
		});

		it('user with projectVariable:update scope should be able to update a project variable in that project', async () => {
			// ARRANGE
			const user = await createMember();
			const project = await createTeamProject();
			await linkUserToProject(user, project, 'project:editor');

			const variable = await createProjectVariable('VAR1', 'value1', project);

			// ACT
			const updatedVariable = await variablesService.update(user, variable.id, {
				key: 'VAR1',
				type: 'string',
				value: 'value2',
				projectId: project.id,
			});

			// ASSERT
			expect(updatedVariable).toBeDefined();
			expect(updatedVariable).toMatchObject({
				id: variable.id,
				key: 'VAR1',
				type: 'string',
				value: 'value2',
				project: { id: project.id, name: project.name },
			});
		});

		it('user should not be able to change variable key to one that already exists (global)', async () => {
			// ARRANGE
			const user = await createAdmin();
			await createVariable('VAR1', 'value1');
			const variable2 = await createVariable('VAR2', 'value2');

			// ACT & ASSERT
			await expect(
				variablesService.update(user, variable2.id, {
					key: 'VAR1',
					type: 'string',
					value: 'value2',
				}),
			).rejects.toThrow('A global variable with key "VAR1" already exists');
		});

		it('user should not be able to change variable key to one that already exists (project)', async () => {
			// ARRANGE
			const user = await createAdmin();
			const project = await createTeamProject();

			await createProjectVariable('VAR1', 'value1', project);
			const variable2 = await createProjectVariable('VAR2', 'value2', project);

			// ACT & ASSERT
			await expect(
				variablesService.update(user, variable2.id, {
					key: 'VAR1',
					type: 'string',
					value: 'value2',
					projectId: project.id,
				}),
			).rejects.toThrow('A variable with key "VAR1" already exists in the specified project');
		});

		it('user should not be able to change variable key to one that already exists (global -> project)', async () => {
			// ARRANGE
			const user = await createAdmin();
			const variable1 = await createVariable('VAR1', 'value1');
			const project = await createTeamProject();
			await createProjectVariable('VAR2', 'value2', project);

			// ACT & ASSERT
			await expect(
				variablesService.update(user, variable1.id, {
					key: 'VAR2',
					type: 'string',
					value: 'value1',
					projectId: project.id,
				}),
			).rejects.toThrow('A variable with key "VAR2" already exists in the specified project');
		});

		it('user should not be able to change variable key to one that already exists (project -> global)', async () => {
			// ARRANGE
			const user = await createAdmin();
			const project = await createTeamProject();
			const variable1 = await createProjectVariable('VAR1', 'value1', project);
			await createVariable('VAR2', 'value2');

			// ACT & ASSERT
			await expect(
				variablesService.update(user, variable1.id, {
					key: 'VAR2',
					type: 'string',
					value: 'value1',
					projectId: null,
				}),
			).rejects.toThrow('A global variable with key "VAR2" already exists');
		});

		it('user with projectVariable:update scope on both projects should be able to update variable on destination project', async () => {
			// ARRANGE
			const user = await createMember();
			const project1 = await createTeamProject();
			const project2 = await createTeamProject();
			await linkUserToProject(user, project1, 'project:editor');
			await linkUserToProject(user, project2, 'project:editor');

			const variable = await createProjectVariable('VAR1', 'value1', project1);

			// ACT
			const updatedVariable = await variablesService.update(user, variable.id, {
				key: 'VAR1',
				type: 'string',
				value: 'value2',
				projectId: project2.id,
			});

			// ASSERT
			expect(updatedVariable).toBeDefined();
			expect(updatedVariable).toMatchObject({
				id: variable.id,
				key: 'VAR1',
				type: 'string',
				value: 'value2',
				project: { id: project2.id, name: project2.name },
			});
		});
	});
});
