import type { ProjectIcon } from './schemas/project.schema';

/**
 * Counts of the types, not rules, that the project policy itself restricts or opts in to. One rule
 * can match many types, for example a package selector.
 */
export type ProjectPolicyRuleCounts = {
	/** Types that the instance policy allows and the project policy blocks. */
	restricted: number;
	/** Types that the instance policy leaves to projects and the project policy allows. */
	optedIn: number;
};

/** Counts of the types a project can use after its policy composes with the instance policy. */
export type ProjectPolicyEffectiveCounts = {
	allowed: number;
	restricted: number;
};

export type ProjectPolicyKindSummary = ProjectPolicyRuleCounts & {
	effective: ProjectPolicyEffectiveCounts;
};

/** The policy state of one team project, for node types and credential types together. */
export type ProjectPolicySummary = {
	projectId: string;
	name: string;
	icon: ProjectIcon | null;
	memberCount: number;
	/** `true` when the project has its own policy for at least one kind. */
	hasPolicy: boolean;
	/** The last change to the project policy of either kind. `null` when `hasPolicy` is `false`. */
	updatedAt: string | null;
	node: ProjectPolicyKindSummary;
	credential: ProjectPolicyKindSummary;
};

/** Response of `GET /project-policies`: one entry for each team project, none for personal ones. */
export type ProjectPoliciesResponse = {
	projects: ProjectPolicySummary[];
};
