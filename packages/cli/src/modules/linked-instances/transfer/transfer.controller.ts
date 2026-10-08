import {
	LinkedInstancePullRequestDto,
	LinkedInstanceTransferPreflightRequestDto,
	LinkedInstanceTransferRequestDto,
	type LinkedInstancePullResult,
	type LinkedInstancePushResult,
	type LinkedInstanceTransferPreflight,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, GlobalScope, Param, Post, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { remoteCallRateLimit } from '../remote-call-rate-limit';
import { TransferPreflightService } from './transfer-preflight.service';
import { TransferService } from './transfer.service';

/** The editor tab of the request, so that its own write lock does not block the turn-off. */
function clientIdOf(req: AuthenticatedRequest): string | undefined {
	const header = req.headers['push-ref'];
	return typeof header === 'string' && header !== '' ? header : undefined;
}

/**
 * Moves workflows between this instance and the user's own linked instances. The services check
 * the rights on each workflow and project, because the ids are in the body.
 */
@RestController('/linked-instances')
export class LinkedInstanceTransferController {
	constructor(
		private readonly preflightService: TransferPreflightService,
		private readonly transferService: TransferService,
	) {}

	@Post('/:id/transfer/preflight', { keyedRateLimit: remoteCallRateLimit() })
	@GlobalScope('instanceAi:message')
	async preflight(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Body payload: LinkedInstanceTransferPreflightRequestDto,
	): Promise<LinkedInstanceTransferPreflight> {
		return await this.preflightService.preflight(req.user, id, payload.workflowId);
	}

	@Post('/:id/transfer', { keyedRateLimit: remoteCallRateLimit() })
	@GlobalScope('instanceAi:message')
	async push(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Body payload: LinkedInstanceTransferRequestDto,
	): Promise<LinkedInstancePushResult> {
		const { workflowId, publish, deactivateLocal } = payload;
		return await this.transferService.push(
			req.user,
			id,
			{ workflowId, publish, deactivateLocal },
			{ clientId: clientIdOf(req) },
		);
	}

	@Post('/:id/pull', { keyedRateLimit: remoteCallRateLimit() })
	@GlobalScope('instanceAi:message')
	async pull(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Body payload: LinkedInstancePullRequestDto,
	): Promise<LinkedInstancePullResult> {
		const { remoteWorkflowId, projectId } = payload;
		return await this.transferService.pull(req.user, id, { remoteWorkflowId, projectId });
	}
}
