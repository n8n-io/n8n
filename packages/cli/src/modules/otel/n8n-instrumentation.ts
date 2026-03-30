import { Logger } from '@n8n/backend-common';
import { OnLifecycleEvent } from '@n8n/decorators';
import type {
	WorkflowExecuteBeforeContext,
	WorkflowExecuteAfterContext,
	NodeExecuteBeforeContext,
	NodeExecuteAfterContext,
} from '@n8n/decorators';
import { Service } from '@n8n/di';
import { trace } from '@opentelemetry/api';

import { NodeEndHandler } from './handlers/node-end.handler';
import { NodeStartHandler } from './handlers/node-start.handler';
import { WorkflowEndHandler } from './handlers/workflow-end.handler';
import { WorkflowStartHandler } from './handlers/workflow-start.handler';
import { OtelConfig } from './otel.config';
import { SpanRegistry } from './span-registry';

const TRACER_NAME = 'n8n-workflow';
type OtelLifecycleContexts = {
	workflowExecuteBefore: WorkflowExecuteBeforeContext;
	workflowExecuteAfter: WorkflowExecuteAfterContext;
	nodeExecuteBefore: NodeExecuteBeforeContext;
	nodeExecuteAfter: NodeExecuteAfterContext;
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
		nodeStartHandler: NodeStartHandler,
		nodeEndHandler: NodeEndHandler,
		private readonly config: OtelConfig,
		private readonly logger: Logger,
	) {
		this.lifecycleDispatchers = {
			workflowExecuteBefore: (ctx) => workflowStartHandler.handle(ctx, this.spans, this.tracer),
			workflowExecuteAfter: (ctx) => workflowEndHandler.handle(ctx, this.spans),
			nodeExecuteBefore: (ctx) => nodeStartHandler.handle(ctx, this.spans, this.tracer),
			nodeExecuteAfter: (ctx) => nodeEndHandler.handle(ctx, this.spans),
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

	@OnLifecycleEvent('nodeExecuteBefore')
	onNodeStart(ctx: NodeExecuteBeforeContext) {
		if (!this.config.includeNodeSpans) return;
		this.executeLifecycleHandler('nodeExecuteBefore', ctx);
	}

	@OnLifecycleEvent('nodeExecuteAfter')
	onNodeEnd(ctx: NodeExecuteAfterContext) {
		if (!this.config.includeNodeSpans) return;
		this.executeLifecycleHandler('nodeExecuteAfter', ctx);
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
