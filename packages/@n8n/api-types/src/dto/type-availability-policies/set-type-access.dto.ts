import { z } from 'zod';

import {
	nonDelegatingPolicyActionSchema,
	policyActionSchema,
	rejectDuplicates,
} from './policy-rule.schema';
import { Z } from '../../zod-class';

/** `inherit` removes the rules that name the type, so its access comes from the other rules. */
const inheritSchema = z.literal('inherit');

// Above every node and credential type an instance loads, so that "select all" fits in one call.
const MAX_CHANGES = 2000;

const typeAccessChangeSchema = z.object({
	type: z.string().min(1).max(255),
	access: z.union([policyActionSchema, inheritSchema]),
});
export type TypeAccessChange = z.infer<typeof typeAccessChangeSchema>;

const nonDelegatingTypeAccessChangeSchema = typeAccessChangeSchema.extend({
	access: z.union([nonDelegatingPolicyActionSchema, inheritSchema]),
});

// Optimistic concurrency: callers send the version they last read, so a stale write is rejected.
const versionSchema = z.number().int().nonnegative();

function changeListFor<Change extends z.ZodType<{ type: string }>>(change: Change) {
	return z.array(change).min(1).max(MAX_CHANGES).superRefine(rejectDuplicates('type', 'type'));
}

/** Request body for setting the access of node types or credential types at instance scope. */
export class SetInstanceTypeAccessDto extends Z.class({
	changes: changeListFor(typeAccessChangeSchema),
	version: versionSchema,
}) {}

/** Same as `SetInstanceTypeAccessDto`, except `delegate`: no scope is narrower than project. */
export class SetProjectTypeAccessDto extends Z.class({
	changes: changeListFor(nonDelegatingTypeAccessChangeSchema),
	version: versionSchema,
}) {}
