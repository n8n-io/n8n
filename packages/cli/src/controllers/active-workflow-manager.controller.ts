import { RefreshActiveWorkflowRequestDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { WorkflowRepository } from '@n8n/db';
import { Body, Post, RestController } from '@n8n/decorators';
import type { Request, Response } from 'express';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { UnauthenticatedError } from '@/errors/response-errors/unauthenticated.error';

const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

@RestController('/internal/active-workflow-manager')
export class ActiveWorkflowManagerController {
	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly activeWorkflowManager: ActiveWorkflowManager,
		private readonly workflowRepository: WorkflowRepository,
	) {
		this.logger = logger.scoped('workflow-activation');
	}

	@Post('/refresh', { skipAuth: true })
	async refresh(
		req: Request,
		_res: Response,
		@Body payload: RefreshActiveWorkflowRequestDto,
	): Promise<{ applied: 'removed' | 'noop' }> {
		const remoteAddress = req.socket.remoteAddress;
		if (!remoteAddress || !LOOPBACK_ADDRESSES.has(remoteAddress)) {
			throw new UnauthenticatedError('Internal endpoint only accessible from loopback');
		}

		const { workflowId } = payload;

		const workflow = await this.workflowRepository.findOne({
			where: { id: workflowId },
			select: ['id', 'activeVersionId'],
		});

		if (workflow && workflow.activeVersionId !== null) {
			this.logger.debug(
				`Refresh for workflow "${workflowId}" skipped: workflow is still active in DB`,
			);
			return { applied: 'noop' };
		}

		await this.activeWorkflowManager.remove(workflowId);
		this.logger.info(`Refreshed in-memory activation for workflow "${workflowId}"`);
		return { applied: 'removed' };
	}
}
