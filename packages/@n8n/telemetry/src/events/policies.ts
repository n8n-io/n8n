import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

/** Open strings, like the violation they come from, so a new policy feature needs no change here. */
const blockedViolation = z.object({
	check_id: z.string(),
	kind: z.string().describe("e.g. 'node-type-unavailable' or 'credential-type-unavailable'"),
	subject_type: z.string().nullable().describe("e.g. 'nodeType' or 'credentialType'"),
	subject: z
		.string()
		.nullable()
		.describe('The blocked type name. Null for a subject type that is not a type name'),
	scope: z.string().nullable().describe("Which level objected, usually 'instance' or 'project'"),
	matched_rule: z
		.boolean()
		.describe(
			"Whether a specific rule decided. False when the scope's default action decided, or for a check that has no rules",
		),
});

export const POLICIES_TELEMETRY = defineTelemetryEvents({
	POLICY_BLOCKED_ACTION: {
		name: 'Policy blocked action',
		description:
			'A policy blocked an action at an enforcement point. Fires once per blocked action, for every policy feature, on the instance that ran the check. Allowed actions do not report. A batch import that reports violations instead of refusing does not fire this event.',
		properties: z.object({
			user_id: z
				.string()
				.optional()
				.describe('Absent when the actor is the system, for example inside a run'),
			actor_type: z.enum(['user', 'system']),
			system_reason: z
				.string()
				.optional()
				.describe("Why the system acted, e.g. 'execution' or 'cli-import'. Absent for a user"),
			point: z
				.string()
				.describe(
					"The enforcement point, e.g. 'workflowSave', 'workflowStart', 'credentialDecrypt'",
				),
			outcome: z
				.enum(['violation', 'checkFailure'])
				.describe(
					"'checkFailure' means a check did not answer in time or threw, so the action was blocked anyway",
				),
			duration_ms: z.number(),
			check_ids: z.array(z.string()).describe('Every check consulted at this point'),
			violation_count: z.number(),
			violations: z
				.array(blockedViolation)
				.describe(
					'Capped at 50. Compare the length against violation_count to see whether the cap dropped any',
				),
			target_type: z.enum(['workflow', 'agent', 'credential']),
			workflow_id: z.string().nullable().optional().describe('Null for a create'),
			agent_id: z.string().nullable().optional().describe('Null for a create'),
			credential_id: z.string().nullable().optional().describe('Null for a create'),
			credential_type: z.string().optional(),
			consumer_node_type: z
				.string()
				.optional()
				.describe('The node that asked to decrypt the credential'),
			project_id: z.string().nullable(),
		}),
	},
});
