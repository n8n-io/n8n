import { WorkflowEntity } from '@n8n/db';

const workflowEntityWriteFields = [
	'id',
	'name',
	'description',
	'nodes',
	'connections',
	'settings',
	'staticData',
	'meta',
	'pinData',
	'nodeGroups',
] as const satisfies readonly (keyof WorkflowEntity)[];

type WorkflowEntityWriteField = (typeof workflowEntityWriteFields)[number];

export function createWorkflowEntityFromPayload(
	payload: Partial<Record<WorkflowEntityWriteField, unknown>>,
): WorkflowEntity {
	return Object.assign(
		new WorkflowEntity(),
		Object.fromEntries(
			workflowEntityWriteFields
				.filter((field) => payload[field] !== undefined)
				.map((field) => [field, payload[field]]),
		),
	);
}
