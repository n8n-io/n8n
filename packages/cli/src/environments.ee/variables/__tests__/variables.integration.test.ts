import { createTeamProject, testDb } from '@n8n/backend-test-utils';
import { VariablesRepository } from '@n8n/db';
import { Container } from '@n8n/di';

let variablesRepository: VariablesRepository;

beforeAll(async () => {
	await testDb.init();
	variablesRepository = Container.get(VariablesRepository);
});

beforeEach(async () => {
	await variablesRepository.delete({});
});

afterAll(async () => {
	await testDb.terminate();
});

describe('Variable entity', () => {
	test('can create multiple variables with the same key in different scopes', async () => {
		// ARRANGE
		const project = await createTeamProject();

		// Create a global variable
		const variable1 = variablesRepository.create({
			key: 'test',
			value: 'value1',
			type: 'string',
		});

		// Create a project variable with the same key
		const variable2 = variablesRepository.create({
			key: 'test',
			value: 'value2',
			type: 'string',
			project: {
				id: project.id,
			},
		});

		await variablesRepository.save(variable1);
		await variablesRepository.save(variable2);
	});

	test('cannot create multiple variables with the same key in the same project', async () => {
		// ARRANGE
		const project = await createTeamProject();

		// Create a project variable
		const variable1 = variablesRepository.create({
			key: 'test',
			value: 'value1',
			type: 'string',
			project: {
				id: project.id,
			},
		});

		// Create another project variable with the same key
		const variable2 = variablesRepository.create({
			key: 'test',
			value: 'value2',
			type: 'string',
			project: {
				id: project.id,
			},
		});

		// ACT
		await variablesRepository.save(variable1);
		await expect(variablesRepository.save(variable2)).rejects.toThrow();
	});

	test('cannot create multiple global variables with the same key', async () => {
		// Create a global variable
		const variable1 = variablesRepository.create({
			key: 'test',
			value: 'value1',
			type: 'string',
		});

		// Create another global variable with the same key
		const variable2 = variablesRepository.create({
			key: 'test',
			value: 'value2',
			type: 'string',
		});

		// ACT
		await variablesRepository.save(variable1);
		await expect(variablesRepository.save(variable2)).rejects.toThrow();
	});
});
