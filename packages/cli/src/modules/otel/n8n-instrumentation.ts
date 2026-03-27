import { Logger } from '@n8n/backend-common';
import { OnLifecycleEvent } from '@n8n/decorators';
import type { WorkflowExecuteBeforeContext, WorkflowExecuteAfterContext } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { trace } from '@opentelemetry/api';

import { WorkflowEndHandler } from './handlers/workflow-end.handler';
import { WorkflowStartHandler } from './handlers/workflow-start.handler';
import { SpanRegistry } from './span-registry';

const TRACER_NAME = 'n8n-workflow';
type OtelLifecycleContexts = {
	workflowExecuteBefore: WorkflowExecuteBeforeContext;
	workflowExecuteAfter: WorkflowExecuteAfterContext;
};
type OtelLifecycleDispatchers = {
	[K in keyof OtelLifecycleContexts]: (ctx: OtelLifecycleContexts[K]) => void;
};

@Service()
export class N8nInstrumentation {
	private readonly spans = new SpanRegistry();
	private readonly tracer = trace.getTracer(TRACER_NAME);
	private readonly lifecycleDispatchers: OtelLifecycleDispatchers;
	private readonly loggedFailureEvents = new Set<keyof OtelLifecycleDispatchers>();

	constructor(
		workflowStartHandler: WorkflowStartHandler,
		workflowEndHandler: WorkflowEndHandler,
		private readonly logger: Logger,
	) {
		this.lifecycleDispatchers = {
			workflowExecuteBefore: (ctx) => workflowStartHandler.handle(ctx, this.spans, this.tracer),
			workflowExecuteAfter: (ctx) => workflowEndHandler.handle(ctx, this.spans),
		};
	}

	@OnLifecycleEvent('workflowExecuteBefore')
	onWorkflowStart(ctx: WorkflowExecuteBeforeContext) {
		this.executeLifecycleHandler('workflowExecuteBefore', ctx);
	}

	@OnLifecycleEvent('workflowExecuteAfter')
	onWorkflowEnd(ctx: WorkflowExecuteAfterContext) {
		this.executeLifecycleHandler('workflowExecuteAfter', ctx);
	}

	private executeLifecycleHandler<K extends keyof OtelLifecycleContexts>(
		event: K,
		ctx: OtelLifecycleContexts[K],
	): void {
		try {
			this.lifecycleDispatchers[event](ctx);
		} catch (error) {
			if (this.loggedFailureEvents.has(event)) return;

			this.loggedFailureEvents.add(event);
			this.logger.error('Failed to process OpenTelemetry span data', {
				event,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}
