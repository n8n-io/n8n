import type { PackageManifest, PackageWorkflowRequirement } from '@n8n/api-types';

import { isNodeTypeInstalled } from '../engine/node-types';
import { subWorkflowCalls } from '../sub-workflows/contract';
import type { IssueProducer, WorkflowSetIssue } from '../sub-workflows/issues';
import type { WorkflowHandle, WorkflowSet } from '../workflow-set';
import { workflowConsumerIds } from './manifest-requirements';

export function missingChildIssues(manifest: PackageManifest): IssueProducer {
	return (set) =>
		(manifest.requirements?.workflows ?? [])
			.filter(({ id }) => !set.workflows.some((workflow) => workflow.id === id))
			.flatMap((child) =>
				consumers(set, workflowConsumerIds(child))
					.filter((parent) => !callsStatically(parent, child.id))
					.map((parent) => missingChildIssue(set, parent, child)),
			);
}

function missingChildIssue(
	set: WorkflowSet,
	parent: WorkflowHandle,
	child: PackageWorkflowRequirement,
): WorkflowSetIssue {
	const storedName = child.name ? ` (stored name "${child.name}")` : '';
	const names = set.workflows.map((workflow) => workflow.name).join(', ');
	return {
		code: 'SUB_WORKFLOW_NOT_IN_SET',
		workflow: parent.name,
		message: `${parent.name} references the workflow ID "${child.id}"${storedName}, which the package does not hold. Workflows in the package: ${names}.`,
	};
}

export function missingNodeTypeIssues(manifest: PackageManifest): IssueProducer {
	return (set) =>
		(manifest.requirements?.nodeTypes ?? [])
			.filter(({ type, typeVersion }) => !isNodeTypeInstalled(type, typeVersion))
			.flatMap(({ type, typeVersion, usedBy }) =>
				consumers(set, workflowConsumerIds({ usedBy })).map(
					(workflow): WorkflowSetIssue => ({
						code: 'NODE_TYPE_NOT_INSTALLED',
						workflow: workflow.name,
						message: `${workflow.name} uses the node type "${type}" version ${typeVersion}, which is not installed. Install the package that holds the node in the test project.`,
					}),
				),
			);
}

function consumers(set: WorkflowSet, ids: string[]): WorkflowHandle[] {
	return set.workflows.filter((workflow) => workflow.id !== undefined && ids.includes(workflow.id));
}

function callsStatically(parent: WorkflowHandle, childId: string) {
	return subWorkflowCalls(parent.definition).some((call) => call.childId === childId);
}
