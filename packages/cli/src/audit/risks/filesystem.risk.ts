import { toFlaggedNode } from '@/audit/utils';
import { FILESYSTEM_INTERACTION_NODE_TYPES, FILESYSTEM_REPORT } from '@/audit/constants';
import type { WorkflowEntity } from '@/databases/entities/WorkflowEntity';
import type { Risk } from '@/audit/types';

function getFilesystemInteractionNodeTypes(workflows: WorkflowEntity[]) {
	return workflows.reduce<Risk.NodeLocation[]>((acc, workflow) => {
		workflow.nodes.forEach((node) => {
			if (FILESYSTEM_INTERACTION_NODE_TYPES.includes(node.type)) {
				acc.push(toFlaggedNode({ node, workflow }));
			}
		});

		return acc;
	}, []);
}

export function reportFilesystemRisk(workflows: WorkflowEntity[]) {
	const fsInteractionNodeTypes = getFilesystemInteractionNodeTypes(workflows);

	if (fsInteractionNodeTypes.length === 0) return null;

	const report: Risk.StandardReport = {
		risk: FILESYSTEM_REPORT.RISK,
		sections: [],
	};

	const sentenceStart = ({ length }: { length: number }) =>
		length > 1 ? 'These nodes read from and write to' : 'This node reads from and writes to';

	if (fsInteractionNodeTypes.length > 0) {
		report.sections.push({
			title: FILESYSTEM_REPORT.SECTIONS.FILESYSTEM_INTERACTION_NODES,
			description: [
				sentenceStart(fsInteractionNodeTypes),
				'any accessible file in the host filesystem. Sensitive file content may be manipulated through a node operation.',
			].join(' '),
			recommendation:
				'Consider protecting any sensitive files in the host filesystem, or refactoring the workflow so that it does not require host filesystem interaction.',
			location: fsInteractionNodeTypes,
		});
	}

	return report;
}
