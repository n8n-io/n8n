import { Authorized, RestController, Get, Middleware } from '@/decorators';
import { WorkflowHistoryRequest } from '@/requests';
import { Service } from 'typedi';
import {
	HistoryVersionNotFoundError,
	SharedWorkflowNotFoundError,
	WorkflowHistoryService,
} from './workflowHistory.service.ee';
import { Request, Response, NextFunction } from 'express';
import { isWorkflowHistoryEnabled, isWorkflowHistoryLicensed } from './workflowHistoryHelper.ee';
import { NotFoundError } from '@/ResponseHelper';

const DEFAULT_TAKE = 20;

@Service()
@Authorized()
@RestController('/workflow-history')
export class WorkflowHistoryController {
	constructor(private readonly historyService: WorkflowHistoryService) {}

	@Middleware()
	workflowHistoryLicenseMiddleware(_req: Request, res: Response, next: NextFunction) {
		if (!isWorkflowHistoryLicensed()) {
			res.status(400);
			res.send('Workflow History license data not found');
			return;
		}
		next();
	}

	@Middleware()
	workflowHistoryEnabledMiddleware(_req: Request, res: Response, next: NextFunction) {
		if (!isWorkflowHistoryEnabled()) {
			res.status(400);
			res.send('Workflow History is disabled');
			return;
		}
		next();
	}

	@Get('/workflow/:workflowId')
	async getList(req: WorkflowHistoryRequest.GetList) {
		try {
			return await this.historyService.getList(
				req.user,
				req.params.workflowId,
				Math.min(req.query.take ?? DEFAULT_TAKE, DEFAULT_TAKE),
				req.query.skip ?? 0,
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
			} else if (e instanceof HistoryVersionNotFoundError) {
				throw new NotFoundError('Could not find version');
			}
			throw e;
		}
	}
}
