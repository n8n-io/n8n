import { WorkflowEntity } from '@n8n/db';

// Allowlist of fields that may be written from a client payload. This is the security
// boundary: relations/internal fields (e.g. `parentFolder`, `active`, `triggerCount`) are
// deliberately excluded so they can never be mass-assigned. Folder placement is handled
// separately via the validated `parentFolderId`.
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
