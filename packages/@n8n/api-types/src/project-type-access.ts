import type { NodeTypeAvailabilityScope } from './node-type-availability';

/** One type's access in a project, after the instance and project policies compose. */
export type ProjectTypeAccess = {
	name: string;
	access: 'allow' | 'deny';
	/** The scope whose policy decides the access. */
	scope: NodeTypeAvailabilityScope;
	/** `null` when a default action decided, not a rule. */
	matchedRuleId: string | null;
	/** The instance delegates this type and the project does not allow it, so the project can opt in. */
	optInAvailable: boolean;
};

/**
 * Response of `GET /projects/:projectId/node-type-policies/project/access` and
 * `GET /projects/:projectId/credential-type-policies/project/access`. A project write that
 * sends `projectVersion` back fails if the project policy changed since the read.
 */
export type ProjectTypeAccessResponse = {
	instanceVersion: number;
	projectVersion: number;
	types: ProjectTypeAccess[];
};
