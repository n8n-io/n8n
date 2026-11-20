import { z } from 'zod';

/** The scope whose policy decided a node type's availability. */
export const nodeTypeAvailabilityScopeSchema = z.enum(['instance', 'project']);
export type NodeTypeAvailabilityScope = z.infer<typeof nodeTypeAvailabilityScopeSchema>;

/**
 * One node type's effective availability in a project, composed from the instance and
 * project policies. Optional fields are present only on unavailable entries, so the
 * response stays cheap for the common case of a fully available type.
 */
export type NodeTypeAvailability = {
	name: string;
	available: boolean;
	/** The denying scope. */
	scope?: NodeTypeAvailabilityScope;
	/** The rule that denied, absent when the scope's default action decided. */
	matchedRuleId?: string;
	/** The instance policy delegates this type, so the project can allow it for itself. */
	optInAvailable?: boolean;
};

/** Response of `GET /projects/:projectId/available-types`. */
export type AvailableTypesResponse = NodeTypeAvailability[];
