import type { WorkflowEntity as Workflow } from '@/databases/entities/WorkflowEntity';
import { ASYNC_MAP } from '@/audit/constants';
import { Risk } from './types';

export const toFlaggedNode = ({
	node,
	workflow,
}: {
	node: Workflow['nodes'][number];
	workflow: Workflow;
}) => ({
	kind: 'node' as const,
	workflowId: workflow.id.toString(),
	workflowName: workflow.name,
	nodeId: node.id,
	nodeName: node.name,
	nodeType: node.type,
});

export const isAsync = (c: Risk.Category) => Object.keys(ASYNC_MAP).includes(c);

export const toReportTitle = (riskCategory: Risk.Category) =>
	riskCategory.charAt(0).toUpperCase() + riskCategory.slice(1) + ' Risk Report';
