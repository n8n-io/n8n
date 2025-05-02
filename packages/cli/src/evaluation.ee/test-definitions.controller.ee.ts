import { Get, Post, Patch, RestController, Delete } from '@n8n/decorators';
import express from 'express';
import assert from 'node:assert';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import {
	testDefinitionCreateRequestBodySchema,
	testDefinitionPatchRequestBodySchema,
} from '@/evaluation.ee/test-definition.schema';
import { TestRunnerService } from '@/evaluation.ee/test-runner/test-runner.service.ee';
import { listQueryMiddleware } from '@/middlewares';
import { getSharedWorkflowIds } from '@/public-api/v1/handlers/workflows/workflows.service';

import { TestDefinitionService } from './test-definition.service.ee';
import { TestDefinitionsRequest } from './test-definitions.types.ee';

@RestController('/evaluation/test-definitions')
export class TestDefinitionsController {
	constructor(
		private readonly testDefinitionService: TestDefinitionService,
		private readonly testRunnerService: TestRunnerService,
	) {}

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
		const { id: testDefinitionId } = req.params;

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
		const { id: testDefinitionId } = req.params;

		const userAccessibleWorkflowIds = await getSharedWorkflowIds(req.user, ['workflow:read']);

		if (userAccessibleWorkflowIds.length === 0)
			throw new ForbiddenError('User does not have access to any workflows');

		await this.testDefinitionService.delete(testDefinitionId, userAccessibleWorkflowIds);

		return { success: true };
	}

	@Patch('/:id')
	async patch(req: TestDefinitionsRequest.Patch, res: express.Response) {
		const { id: testDefinitionId } = req.params;

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

		await this.testDefinitionService.update(testDefinitionId, req.body);

		// Respond with the updated test definition
		const testDefinition = await this.testDefinitionService.findOne(
			testDefinitionId,
			userAccessibleWorkflowIds,
		);

		assert(testDefinition, 'Test definition not found');

		return testDefinition;
	}

	@Post('/:id/run')
	async runTest(req: TestDefinitionsRequest.Run, res: express.Response) {
		const { id: testDefinitionId } = req.params;

		const workflowIds = await getSharedWorkflowIds(req.user, ['workflow:read']);

		// Check test definition exists
		const testDefinition = await this.testDefinitionService.findOne(testDefinitionId, workflowIds);
		if (!testDefinition) throw new NotFoundError('Test definition not found');

		// We do not await for the test run to complete
		void this.testRunnerService.runTest(req.user, testDefinition);

		res.status(202).json({ success: true });
	}

	@Get('/:id/example-evaluation-input')
	async exampleEvaluationInput(req: TestDefinitionsRequest.ExampleEvaluationInput) {
		const { id: testDefinitionId } = req.params;
		const { annotationTagId } = req.query;

		const workflowIds = await getSharedWorkflowIds(req.user, ['workflow:read']);

		const testDefinition = await this.testDefinitionService.findOne(testDefinitionId, workflowIds);
		if (!testDefinition) throw new NotFoundError('Test definition not found');

		return await this.testRunnerService.getExampleEvaluationInputData(
			testDefinition,
			annotationTagId,
		);
	}
}
