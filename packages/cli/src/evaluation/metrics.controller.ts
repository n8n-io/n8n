import express from 'express';

import { TestMetricRepository } from '@/databases/repositories/test-metric.repository.ee';
import { Delete, Get, Patch, Post, RestController } from '@/decorators';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import {
	testMetricCreateRequestBodySchema,
	testMetricPatchRequestBodySchema,
} from '@/evaluation/metric.schema';
import { getSharedWorkflowIds } from '@/public-api/v1/handlers/workflows/workflows.service';

import { TestDefinitionService } from './test-definition.service.ee';
import { TestMetricsRequest } from './test-definitions.types.ee';

@RestController('/evaluation/test-definitions')
export class TestMetricsController {
	constructor(
		private readonly testDefinitionService: TestDefinitionService,
		private readonly testMetricRepository: TestMetricRepository,
	) {}

	// This method is used in multiple places in the controller to get the test definition
	// (or just check that it exists and the user has access to it).
	private async getTestDefinition(
		req:
			| TestMetricsRequest.GetOne
			| TestMetricsRequest.GetMany
			| TestMetricsRequest.Patch
			| TestMetricsRequest.Delete
			| TestMetricsRequest.Create,
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

	@Get('/:testDefinitionId/metrics')
	async getMany(req: TestMetricsRequest.GetMany) {
		const { testDefinitionId } = req.params;

		await this.getTestDefinition(req);

		return await this.testMetricRepository.find({
			where: { testDefinition: { id: testDefinitionId } },
		});
	}

	@Get('/:testDefinitionId/metrics/:id')
	async getOne(req: TestMetricsRequest.GetOne) {
		const { id: metricId, testDefinitionId } = req.params;

		await this.getTestDefinition(req);

		const metric = await this.testMetricRepository.findOne({
			where: { id: metricId, testDefinition: { id: testDefinitionId } },
		});

		if (!metric) throw new NotFoundError('Metric not found');

		return metric;
	}

	@Post('/:testDefinitionId/metrics')
	async create(req: TestMetricsRequest.Create, res: express.Response) {
		const bodyParseResult = testMetricCreateRequestBodySchema.safeParse(req.body);
		if (!bodyParseResult.success) {
			res.status(400).json({ errors: bodyParseResult.error.errors });
			return;
		}

		const testDefinition = await this.getTestDefinition(req);

		const metric = this.testMetricRepository.create({
			...req.body,
			testDefinition,
		});

		return await this.testMetricRepository.save(metric);
	}

	@Patch('/:testDefinitionId/metrics/:id')
	async patch(req: TestMetricsRequest.Patch, res: express.Response) {
		const { id: metricId, testDefinitionId } = req.params;

		const bodyParseResult = testMetricPatchRequestBodySchema.safeParse(req.body);
		if (!bodyParseResult.success) {
			res.status(400).json({ errors: bodyParseResult.error.errors });
			return;
		}

		await this.getTestDefinition(req);

		const metric = await this.testMetricRepository.findOne({
			where: { id: metricId, testDefinition: { id: testDefinitionId } },
		});

		if (!metric) throw new NotFoundError('Metric not found');

		await this.testMetricRepository.update(metricId, bodyParseResult.data);

		// Respond with the updated metric
		return await this.testMetricRepository.findOneBy({ id: metricId });
	}

	@Delete('/:testDefinitionId/metrics/:id')
	async delete(req: TestMetricsRequest.GetOne) {
		const { id: metricId, testDefinitionId } = req.params;

		await this.getTestDefinition(req);

		const metric = await this.testMetricRepository.findOne({
			where: { id: metricId, testDefinition: { id: testDefinitionId } },
		});

		if (!metric) throw new NotFoundError('Metric not found');

		await this.testMetricRepository.delete(metricId);

		return { success: true };
	}
}
