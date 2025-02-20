import type { IWorkflowBase } from 'n8n-workflow';

import type { Risk } from '@/security-audit/types';

type Node = IWorkflowBase['nodes'][number];

export const toFlaggedNode = ({ node, workflow }: { node: Node; workflow: IWorkflowBase }) => ({
	kind: 'node' as const,
	workflowId: workflow.id,
	workflowName: workflow.name,
	nodeId: node.id,
	nodeName: node.name,
	nodeType: node.type,
});

export const toReportTitle = (riskCategory: Risk.Category) =>
	riskCategory.charAt(0).toUpperCase() + riskCategory.slice(1) + ' Risk Report';

export function getNodeTypes(workflows: IWorkflowBase[], test: (element: Node) => boolean) {
	return workflows.reduce<Risk.NodeLocation[]>((acc, workflow) => {
		workflow.nodes.forEach((node) => {
			if (test(node)) acc.push(toFlaggedNode({ node, workflow }));
		});

		return acc;
	}, []);
}
