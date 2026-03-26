import { OnLifecycleEvent } from '@n8n/decorators';
import type {
	LifecycleContext,
	WorkflowExecuteBeforeContext,
	WorkflowExecuteAfterContext,
} from '@n8n/decorators';
import { Service } from '@n8n/di';
import { trace } from '@opentelemetry/api';

import { SpanRegistry } from './span-registry';
import type { SpanHandler } from './handlers/interfaces';
import { WorkflowStartHandler } from './handlers/workflow-start.handler';
import { WorkflowEndHandler } from './handlers/workflow-end.handler';

const TRACER_NAME = 'n8n-workflow';

@Service()
export class N8nInstrumentation {
	private readonly spans = new SpanRegistry();

	private readonly lifecycleHandlers: Record<string, SpanHandler<LifecycleContext>> = {
		workflowExecuteBefore: new WorkflowStartHandler(),
		workflowExecuteAfter: new WorkflowEndHandler(),
	};

	@OnLifecycleEvent('workflowExecuteBefore')
	onWorkflowStart(ctx: WorkflowExecuteBeforeContext) {
		this.lifecycleHandlers.workflowExecuteBefore.handle(
			ctx,
			this.spans,
			trace.getTracer(TRACER_NAME),
		);
	}

	@OnLifecycleEvent('workflowExecuteAfter')
	onWorkflowEnd(ctx: WorkflowExecuteAfterContext) {
		this.lifecycleHandlers.workflowExecuteAfter.handle(
			ctx,
			this.spans,
			trace.getTracer(TRACER_NAME),
		);
	}
}
