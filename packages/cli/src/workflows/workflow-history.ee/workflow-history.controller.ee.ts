import { PaginationDto } from '@n8n/api-types';
import { RestController, Get, Middleware, Query } from '@n8n/decorators';
import { Request, Response, NextFunction } from 'express';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { SharedWorkflowNotFoundError } from '@/errors/shared-workflow-not-found.error';
import { WorkflowHistoryVersionNotFoundError } from '@/errors/workflow-history-version-not-found.error';
import { WorkflowHistoryRequest } from '@/requests';

import { isWorkflowHistoryEnabled, isWorkflowHistoryLicensed } from './workflow-history-helper.ee';
import { WorkflowHistoryService } from './workflow-history.service.ee';

const DEFAULT_TAKE = 20;

@RestController('/workflow-history')
export class WorkflowHistoryController {
	constructor(private readonly historyService: WorkflowHistoryService) {}

	@Middleware()
	workflowHistoryLicense(_req: Request, res: Response, next: NextFunction) {
		if (!isWorkflowHistoryLicensed()) {
			res.status(403);
			res.send('Workflow History license data not found');
			return;
		}
		next();
	}

	@Middleware()
	workflowHistoryEnabled(_req: Request, res: Response, next: NextFunction) {
		if (!isWorkflowHistoryEnabled()) {
			res.status(403);
			res.send('Workflow History is disabled');
			return;
		}
		next();
	}

	@Get('/workflow/:workflowId')
	async getList(req: WorkflowHistoryRequest.GetList, _res: Response, @Query query: PaginationDto) {
		try {
			return await this.historyService.getList(
				req.user,
				req.params.workflowId,
				query.take ?? DEFAULT_TAKE,
				query.skip ?? 0,
			);
		} catch (e) {
			if (e instanceof SharedWorkflowNotFoundError) {
				throw new NotFoundError('Could not find workflow');
			}
			throw e;
		}
	}

	@Get('/workflow/:workflowId/version/:versionId')
	async getVersion(req: WorkflowHistoryRequest.GetVersion) {
		try {
			return await this.historyService.getVersion(
				req.user,
				req.params.workflowId,
				req.params.versionId,
			);
		} catch (e) {
			if (e instanceof SharedWorkflowNotFoundError) {
				throw new NotFoundError('Could not find workflow');
			} else if (e instanceof WorkflowHistoryVersionNotFoundError) {
				throw new NotFoundError('Could not find version');
			}
			throw e;
		}
	}
}
