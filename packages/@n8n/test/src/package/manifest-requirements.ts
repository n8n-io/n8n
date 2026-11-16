import type { PackageManifest, PackageRequirementConsumer } from '@n8n/api-types';

import type { CredentialRequirement, WorkflowSetRequirements } from '../sub-workflows/requirements';

interface Consumed {
	usedBy: PackageRequirementConsumer[];
}

export function workflowConsumerIds({ usedBy }: Consumed): string[] {
	return usedBy.filter(({ kind }) => kind === 'workflow').map(({ id }) => id);
}

export function toRequirements(manifest: PackageManifest): WorkflowSetRequirements {
	const namesById = new Map((manifest.workflows ?? []).map(({ id, name }) => [id, name]));
	const usedByWorkflows = <T extends Consumed>(requirements: T[] = []) =>
		requirements.flatMap(({ usedBy, ...requirement }) => {
			const workflows = workflowConsumerIds({ usedBy }).map((id) => namesById.get(id) ?? id);
			return workflows.length > 0 ? [{ ...requirement, workflows }] : [];
		});
	const { credentials, variables, dataTables, workflows, nodeTypes } = manifest.requirements ?? {};

	return {
		credentials: usedByWorkflows(credentials).flatMap(toCredentialRequirement),
		variables: usedByWorkflows(variables),
		dataTables: usedByWorkflows(dataTables),
		workflows: usedByWorkflows(workflows),
		nodeTypes: usedByWorkflows(nodeTypes).map(({ typeVersion, ...requirement }) => ({
			...requirement,
			version: typeVersion,
		})),
	};
}

function toCredentialRequirement(requirement: {
	id: string;
	name?: string;
	type?: string;
	workflows: string[];
}): CredentialRequirement[] {
	const { id, name, type, workflows } = requirement;
	if (name === undefined || type === undefined) return [];
	return [{ name, id, type, workflows }];
}
