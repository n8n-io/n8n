import { OnLifecycleEvent } from '@n8n/decorators';
import type {
	WorkflowExecuteBeforeContext,
	WorkflowExecuteAfterContext,
	WorkflowExecuteResumeContext,
	NodeExecuteBeforeContext,
	NodeExecuteAfterContext,
} from '@n8n/decorators';
import { LicenseState, Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { ICustomTelemetryTag, IWorkflowBase } from 'n8n-workflow';

import { ExecutionLevelTracer } from './execution-level-tracer';
import type { CustomAttributes } from './execution-level-tracer.types';
import { OtelConfig } from './otel.config';
import { TraceContextService } from './tracing-context';
import { OwnershipService } from '../../services/ownership.service';

const isCustomTelemetryTag = (value: unknown): value is ICustomTelemetryTag =>
	typeof value === 'object' &&
	value !== null &&
	!Array.isArray(value) &&
	'key' in value &&
	'value' in value &&
	typeof value.key === 'string' &&
	typeof value.value === 'string';

const getCustomTelemetryTags = (value: unknown): ICustomTelemetryTag[] | undefined => {
	if (Array.isArray(value)) return value.filter(isCustomTelemetryTag);
	if (typeof value !== 'object' || value === null || !('tag' in value)) {
		return undefined;
	}

	const { tag } = value;
	return Array.isArray(tag) ? tag.filter(isCustomTelemetryTag) : undefined;
};

@Service()
export class OtelLifecycleHandler {
	constructor(
		private readonly tracer: ExecutionLevelTracer,
		private readonly traceContextService: TraceContextService,
		private readonly config: OtelConfig,
		private readonly ownershipService: OwnershipService,
		private readonly logger: Logger,
		private readonly licenseState: LicenseState,
	) {}

	private isPublishedWorkflow(workflow: IWorkflowBase): boolean {
		return !!(workflow.activeVersionId ?? workflow.active);
	}

	@OnLifecycleEvent('workflowExecuteBefore')
	async onWorkflowStart(ctx: WorkflowExecuteBeforeContext): Promise<void> {
		if (this.config.productionExecutionsOnly && !this.isPublishedWorkflow(ctx.workflow)) return;

		const parentExecutionId = ctx.executionData?.parentExecution?.executionId;
		const tracingContext = parentExecutionId
			? // Set for sub-workflows and error workflows to link their spans to the parent
				await this.traceContextService.get(parentExecutionId)
			: // This will return "null" if there is no traceparent header in the trigger node. (e.g. webhook)
				await this.traceContextService.get(ctx.executionId);

		const project = await this.ownershipService
			.getWorkflowProjectCached(ctx.workflow.id)
			.catch((error: unknown) => {
				this.logger.warn('Failed to fetch project for OTEL span', {
					workflowId: ctx.workflow.id,
					executionId: ctx.executionId,
					error: error instanceof Error ? error.message : String(error),
				});
				return undefined;
			});

		const spanContext = this.tracer.startWorkflow({
			executionId: ctx.executionId,
			tracingContext,
			project: project
				? {
						id: project.id,
						customAttributes: this.buildProjectCustomAttributes(project.customTelemetryTags),
					}
				: undefined,
			workflow: {
				id: ctx.workflow.id,
				name: ctx.workflow.name,
				versionId: ctx.workflow.versionId,
				nodeCount: ctx.workflow.nodes.length,
				customAttributes: this.buildWorkflowCustomAttributes(ctx),
			},
		});

		// Given we have now started a "workflow" we should persist the traceparent - it will change the
		// "parent-id" part of the traceparent header when we start the `workflow`
		await this.traceContextService.persist(ctx.executionId, spanContext);
	}

	@OnLifecycleEvent('workflowExecuteResume')
	async onWorkflowResume(ctx: WorkflowExecuteResumeContext): Promise<void> {
		if (this.config.productionExecutionsOnly && !this.isPublishedWorkflow(ctx.workflow)) return;

		const previousWorkflowExecution = await this.traceContextService.get(ctx.executionId);

		const project = await this.ownershipService
			.getWorkflowProjectCached(ctx.workflow.id)
			.catch((error: unknown) => {
				this.logger.warn('Failed to fetch project for OTEL span', {
					workflowId: ctx.workflow.id,
					executionId: ctx.executionId,
					error: error instanceof Error ? error.message : String(error),
				});
				return undefined;
			});

		this.tracer.startWorkflow({
			executionId: ctx.executionId,
			linkTo: previousWorkflowExecution,
			project: project
				? {
						id: project.id,
						customAttributes: this.buildProjectCustomAttributes(project.customTelemetryTags),
					}
				: undefined,
			workflow: {
				id: ctx.workflow.id,
				name: ctx.workflow.name,
				versionId: ctx.workflow.versionId,
				nodeCount: ctx.workflow.nodes.length,
				customAttributes: this.buildWorkflowCustomAttributes(ctx),
			},
		});
	}

	@OnLifecycleEvent('workflowExecuteAfter')
	onWorkflowEnd(ctx: WorkflowExecuteAfterContext): void {
		if (this.config.productionExecutionsOnly && !this.isPublishedWorkflow(ctx.workflow)) return;

		this.tracer.endWorkflow({
			executionId: ctx.executionId,
			status: ctx.runData.status,
			mode: ctx.runData.mode,
			error: ctx.runData.data.resultData.error,
			isRetry: ctx.runData.mode === 'retry',
			retryOf: ctx.retryOf,
		});
	}

	@OnLifecycleEvent('nodeExecuteBefore')
	onNodeStart(ctx: NodeExecuteBeforeContext): void {
		if (this.config.productionExecutionsOnly && !this.isPublishedWorkflow(ctx.workflow)) return;
		if (!this.config.includeNodeSpans) return;

		const node = ctx.workflow.nodes.find((n) => n.name === ctx.nodeName);
		if (!node) return;

		this.tracer.startNode({
			executionId: ctx.executionId,
			node,
		});
	}

	@OnLifecycleEvent('nodeExecuteAfter')
	onNodeEnd(ctx: NodeExecuteAfterContext): void {
		if (this.config.productionExecutionsOnly && !this.isPublishedWorkflow(ctx.workflow)) return;
		if (!this.config.includeNodeSpans) return;

		const node = ctx.workflow.nodes.find((n) => n.name === ctx.nodeName);
		if (!node) return;

		this.tracer.endNode({
			executionId: ctx.executionId,
			node,
			inputItemCount: countInputItems(ctx),
			outputItemCount: countOutputItems(ctx.taskData.data),
			error: ctx.taskData.error ?? undefined,
			customAttributes: this.buildNodeCustomAttributes(ctx),
		});
	}

	private areCustomSpanAttributesLicensed(): boolean {
		return this.licenseState.isOtelCustomSpanAttributesLicensed();
	}

	private buildWorkflowCustomAttributes(
		ctx: WorkflowExecuteBeforeContext | WorkflowExecuteResumeContext,
	): CustomAttributes | undefined {
		const tags = getCustomTelemetryTags(ctx.workflow.settings?.customTelemetryTags);
		if (!tags?.length) return;
		if (!this.areCustomSpanAttributesLicensed()) return;

		const customAttributes: CustomAttributes = {};

		for (const { key, value } of tags) {
			const trimmedKey = key.trim();
			if (!trimmedKey) continue;

			customAttributes[trimmedKey] = value;
		}

		if (Object.keys(customAttributes).length === 0) return;

		return customAttributes;
	}

	private buildProjectCustomAttributes(
		tags: Array<{ key: string; value: string }> | undefined,
	): Record<string, string> | undefined {
		if (!this.areCustomSpanAttributesLicensed()) return undefined;
		if (!tags?.length) return undefined;

		const attrs: Record<string, string> = {};
		for (const { key, value } of tags) {
			attrs[key] = value;
		}
		return attrs;
	}

	private buildNodeCustomAttributes(ctx: NodeExecuteAfterContext): CustomAttributes | undefined {
		if (!ctx.taskData.metadata?.tracing) return undefined;
		if (!this.areCustomSpanAttributesLicensed()) return undefined;

		return Object.fromEntries(
			Object.entries(ctx.taskData.metadata.tracing).map(([key, value]) => [key, String(value)]),
		);
	}
}

export function countOutputItems(data: NodeExecuteAfterContext['taskData']['data']): number {
	if (!data?.main) return 0;
	return data.main.reduce((sum, branch) => sum + (branch?.length ?? 0), 0);
}

export function countInputItems(ctx: NodeExecuteAfterContext): number {
	const runData = ctx.executionData.resultData.runData;
	let total = 0;

	for (const source of ctx.taskData.source) {
		if (!source) continue;
		const sourceRuns = runData[source.previousNode];
		if (!sourceRuns) continue;

		const run = sourceRuns[source.previousNodeRun ?? 0];
		if (!run?.data?.main) continue;

		const branch = run.data.main[source.previousNodeOutput ?? 0];
		total += branch?.length ?? 0;
	}

	return total;
}
