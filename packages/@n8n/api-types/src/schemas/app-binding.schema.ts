import type { JSONSchema7 } from 'json-schema';
import { z } from 'zod';

import type { dataTableColumnTypeSchema } from './data-table.schema';

// The key is the URL segment under /apps/<ns>/api/workflows/<key> and the SDK argument.
const bindingKeySchema = z
	.string()
	.regex(
		/^[a-z][a-z0-9-]{0,63}$/,
		'A binding key starts with a lowercase letter and contains only lowercase letters, numbers, and hyphens (max 64).',
	);

export const workflowBindingSchema = z.object({
	key: bindingKeySchema,
	kind: z.literal('workflow'),
	workflowId: z.string().min(1).max(36),
});

/** `read` allows listing rows; `write` allows insert, update, and delete. */
export const dataTablePermissionSchema = z.enum(['read', 'write']);

export const dataTableBindingSchema = z.object({
	key: bindingKeySchema,
	kind: z.literal('dataTable'),
	dataTableId: z.string().min(1).max(36),
	permissions: z.array(dataTablePermissionSchema).min(1).max(2),
});

// Discriminated on `kind` so later kinds (workflowList, executions) add a member here
// instead of a column.
export const appBindingSchema = z.discriminatedUnion('kind', [
	workflowBindingSchema,
	dataTableBindingSchema,
]);

export const appBindingsSchema = z
	.array(appBindingSchema)
	.max(50)
	.refine(
		(bindings) => new Set(bindings.map((b) => b.key)).size === bindings.length,
		'Binding keys must be unique.',
	);

export type AppBinding = z.infer<typeof appBindingSchema>;
export type DataTablePermission = z.infer<typeof dataTablePermissionSchema>;

/** Where the output fields come from: one successful execution, or nothing yet. */
export type OutputSource =
	| { kind: 'execution'; executionId: string; at: string }
	| { kind: 'unknown' };

export type DescribedWorkflowBinding = {
	key: string;
	kind: 'workflow';
	workflowId: string;
	name: string;
	published: boolean;
	/** The object the runtime validates the body against; `additionalProperties: true` when the trigger accepts any object. */
	input: JSONSchema7;
	/** The item array the runtime returns as `output`; its items are an open object until an execution typed them. */
	output: JSONSchema7;
	outputSource: OutputSource;
	missing?: false;
};

export type DescribedDataTableBinding = {
	key: string;
	kind: 'dataTable';
	dataTableId: string;
	name: string;
	permissions: DataTablePermission[];
	columns: Array<{ name: string; type: z.infer<typeof dataTableColumnTypeSchema> }>;
	/** One row as the runtime returns it: `id`, `createdAt`, `updatedAt`, then every user column as nullable. */
	row: JSONSchema7;
	missing?: false;
};

/** The bound resource no longer exists; `name` falls back to the key so the row still renders. */
export type DescribedMissingBinding = {
	key: string;
	kind: 'workflow' | 'dataTable';
	name: string;
	missing: true;
};

export type DescribedBinding =
	| DescribedWorkflowBinding
	| DescribedDataTableBinding
	| DescribedMissingBinding;
