import { Z } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Param, Post, ProjectScope, RestController } from '@n8n/decorators';
import type { Response } from 'express';
import { z } from 'zod';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { ConnectionContext, InsertionPoint, WorkflowJson } from './session/session.types';
import type { ProposeResumePayload } from './tools/propose-nodes.tool';
import { WorkflowBuilderV2Service } from './workflow-builder-v2.service';

class StartSessionDto extends Z.class({
	prompt: z.string().min(1),
	workflowJson: z.unknown().optional(),
	insertionPoint: z
		.discriminatedUnion('kind', [
			z.object({ kind: z.literal('fromStart') }),
			z.object({ kind: z.literal('after'), afterNodeId: z.string().min(1) }),
		])
		.optional(),
	connectionContext: z
		.object({
			nodeId: z.string().min(1),
			mode: z.enum(['inputs', 'outputs']),
			type: z.string().min(1),
			index: z.number().int().min(0),
			targetNodeId: z.string().min(1).optional(),
			targetType: z.string().min(1).optional(),
			targetIndex: z.number().int().min(0).optional(),
		})
		.optional(),
}) {}

class ConfirmDto extends Z.class({
	kind: z.enum(['pick', 'reject']),
	chosenIndex: z.number().int().min(0).optional(),
	/**
	 * For `kind: 'pick'`, the FE-rendered on-canvas position of the picked
	 * ghost. Passed through to the agent run state so `commit_node` places
	 * the committed node at exactly the same coords. Optional — when absent,
	 * the agent falls back to its own position computation.
	 */
	pickedPosition: z.tuple([z.number(), z.number()]).optional(),
}) {}

@RestController('/projects/:projectId/builder-v2')
export class WorkflowBuilderV2Controller {
	constructor(
		private readonly service: WorkflowBuilderV2Service,
		private readonly logger: Logger,
	) {}

	@Post('/sessions')
	@ProjectScope('workflow:update')
	async start(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Body payload: StartSessionDto,
	) {
		const workflowJson = this.normalizeWorkflow(payload.workflowJson);

		return await this.service.startSession({
			projectId: req.params.projectId,
			prompt: payload.prompt,
			workflowJson,
			requestedInsertionPoint: payload.insertionPoint as InsertionPoint | undefined,
			connectionContext: payload.connectionContext as ConnectionContext | undefined,
			user: req.user,
		});
	}

	@Post('/sessions/:id/confirm')
	@ProjectScope('workflow:update')
	async confirm(
		req: AuthenticatedRequest<{ projectId: string; id: string }>,
		_res: Response,
		@Param('id') sessionId: string,
		@Body payload: ConfirmDto,
	) {
		this.logger.debug('[builder-v2] confirm endpoint', {
			sessionId,
			kind: payload.kind,
			hasPickedPosition: payload.kind === 'pick' && payload.pickedPosition !== undefined,
		});
		const resume = this.parseResume(payload);
		try {
			await this.service.confirm({
				sessionId,
				resume,
				user: req.user,
				pickedPosition: payload.kind === 'pick' ? payload.pickedPosition : undefined,
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			if (message.toLowerCase().includes('not found')) {
				throw new NotFoundError(message);
			}
			throw new BadRequestError(message);
		}
		return { ok: true };
	}

	@Get('/sessions/:id/state')
	@ProjectScope('workflow:update')
	async state(
		_req: AuthenticatedRequest<{ projectId: string; id: string }>,
		_res: Response,
		@Param('id') sessionId: string,
	) {
		try {
			return this.service.getState(sessionId);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new NotFoundError(message);
		}
	}

	private normalizeWorkflow(raw: unknown): WorkflowJson {
		if (!raw || typeof raw !== 'object') {
			return { nodes: [], connections: {} };
		}
		const obj = raw as Record<string, unknown>;
		const nodes = Array.isArray(obj.nodes) ? (obj.nodes as WorkflowJson['nodes']) : [];
		const connections =
			obj.connections && typeof obj.connections === 'object' && !Array.isArray(obj.connections)
				? (obj.connections as WorkflowJson['connections'])
				: {};
		return { ...obj, nodes, connections };
	}

	private parseResume(payload: ConfirmDto): ProposeResumePayload {
		if (payload.kind === 'pick') {
			const idx = payload.chosenIndex;
			if (typeof idx !== 'number' || !Number.isInteger(idx) || idx < 0) {
				throw new BadRequestError('chosenIndex (non-negative integer) is required for kind=pick');
			}
			return { kind: 'pick', chosenIndex: idx };
		}
		return { kind: 'reject' };
	}
}
