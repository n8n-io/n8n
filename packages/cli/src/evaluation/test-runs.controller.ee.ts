import { TestRunRepository } from '@/databases/repositories/test-run.repository.ee';
import { Delete, Get, RestController } from '@/decorators';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { TestRunsRequest } from '@/evaluation/test-definitions.types.ee';
import { listQueryMiddleware } from '@/middlewares';
import { getSharedWorkflowIds } from '@/public-api/v1/handlers/workflows/workflows.service';

import { TestDefinitionService } from './test-definition.service.ee';

@RestController('/evaluation/test-definitions')
export class TestRunsController {
	constructor(
		private readonly testDefinitionService: TestDefinitionService,
		private readonly testRunRepository: TestRunRepository,
	) {}

	/** This method is used in multiple places in the controller to get the test definition
	 * (or just check that it exists and the user has access to it).
	 */
	private async getTestDefinition(
		req: TestRunsRequest.GetOne | TestRunsRequest.GetMany | TestRunsRequest.Delete,
	) {
		const { testDefinitionId } = req.params;

		const userAccessibleWorkflowIds = await getSharedWorkflowIds(req.user, ['workflow:read']);

		const testDefinition = await this.testDefinitionService.findOne(
			testDefinitionId,
			userAccessibleWorkflowIds,
		);

		if (!testDefinition) throw new NotFoundError('Test definition not found');

		return testDefinition;
	}

	@Get('/:testDefinitionId/runs', { middlewares: listQueryMiddleware })
	async getMany(req: TestRunsRequest.GetMany) {
		const { testDefinitionId } = req.params;

		await this.getTestDefinition(req);

		return await this.testRunRepository.getMany(testDefinitionId, req.listQueryOptions);
	}

	@Get('/:testDefinitionId/runs/:id')
	async getOne(req: TestRunsRequest.GetOne) {
		const { id: testRunId, testDefinitionId } = req.params;

		await this.getTestDefinition(req);

		const testRun = await this.testRunRepository.findOne({
			where: { id: testRunId, testDefinition: { id: testDefinitionId } },
		});

		if (!testRun) throw new NotFoundError('Test run not found');

		return testRun;
	}

	@Delete('/:testDefinitionId/runs/:id')
	async delete(req: TestRunsRequest.Delete) {
		const { id: testRunId, testDefinitionId } = req.params;

		await this.getTestDefinition(req);

		const testRun = await this.testRunRepository.findOne({
			where: { id: testRunId, testDefinition: { id: testDefinitionId } },
		});

		if (!testRun) throw new NotFoundError('Test run not found');

		await this.testRunRepository.delete({ id: testRunId });

		return { success: true };
	}
}
