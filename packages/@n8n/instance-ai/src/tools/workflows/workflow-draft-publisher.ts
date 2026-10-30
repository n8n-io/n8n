import { workflowDraftPayloadSchema } from '@n8n/api-types';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { prepareWorkflowForSave } from './prepare-workflow-for-save';
import type { InstanceAiEventBus } from '../../event-bus/event-bus.interface';
import type { InstanceAiContext } from '../../types';

export interface WorkflowDraft {
	/** Workspace-relative source path the workflow was compiled from. */
	filePath: string;
	/** The saved workflow the source file is bound to, when there is one. */
	workflowId?: string;
	/** The sandbox build output. The publisher does not change it. */
	workflow: WorkflowJSON;
}

export interface WorkflowDraftPublisher {
	/** Publish a compiled workflow as a `workflow-draft` event. Never throws. */
	publish(draft: WorkflowDraft): Promise<void>;
}

/**
 * Shows each compiled workflow on the canvas before the build validates and
 * saves it. The draft goes through the same preparation as the save, so the
 * saved workflow keeps the groups, node ids and layout the user watched.
 */
export function createWorkflowDraftPublisher(options: {
	eventBus: Pick<InstanceAiEventBus, 'publish'>;
	threadId: string;
	runId: string;
	agentId: string;
	context: InstanceAiContext;
}): WorkflowDraftPublisher {
	const { eventBus, threadId, runId, agentId, context } = options;
	const revisions = new Map<string, number>();

	return {
		async publish({ filePath, workflowId, workflow }) {
			try {
				const json = structuredClone(workflow);
				await prepareWorkflowForSave(json, workflowId, context);
				const revision = (revisions.get(filePath) ?? 0) + 1;
				const parsed = workflowDraftPayloadSchema.safeParse({
					filePath,
					...(workflowId ? { workflowId } : {}),
					revision,
					workflow: json,
				});
				if (!parsed.success) {
					context.logger.debug('Skipped workflow draft preview', {
						filePath,
						error: parsed.error.message,
					});
					return;
				}
				revisions.set(filePath, revision);
				eventBus.publish(threadId, {
					type: 'workflow-draft',
					runId,
					agentId,
					payload: parsed.data,
				});
			} catch (error) {
				context.logger.debug('Skipped workflow draft preview', {
					filePath,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		},
	};
}
