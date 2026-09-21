import { TELEMETRY_EVENT, type InferTelemetryProps, type TelemetryEventDef } from '@n8n/telemetry';
import type { ITelemetryTrackProperties } from 'n8n-workflow';
import { Telemetry } from '@/telemetry';
import { Z } from '@n8n/api-types';
import { z } from 'zod';
import { InstanceAiWorkflowSetupTelemetryService } from './instance-ai-workflow-setup-telemetry.service';
import { InstanceAiWorkflowSetupRepository } from './repositories/instance-ai-workflow-setup.repository';
import {
	AuthenticatedRequest,
	ProjectRepository,
	UserRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Body, Delete, Get, GlobalScope, Param, Post, RestController } from '@n8n/decorators';
import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import { InstanceAiMemoryService } from './instance-ai-memory.service';
import { InstanceAiService } from './instance-ai.service';
import { InstanceAiThreadRepository } from './repositories/instance-ai-thread.repository';

class SetupTelemetryFixture extends Z.class({
	workflowId: z.string(),
	threadId: z.string().uuid(),
	buildComplete: z.boolean().optional(),
	execute: z.boolean().optional(),
	simulate: z.boolean().optional(),
}) {}

/**
 * Test-only endpoints for trace replay in Instance AI e2e tests.
 * Only registered when E2E_TESTS is set.
 */
@RestController('/instance-ai')
export class InstanceAiTestController {
	private readonly testResults: Array<
		InferTelemetryProps<typeof TELEMETRY_EVENT.INSTANCE_AI.SETUP_TEST_FINISHED>
	> = [];

	constructor(
		private readonly instanceAiService: InstanceAiService,
		private readonly threadRepo: InstanceAiThreadRepository,
		private readonly workflowRepo: WorkflowRepository,
		private readonly userRepo: UserRepository,
		private readonly memoryService: InstanceAiMemoryService,
		private readonly projectRepo: ProjectRepository,
		private readonly setupTelemetry: InstanceAiWorkflowSetupTelemetryService,
		private readonly setupRepository: InstanceAiWorkflowSetupRepository,
		telemetry: Telemetry,
	) {
		// E2E mode disables transport. Capture emitted payloads instead of storing test receipts.
		const track = telemetry.track.bind(telemetry);
		telemetry.track = (
			event: string | TelemetryEventDef,
			properties: ITelemetryTrackProperties = {},
		) => {
			if (event === TELEMETRY_EVENT.INSTANCE_AI.SETUP_TEST_FINISHED) {
				const parsed =
					TELEMETRY_EVENT.INSTANCE_AI.SETUP_TEST_FINISHED.properties.safeParse(properties);
				if (parsed.success) this.testResults.push(parsed.data);
			}
			if (typeof event === 'string') track(event, properties);
			else track(event, properties);
		};
	}

	@Post('/test/workflow-setup')
	@GlobalScope('instanceAi:message')
	async observeWorkflowSetup(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: SetupTelemetryFixture,
	) {
		this.assertTraceReplayEnabled();
		const thread = await this.threadRepo.findOneByOrFail({
			id: payload.threadId,
			resourceId: req.user.id,
		});
		await this.setupTelemetry.rememberSession(thread.id, req.headers['push-ref']);
		await this.setupTelemetry.observe(
			req.user,
			thread.id,
			payload.workflowId,
			payload.buildComplete,
		);
		if (payload.execute) {
			const { InstanceAiAdapterService } = await import('./instance-ai.adapter.service.js');
			const { Container } = await import('@n8n/di');
			return await Container.get(InstanceAiAdapterService)
				.createContext(req.user, { threadId: thread.id })
				.executionService.run(
					payload.workflowId,
					undefined,
					payload.simulate
						? { verificationPinData: { Request: [{ json: {} }] }, isVerificationRun: true }
						: undefined,
				);
		}
		return await this.setupRepository.read(payload.workflowId);
	}

	@Get('/test/workflow-setup/:workflowId')
	@GlobalScope('instanceAi:message')
	async readWorkflowSetup(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
	) {
		this.assertTraceReplayEnabled();
		const state = await this.setupRepository.read(workflowId);
		return state?.snapshot.user_id === req.user.id
			? {
					...state,
					testResults: this.testResults.filter((event) => event.workflow_id === workflowId),
				}
			: undefined;
	}

