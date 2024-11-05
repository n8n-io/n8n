import { Get, Post, Patch, RestController, Delete } from '@/decorators';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { listQueryMiddleware } from '@/middlewares';
import { getSharedWorkflowIds } from '@/public-api/v1/handlers/workflows/workflows.service';
import { isPositiveInteger } from '@/utils';

import { TestsService } from './tests.service';
import { TestsRequest } from './tests.types';

@RestController('/evaluation/tests')
export class TestsController {
	constructor(private readonly testsService: TestsService) {}

	@Get('/', { middlewares: listQueryMiddleware })
	async getMany(req: TestsRequest.GetMany) {
		const workflowIds = await getSharedWorkflowIds(req.user, ['workflow:read']);

		return await this.testsService.getMany(req.user, req.listQueryOptions, workflowIds);
	}

	@Get('/:id')
	async getOne(req: TestsRequest.GetOne) {
		if (!isPositiveInteger(req.params.id)) {
			throw new BadRequestError('Test ID is not a number');
		}

		const workflowIds = await getSharedWorkflowIds(req.user, ['workflow:read']);

		return await this.testsService.findOne(Number(req.params.id), workflowIds);
	}

	@Post('/')
	async create(req: TestsRequest.Create) {
		const workflowIds = await getSharedWorkflowIds(req.user, ['workflow:read']);

		if (!workflowIds.includes(req.body.workflowId)) {
			throw new BadRequestError('User does not have access to the workflow');
		}

		return await this.testsService.save(this.testsService.toEntity(req.body));
	}

	@Delete('/:id')
	async delete(req: TestsRequest.Delete) {
		if (!isPositiveInteger(req.params.id)) {
			throw new BadRequestError('Test ID is not a number');
		}

		const workflowIds = await getSharedWorkflowIds(req.user, ['workflow:read']);

		if (workflowIds.length === 0) throw new NotFoundError('Test not found');

		return await this.testsService.delete(Number(req.params.id), workflowIds);
	}

	@Patch('/:id')
	async update(req: TestsRequest.Update) {
		if (!isPositiveInteger(req.params.id)) {
			throw new BadRequestError('Test ID is not a number');
		}

		const workflowIds = await getSharedWorkflowIds(req.user, ['workflow:read']);

		// Fail fast if no workflows are accessible
		if (workflowIds.length === 0) throw new NotFoundError('Workflow not found');

		return await this.testsService.save(
			this.testsService.toEntity({ ...req.body, id: Number(req.params.id) }),
		);
	}
}
