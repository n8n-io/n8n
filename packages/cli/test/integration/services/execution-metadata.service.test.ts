import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { ExecutionMetadataRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { ExecutionMetadataService } from '@/services/execution-metadata.service';
import { createExecution } from '@test-integration/db/executions';

let executionMetadataRepository: ExecutionMetadataRepository;
let executionMetadataService: ExecutionMetadataService;

beforeAll(async () => {
	await testDb.init();

	executionMetadataRepository = Container.get(ExecutionMetadataRepository);
	executionMetadataService = Container.get(ExecutionMetadataService);
});

afterAll(async () => {
	await testDb.terminate();
});

afterEach(async () => {
	await testDb.truncate(['User']);
});

describe('ProjectService', () => {
	describe('save', () => {
		it('should deduplicate entries by exeuctionId and key, keeping the latest one', async () => {
			//
			// ARRANGE
			//
			const workflow = await createWorkflow();
			const execution = await createExecution({}, workflow);
			const key = 'key';
			const value1 = 'value1';
			const value2 = 'value2';

			//
			// ACT
			//
			await executionMetadataService.save(execution.id, { [key]: value1 });
			await executionMetadataService.save(execution.id, { [key]: value2 });

			//
			// ASSERT
			//
			const rows = await executionMetadataRepository.find({
				where: { executionId: execution.id, key },
			});

			expect(rows).toHaveLength(1);
			expect(rows[0]).toHaveProperty('value', value2);
		});
	});
});
