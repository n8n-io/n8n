import { afterAll, beforeAll } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { setupServer } from '@/__tests__/server';
import { useEnvironmentsStore } from './environments.store';
import type { EnvironmentVariable } from './environments.types';
import type { Project } from '@/features/projects/projects.types';
import { useProjectsStore } from '@/features/projects/projects.store';

describe('environments.store', () => {
	let server: ReturnType<typeof setupServer>;

	beforeAll(() => {
		server = setupServer();

		server.create('variable', {
			id: '1',
			key: 'var1',
			value: 'value1',
		});

		server.create('variable', {
			id: '2',
			key: 'var2',
			value: 'value2',
		});

		// Create one variable linked to a project
		server.create('variable', {
			id: '3',
			key: 'var3',
			value: 'value3',
			project: { id: '1', name: 'Project 1' },
		});

		// Create one variable linked to a another project
		server.create('variable', {
			id: '4',
			key: 'var4',
			value: 'value4',
			project: { id: '2', name: 'Project 2' },
		});
	});

	beforeEach(() => {
		setActivePinia(createPinia());
	});

	afterAll(() => {
		server.shutdown();
	});

	describe('variables', () => {
		describe('fetchAllVariables()', () => {
			it('should fetch all variables', async () => {
				const environmentsStore = useEnvironmentsStore();
				await environmentsStore.fetchAllVariables();

				expect(environmentsStore.variables).toHaveLength(4);
				expect(environmentsStore.scopedVariables).toHaveLength(2);
			});

			it('should list all variables excluding different project variable', async () => {
				const environmentsStore = useEnvironmentsStore();
				const projectStore = useProjectsStore();
				projectStore.setCurrentProject({ id: '3', name: 'Project 3' } as Project);
				await environmentsStore.fetchAllVariables();

				expect(environmentsStore.variables).toHaveLength(2);
				expect(environmentsStore.scopedVariables).toHaveLength(2);
			});

			it('should list all variables with a current project set matching variable', async () => {
				const environmentsStore = useEnvironmentsStore();
				const projectStore = useProjectsStore();
				projectStore.setCurrentProject({ id: '1', name: 'Project 1' } as Project);
				await environmentsStore.fetchAllVariables();

				expect(environmentsStore.variables).toHaveLength(3);
				expect(environmentsStore.scopedVariables).toHaveLength(3);
			});
		});

		describe('createVariable()', () => {
			it('should store a new variable', async () => {
				const variable: Omit<EnvironmentVariable, 'id'> = {
					key: 'ENV_VAR',
					value: 'SECRET',
				};
				const environmentsStore = useEnvironmentsStore();

				await environmentsStore.fetchAllVariables();
				const recordsCount = environmentsStore.variables.length;

				expect(environmentsStore.variables).toHaveLength(recordsCount);

				await environmentsStore.createVariable(variable);

				expect(environmentsStore.variables).toHaveLength(recordsCount + 1);
				expect(environmentsStore.variables[0]).toMatchObject(variable);
			});
		});

		describe('updateVariable()', () => {
			it('should update an existing variable', async () => {
				const updateValue: Partial<EnvironmentVariable> = {
					key: 'ENV_VAR',
					value: 'SECRET',
				};

				const environmentsStore = useEnvironmentsStore();
				await environmentsStore.fetchAllVariables();

				await environmentsStore.updateVariable({
					...environmentsStore.variables[0],
					...updateValue,
				});

				expect(environmentsStore.variables[0]).toMatchObject(updateValue);
			});
		});

		describe('deleteVariable()', () => {
			it('should delete an existing variable', async () => {
				const environmentsStore = useEnvironmentsStore();
				await environmentsStore.fetchAllVariables();
				const recordsCount = environmentsStore.variables.length;

				await environmentsStore.deleteVariable(environmentsStore.variables[0]);

				expect(environmentsStore.variables).toHaveLength(recordsCount - 1);
			});
		});

		describe('variablesAsObject', () => {
			it('should return variables as a key-value object', async () => {
				const environmentsStore = useEnvironmentsStore();
				await environmentsStore.fetchAllVariables();
				const projectStore = useProjectsStore();
				projectStore.setCurrentProject({ id: '1', name: 'Project 1' } as Project);

				expect(environmentsStore.variablesAsObject).toEqual({
					ENV_VAR: 'SECRET',
					var2: 'value2',
					var3: 'value3',
				});
			});
		});
	});
});
