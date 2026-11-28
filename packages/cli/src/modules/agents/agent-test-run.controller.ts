import {
	AgentTestRunResetDto,
	agentTestRunCommitRequestSchema,
	type AgentTestRunCommitResponse,
	type AgentTestRunResetResponse,
	type AgentTestRunToolsResponse,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Publisher } from '@n8n/backend-services';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Param, Post, ProjectScope, RestController } from '@n8n/decorators';
import { BadRequestError } from '@n8n/errors';
import type { Response } from 'express';

import { HeldActionCommitService } from './simulation/held-action-commit.service';
import { SafeTestingFlagGate } from './simulation/safe-testing-flag-gate';
import { SimulationSessionService } from './simulation/simulation-session.service';

/** Safe testing routes. Each route returns 404 while the safe testing flag is off. */
@RestController('/projects/:projectId/agents/v2')
export class AgentTestRunController {
	constructor(
		private readonly flagGate: SafeTestingFlagGate,
		private readonly simulationSessions: SimulationSessionService,
		private readonly heldActionCommit: HeldActionCommitService,
		private readonly publisher: Publisher,
		private readonly logger: Logger,
	) {}

	/** Which of the agent's tools can run in a test run, before the run starts. */
	@Get('/:agentId/test-run/tools')
	@ProjectScope('agent:read')
	async listTestRunTools(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('projectId') projectId: string,
		@Param('agentId') agentId: string,
	): Promise<AgentTestRunToolsResponse> {
		await this.flagGate.assertEnabled(req.user);
		return { tools: await this.simulationSessions.describeTools(agentId, projectId) };
	}

	/** Replays held write actions from a test run once against the agent's real tools. */
	@Post('/:agentId/test-run/commit')
	@ProjectScope('agent:execute')
	async commitHeldActions(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('projectId') projectId: string,
		@Param('agentId') agentId: string,
		@Body payload: unknown,
	): Promise<AgentTestRunCommitResponse> {
		await this.flagGate.assertEnabled(req.user);
		const parsed = agentTestRunCommitRequestSchema.safeParse(payload);
		if (!parsed.success) {
			throw new BadRequestError(
				parsed.error.issues[0]?.message ?? 'Invalid commit held actions request.',
			);
		}
		return await this.heldActionCommit.commitHeldActions({
			agentId,
			projectId,
			user: req.user,
			...parsed.data,
		});
	}

	/** Closes the current test chat's simulated world so the next run starts fresh. */
	@Post('/:agentId/test-run/reset')
	@ProjectScope('agent:execute')
	async resetTestRun(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('projectId') projectId: string,
		@Param('agentId') agentId: string,
		@Body payload: AgentTestRunResetDto,
	): Promise<AgentTestRunResetResponse> {
		await this.flagGate.assertEnabled(req.user);
		// A world belongs to the chat of the run. No run uses a thread that the server could guess.
		const chat = { userId: req.user.id, projectId, agentId, testChatId: payload.sessionId };
		this.simulationSessions.resetForTestChat(chat);
		// Any main can run the chat's next turn, so each one drops its world. A no-op outside queue mode.
		try {
			await this.publisher.publishCommand({ command: 'reset-agent-test-run', payload: chat });
		} catch (error) {
			this.logger.warn('[SafeTesting] Failed to relay a test run reset', {
				agentId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
		return { reset: true };
	}
}
