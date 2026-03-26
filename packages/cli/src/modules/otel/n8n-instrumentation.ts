import { Logger } from '@n8n/backend-common';
import { OnLifecycleEvent } from '@n8n/decorators';
import type { WorkflowExecuteBeforeContext, WorkflowExecuteAfterContext } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { trace } from '@opentelemetry/api';

import type { SpanHandler } from './handlers/interfaces';
import { WorkflowEndHandler } from './handlers/workflow-end.handler';
import { WorkflowStartHandler } from './handlers/workflow-start.handler';
import { SpanRegistry } from './span-registry';

const TRACER_NAME = 'n8n-workflow';
type OtelLifecycleHandlers = {
	workflowExecuteBefore: SpanHandler<WorkflowExecuteBeforeContext>;
	workflowExecuteAfter: SpanHandler<WorkflowExecuteAfterContext>;
};

@Service()
export class N8nInstrumentation {
	private readonly spans = new SpanRegistry();
	private readonly tracer = trace.getTracer(TRACER_NAME);
	private readonly lifecycleHandlers: OtelLifecycleHandlers;
	private readonly loggedFailureEvents = new Set<keyof OtelLifecycleHandlers>();

	constructor(
		workflowStartHandler: WorkflowStartHandler,
		workflowEndHandler: WorkflowEndHandler,
		private readonly logger: Logger,
	) {
		this.lifecycleHandlers = {
			workflowExecuteBefore: workflowStartHandler,
			workflowExecuteAfter: workflowEndHandler,
		};
	}

	@OnLifecycleEvent('workflowExecuteBefore')
	onWorkflowStart(ctx: WorkflowExecuteBeforeContext) {
		this.executeLifecycleHandler(
			() => this.lifecycleHandlers.workflowExecuteBefore.handle(ctx, this.spans, this.tracer),
			'workflowExecuteBefore',
		);
	}

	@OnLifecycleEvent('workflowExecuteAfter')
	onWorkflowEnd(ctx: WorkflowExecuteAfterContext) {
		this.executeLifecycleHandler(
			() => this.lifecycleHandlers.workflowExecuteAfter.handle(ctx, this.spans, this.tracer),
			'workflowExecuteAfter',
		);
	}

	private executeLifecycleHandler(handler: () => void, event: keyof OtelLifecycleHandlers): void {
		try {
			handler();
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
