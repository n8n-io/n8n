import { afterAll, beforeAll } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { setupServer } from '@/__tests__/server';
import { useEnvironmentsStore } from '@/stores/environments.ee';
import type { EnvironmentVariable } from '@/Interface';

describe('store', () => {
	let server: ReturnType<typeof setupServer>;
	const seedRecordsCount = 3;

	beforeAll(() => {
		server = setupServer();
		server.createList('variable', seedRecordsCount);
	});

	beforeEach(() => {
		setActivePinia(createPinia());
	});

	afterAll(() => {
		server.shutdown();
	});

	describe('variables', () => {
		describe('fetchAllVariables()', () => {
			it('should fetch all credentials', async () => {
				const environmentsStore = useEnvironmentsStore();
				await environmentsStore.fetchAllVariables();

				expect(environmentsStore.variables).toHaveLength(seedRecordsCount);
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

				expect(environmentsStore.variablesAsObject).toEqual(
					environmentsStore.variables.reduce<Record<string, string>>((acc, variable) => {
						acc[variable.key] = variable.value;
						return acc;
					}, {}),
				);
			});
		});
	});
});
