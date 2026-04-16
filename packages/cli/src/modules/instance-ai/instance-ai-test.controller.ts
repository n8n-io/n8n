import { RestController, Get, Post, Delete, Param } from '@n8n/decorators';
import type { Request } from 'express';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import { InstanceAiService } from './instance-ai.service';

/**
 * Test-only endpoints for trace replay in Instance AI e2e tests.
 * Only registered when E2E_TESTS is set.
 */
@RestController('/instance-ai')
export class InstanceAiTestController {
	constructor(private readonly instanceAiService: InstanceAiService) {}

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
	getToolTrace(_req: Request, @Param('slug') slug: string) {
		this.assertTraceReplayEnabled();
		return { events: this.instanceAiService.getTraceEvents(slug) };
	}

	@Delete('/test/tool-trace/:slug', { skipAuth: true })
	clearToolTrace(_req: Request, @Param('slug') slug: string) {
		this.assertTraceReplayEnabled();
		this.instanceAiService.clearTraceEvents(slug);
		return { ok: true };
	}

	@Post('/test/drain-background-tasks', { skipAuth: true })
	drainBackgroundTasks() {
		this.assertTraceReplayEnabled();
		const cancelled = this.instanceAiService.cancelAllBackgroundTasks();
		return { ok: true, cancelled };
	}

	private assertTraceReplayEnabled(): void {
		if (process.env.E2E_TESTS !== 'true' || process.env.NODE_ENV === 'production') {
			throw new ForbiddenError('Trace replay is not enabled');
		}
	}
}
