import type { EndedExecutionItem } from '@n8n/engine';
import { createRunExecutionData, WorkflowOperationError, type IRun } from 'n8n-workflow';

import type { RelayEventMap } from '@/events/maps/relay.event-map';
import { toV1Mode, toV1Status } from '@/executions/engine-v2-mapping';

/**
 * The v1 end event for one ended v2 execution, so the relays that read v1 events
 * (log streaming, Prometheus, telemetry) need no v2 branch.
 */
export function toWorkflowPostExecute(
	item: EndedExecutionItem,
): RelayEventMap['workflow-post-execute'] {
	const failed = item.failedStep;
	const runData: IRun = {
		mode: toV1Mode(item),
		status: toV1Status(item.status),
		// Log streaming reads it to pick `n8n.workflow.success`.
		// oxlint-disable-next-line typescript/no-deprecated
		finished: item.status === 'completed',
		storedAt: 'db',
		startedAt: new Date(item.createdAt),
		stoppedAt: new Date(item.finishedAt),
		data: createRunExecutionData({
			resultData: {
				runData: {},
				lastNodeExecuted: failed?.nodeName ?? undefined,
				error: failed
					? new WorkflowOperationError(
							failed.error.message,
							failed.nodeName && failed.nodeType
								? {
										id: failed.nodeId,
										name: failed.nodeName,
										type: failed.nodeType,
										typeVersion: 1,
										position: [0, 0],
										parameters: {},
									}
								: undefined,
						)
					: undefined,
			},
		}),
	};

	return {
		executionId: item.id,
		userId: item.userId ?? undefined,
		projectId: item.projectId ?? undefined,
		workflow: {
			id: item.workflowId,
			name: item.workflowName ?? '',
			active: false,
			isArchived: false,
			activeVersionId: null,
			createdAt: runData.startedAt,
			updatedAt: runData.startedAt,
			nodes: [],
			connections: {},
		},
		runData,
	};
}
