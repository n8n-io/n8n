import {
	PaginationDto,
	WorkflowHistoryVersionsByIdsDto,
	UpdateWorkflowHistoryVersionDto,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { RestController, Get, Post, Query, Body, Patch, Param, Licensed } from '@n8n/decorators';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { SharedWorkflowNotFoundError } from '@/errors/shared-workflow-not-found.error';
import { WorkflowHistoryVersionNotFoundError } from '@/errors/workflow-history-version-not-found.error';
import { WorkflowHistoryRequest } from '@/requests';

import { WorkflowHistoryService } from './workflow-history.service';

const DEFAULT_TAKE = 20;

@RestController('/workflow-history')
export class WorkflowHistoryController {
	constructor(private readonly historyService: WorkflowHistoryService) {}

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

	@Post('/workflow/:workflowId/versions')
	async getVersionsByIds(
		req: WorkflowHistoryRequest.GetList,
		_res: Response,
		@Body body: WorkflowHistoryVersionsByIdsDto,
	) {
		try {
			const versions = await this.historyService.getVersionsByIds(
				req.user,
				req.params.workflowId,
				body.versionIds,
			);
			return { versions };
		} catch (e) {
			if (e instanceof SharedWorkflowNotFoundError) {
				throw new NotFoundError('Could not find workflow');
			}
			throw e;
		}
	}

	@Licensed('feat:namedVersions')
	@Patch('/workflow/:workflowId/versions/:versionId')
	async updateVersion(
		req: AuthenticatedRequest<{ workflowId: string; versionId: string }>,
		_res: Response,
		@Param('workflowId') workflowId: string,
		@Param('versionId') versionId: string,
		@Body body: UpdateWorkflowHistoryVersionDto,
	) {
		try {
			return await this.historyService.updateVersionForUser(req.user, workflowId, versionId, body);
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