	@Post('/test/tool-trace', { skipAuth: true })
	loadToolTrace(req: Request) {
		this.assertTraceReplayEnabled();
		const { slug, events } = req.body as { slug: string; events?: unknown[] };
		if (events) {
			this.instanceAiService.loadTraceEvents(slug, events);
		}
		// Always activate the slug (marks which test is about to run)
		this.instanceAiService.activateTraceSlug(slug);
		return { ok: true, count: events?.length ?? 0 };
	}

	@Get('/test/tool-trace/:slug', { skipAuth: true })
	getToolTrace(_req: Request, _res: Response, @Param('slug') slug: string) {
		this.assertTraceReplayEnabled();
		return { events: this.instanceAiService.getTraceEvents(slug) };
	}

	@Get('/test/idle', { skipAuth: true })
	getIdleState() {
		this.assertTraceReplayEnabled();
		return { idle: !this.instanceAiService.hasRunningWorkForTest() };
	}

	@Post('/test/background-timeout/start', { skipAuth: true })
	async startBackgroundTimeoutSimulation(@Body payload: { userId: string; threadId?: string }) {
		this.assertTraceReplayEnabled();
		const threadId = payload.threadId ?? uuidv4();
		const user = await this.userRepo.findOneByOrFail({ id: payload.userId });
		const personalProject = await this.projectRepo.getPersonalProjectForUserOrFail(user.id);

		await this.memoryService.ensureThread(user.id, threadId, personalProject.id, {
			source: 'playwright',
			origin: 'internal',
		});
		return await this.instanceAiService.startStuckBackgroundTaskForTest(user, threadId);
	}

	@Post('/test/liveness-sweep', { skipAuth: true })
	async runLivenessSweep(@Body payload: { now?: number } = {}) {
		this.assertTraceReplayEnabled();
		await this.instanceAiService.runLivenessSweepForTest(payload.now);
		return { ok: true };
	}

	@Delete('/test/tool-trace/:slug', { skipAuth: true })
	clearToolTrace(_req: Request, _res: Response, @Param('slug') slug: string) {
		this.assertTraceReplayEnabled();
		this.instanceAiService.clearTraceEvents(slug);
		return { ok: true };
	}

	/**
	 * Wipe all Instance AI state and user workflows between tests.
	 *
	 * Recording pollution vector: the orchestrator's system prompt tells the LLM
	 * to "list existing workflows/credentials first", so workflows left over from
	 * a prior test show up in `list-workflows` tool output and leak into the next
	 * test's recorded responses (observed: a follow-up test's recording referencing
	 * the previous test's workflow name).
	 *
	 * This endpoint cancels background tasks, clears per-thread in-memory state,
	 * and deletes all thread + workflow rows.
	 */
	@Post('/test/reset', { skipAuth: true })
	async reset() {
		this.assertTraceReplayEnabled();

		this.instanceAiService.cancelAllBackgroundTasks();
		this.instanceAiService.clearTraceContextsForTest();

		const threads = await this.threadRepo.find({ select: ['id'] });
		for (const { id } of threads) {
			await this.instanceAiService.clearThreadState(id);
		}
		// `repo.clear()` issues TRUNCATE without CASCADE, which Postgres rejects
		// when child tables (messages, snapshots, …) still reference these rows.
		// QueryBuilder DELETE fires the FK CASCADE/SET-NULL actions correctly.
		await this.threadRepo.createQueryBuilder().delete().execute();

		const workflowIds = await this.workflowRepo.find({ select: ['id'] });
		for (const { id } of workflowIds) {
			await this.workflowRepo.delete(id);
		}

		return {
			ok: true,
			threadsDeleted: threads.length,
			workflowsDeleted: workflowIds.length,
		};
	}

	private assertTraceReplayEnabled(): void {
		if (process.env.E2E_TESTS !== 'true' || process.env.NODE_ENV === 'production') {
			throw new ForbiddenError('Trace replay is not enabled');
		}
	}
}
