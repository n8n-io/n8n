import { UserRepository, WorkflowRepository } from '@n8n/db';
import { Body, Delete, Get, Param, Post, RestController } from '@n8n/decorators';
import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import { InstanceAiThreadRepository } from './repositories/instance-ai-thread.repository';
import { InstanceAiService } from './instance-ai.service';
import { InstanceAiMemoryService } from './instance-ai-memory.service';

/**
 * Test-only endpoints for trace replay in Instance AI e2e tests.
 * Only registered when E2E_TESTS is set.
 */
@RestController('/instance-ai')
export class InstanceAiTestController {
	constructor(
		private readonly instanceAiService: InstanceAiService,
		private readonly threadRepo: InstanceAiThreadRepository,
		private readonly workflowRepo: WorkflowRepository,
		private readonly userRepo: UserRepository,
		private readonly memoryService: InstanceAiMemoryService,
	) {}

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

	@Post('/test/background-timeout/start', { skipAuth: true })
	async startBackgroundTimeoutSimulation(@Body payload: { userId: string; threadId?: string }) {
		this.assertTraceReplayEnabled();
		const threadId = payload.threadId ?? uuidv4();
		const user = await this.userRepo.findOneByOrFail({ id: payload.userId });

		await this.memoryService.ensureThread(user.id, threadId);
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
