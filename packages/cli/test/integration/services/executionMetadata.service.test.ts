import * as testDb from '../shared/testDb';
import Container from 'typedi';
import { ExecutionMetadataRepository } from '@/databases/repositories/executionMetadata.repository';
import { ExecutionMetadataService } from '@/services/executionMetadata.service';
import { createExecution } from '@test-integration/db/executions';
import { createWorkflow } from '@test-integration/db/workflows';

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
