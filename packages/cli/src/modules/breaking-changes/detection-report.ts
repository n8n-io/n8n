import type { BreakingChangeWorkflowIssue } from '@n8n/api-types';
import type { INode } from 'n8n-workflow';

import type { InstanceDetectionReport, WorkflowDetectionReport } from './types';

/** The report an instance rule returns when the instance is not affected. */
export const NOT_AFFECTED_INSTANCE: InstanceDetectionReport = {
	isAffected: false,
	instanceIssues: [],
	recommendations: [],
};

/** Build a workflow rule's report, adding each affected node's identity to its issue. */
export function reportAffectedNodes<T extends INode>(
	nodes: T[],
	toIssue: (node: T) => Omit<BreakingChangeWorkflowIssue, 'nodeId' | 'nodeName'>,
): WorkflowDetectionReport {
	if (nodes.length === 0) return { isAffected: false, issues: [] };
	return {
		isAffected: true,
		issues: nodes.map((node) => ({ ...toIssue(node), nodeId: node.id, nodeName: node.name })),
	};
}
