import express from 'express';

import { Get, Post, Patch, RestController, Delete } from '@/decorators';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import {
	testDefinitionCreateRequestBodySchema,
	testDefinitionPatchRequestBodySchema,
} from '@/evaluation/test-definition.schema';
import { listQueryMiddleware } from '@/middlewares';
import { getSharedWorkflowIds } from '@/public-api/v1/handlers/workflows/workflows.service';
import { isPositiveInteger } from '@/utils';

import { TestDefinitionService } from './test-definition.service.ee';
import { TestDefinitionsRequest } from './test-definitions.types.ee';

@RestController('/evaluation/test-definitions')
export class TestDefinitionsController {
	private validateId(id: string) {
		if (!isPositiveInteger(id)) {
			throw new BadRequestError('Test ID is not a number');
		}

		return Number(id);
	}

	constructor(private readonly testDefinitionService: TestDefinitionService) {}

	@Get('/', { middlewares: listQueryMiddleware })
	async getMany(req: TestDefinitionsRequest.GetMany) {
		const userAccessibleWorkflowIds = await getSharedWorkflowIds(req.user, ['workflow:read']);

		return await this.testDefinitionService.getMany(
			req.listQueryOptions,
			userAccessibleWorkflowIds,
		);
	}

	@Get('/:id')
	async getOne(req: TestDefinitionsRequest.GetOne) {
		const testDefinitionId = this.validateId(req.params.id);

		const userAccessibleWorkflowIds = await getSharedWorkflowIds(req.user, ['workflow:read']);

		const testDefinition = await this.testDefinitionService.findOne(
			testDefinitionId,
			userAccessibleWorkflowIds,
		);

		if (!testDefinition) throw new NotFoundError('Test definition not found');

		return testDefinition;
	}

	@Post('/')
	async create(req: TestDefinitionsRequest.Create, res: express.Response) {
		const bodyParseResult = testDefinitionCreateRequestBodySchema.safeParse(req.body);
		if (!bodyParseResult.success) {
			res.status(400).json({ errors: bodyParseResult.error.errors });
			return;
		}

		const userAccessibleWorkflowIds = await getSharedWorkflowIds(req.user, ['workflow:read']);

		if (!userAccessibleWorkflowIds.includes(req.body.workflowId)) {
			throw new ForbiddenError('User does not have access to the workflow');
		}

		if (
			req.body.evaluationWorkflowId &&
			!userAccessibleWorkflowIds.includes(req.body.evaluationWorkflowId)
		) {
			throw new ForbiddenError('User does not have access to the evaluation workflow');
		}

		return await this.testDefinitionService.save(
			this.testDefinitionService.toEntity(bodyParseResult.data),
		);
	}

	@Delete('/:id')
	async delete(req: TestDefinitionsRequest.Delete) {
		const testDefinitionId = this.validateId(req.params.id);

		const userAccessibleWorkflowIds = await getSharedWorkflowIds(req.user, ['workflow:read']);

		if (userAccessibleWorkflowIds.length === 0)
			throw new ForbiddenError('User does not have access to any workflows');

		await this.testDefinitionService.delete(testDefinitionId, userAccessibleWorkflowIds);

		return { success: true };
	}

	@Patch('/:id')
	async patch(req: TestDefinitionsRequest.Patch, res: express.Response) {
		const testDefinitionId = this.validateId(req.params.id);

		const bodyParseResult = testDefinitionPatchRequestBodySchema.safeParse(req.body);
		if (!bodyParseResult.success) {
			res.status(400).json({ errors: bodyParseResult.error.errors });
			return;
		}

		const userAccessibleWorkflowIds = await getSharedWorkflowIds(req.user, ['workflow:read']);

		// Fail fast if no workflows are accessible
		if (userAccessibleWorkflowIds.length === 0)
			throw new ForbiddenError('User does not have access to any workflows');

		const existingTest = await this.testDefinitionService.findOne(
			testDefinitionId,
			userAccessibleWorkflowIds,
		);
		if (!existingTest) throw new NotFoundError('Test definition not found');

		if (
			req.body.evaluationWorkflowId &&
			!userAccessibleWorkflowIds.includes(req.body.evaluationWorkflowId)
		) {
			throw new ForbiddenError('User does not have access to the evaluation workflow');
		}

		return await this.testDefinitionService.update(
			testDefinitionId,
			req.body,
			userAccessibleWorkflowIds,
		);
	}
}
