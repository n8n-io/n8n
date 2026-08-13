import { AuthenticatedRequest } from '@n8n/db';
import { Delete, Get, GlobalScope, Post, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { CaptureService } from './capture.service';
import type { WorkflowTest } from './database/entities/workflow-test.entity';
import { WorkflowTestRepository } from './database/repositories/workflow-test.repository';
import { WorkflowTestRunnerService } from './workflow-test-runner.service';
import type { WorkflowTestSummary } from './workflow-tests.types';

const toSummary = (t: WorkflowTest): WorkflowTestSummary => ({
	id: t.id,
	name: t.name,
	workflowId: t.workflowId,
	sourceExecutionId: t.sourceExecutionId,
	triggerNodeName: t.triggerNodeName,
	mockedNodeNames: Object.keys(t.fixtures),
	assertedNodeNames: t.expectations.map((e) => e.nodeName),
	createdAt: t.createdAt.toISOString(),
});

@RestController('/workflow-tests')
export class WorkflowTestsController {
	constructor(
		private readonly captureService: CaptureService,
		private readonly repository: WorkflowTestRepository,
		private readonly runnerService: WorkflowTestRunnerService,
	) {}

	@Post('/')
	@GlobalScope('workflow:execute')
	async create(
		req: AuthenticatedRequest<{}, {}, { executionId?: string; name?: string }>,
		res: Response,
	) {
		const { executionId, name } = req.body;
		if (!executionId) throw new BadRequestError('executionId is required');
		const { capture, workflowId } = await this.captureService.captureFromExecution(executionId);
		const test = await this.repository.save(
			this.repository.create({
				name: name ?? `Test from execution ${executionId}`,
				workflowId,
				sourceExecutionId: executionId,
				triggerNodeName: capture.triggerNodeName,
				fixtures: capture.fixtures,
				expectations: capture.expectations,
			}),
		);
		res.status(201);
		return toSummary(test);
	}

	@Get('/')
	@GlobalScope('workflow:read')
	async list(req: AuthenticatedRequest<{}, {}, {}, { workflowId?: string }>) {
		const { workflowId } = req.query;
		if (!workflowId) throw new BadRequestError('workflowId is required');
		const tests = await this.repository.find({
			where: { workflowId },
			order: { createdAt: 'DESC' },
		});
		return tests.map(toSummary);
	}

	@Post('/:id/run')
	@GlobalScope('workflow:execute')
	// `_res` is unused here but required: ControllerRegistry invokes handlers positionally
	// as `(req, res)` (see packages/cli/src/controller.registry.ts), so the parameter must
	// stay in place even though this handler doesn't touch it directly.
	async run(req: AuthenticatedRequest<{ id: string }>, _res: Response) {
		const test = await this.repository.findOneBy({ id: req.params.id });
		if (!test) throw new NotFoundError(`Test ${req.params.id} not found`);
		return await this.runnerService.runTest(test, req.user.id);
	}

	@Delete('/:id')
	@GlobalScope('workflow:execute')
	async remove(req: AuthenticatedRequest<{ id: string }>) {
		await this.repository.delete({ id: req.params.id });
		return { success: true };
	}
}
