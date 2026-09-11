import { testDb } from '@n8n/backend-test-utils';
import { generateNanoId, VariablesRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { SourceControlImportService } from '@/modules/source-control.ee/source-control-import.service.ee';

import { createVariable } from '../shared/db/variables';

describe('SourceControlImportService.importVariables()', () => {
	let service: SourceControlImportService;
	let variablesRepository: VariablesRepository;

	beforeAll(async () => {
		await testDb.init();

		service = Container.get(SourceControlImportService);
		variablesRepository = Container.get(VariablesRepository);
	});

	afterEach(async () => {
		await testDb.truncate(['Variables']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('creates a brand-new variable with an empty value, not NULL', async () => {
		/**
		 * Arrange
		 *
		 * A remote stub never carries the real value (source control never syncs
		 * values), and this key has no matching local row, e.g. after a push
		 * followed by a local delete.
		 */
		const id = generateNanoId();

		/**
		 * Act
		 */
		await service.importVariables([{ id, key: 'NEW_VAR', type: 'string', value: '' }]);

		/**
		 * Assert
		 */
		const variable = await variablesRepository.findOneByOrFail({ id });
		expect(variable.value).toBe('');
	});

	it('does not overwrite an existing variable value with an empty remote stub', async () => {
		/**
		 * Arrange
		 */
		const existing = await createVariable('EXISTING_VAR', 'keep-me');

		/**
		 * Act
		 */
		await service.importVariables([
			{ id: existing.id, key: existing.key, type: existing.type, value: '' },
		]);

		/**
		 * Assert
		 */
		const variable = await variablesRepository.findOneByOrFail({ id: existing.id });
		expect(variable.value).toBe('keep-me');
	});
});
