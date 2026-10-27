import { z } from 'zod';

import { nodeTypeAvailabilityScopeSchema } from '../node-type-availability';

/**
 * Capability areas an agent configuration issue can be attributed to. Mirrors
 * the sections rendered by `AgentCapabilitiesSection` plus `agent`, the core
 * identity primitive (instructions, model, credential) that doesn't have a
 * dedicated capability chip.
 */
export const agentCapabilityKindSchema = z.enum([
	'agent',
	'channel',
	'tool',
	'mcpServer',
	'skill',
	'task',
	'subAgent',
	'vectorStore',
]);
export type AgentCapabilityKind = z.infer<typeof agentCapabilityKindSchema>;

/** Stable, i18n-free reason code for a validation issue. */
export const agentConfigValidationIssueCodeSchema = z.enum([
	'missing_required',
	'invalid_value',
	'missing_credential',
	'invalid_credential',
	'incompatible_credential',
	'missing_reference',
	'incompatible_reference',
	'restricted_node_type',
]);
export type AgentConfigValidationIssueCode = z.infer<typeof agentConfigValidationIssueCodeSchema>;

export const agentConfigValidationCapabilityRefSchema = z.object({
	kind: agentCapabilityKindSchema,
	/** Stable id within `kind`: skill id, tool name/id, channel type, vector store name, task id, sub-agent id, etc. */
	id: z.string().optional(),
	/** Position within the relevant config array (e.g. `tools[]`), when a stable id isn't available. */
	index: z.number().int().min(0).optional(),
	/** Present when `kind === 'tool'`. */
	toolType: z.enum(['custom', 'workflow', 'node']).optional(),
});
export type AgentConfigValidationCapabilityRef = z.infer<
	typeof agentConfigValidationCapabilityRefSchema
>;

export const agentConfigValidationRestrictionSchema = z.object({
	/**
	 * The denied node type, which is not always the type the entry itself runs as. An MCP
	 * server is denied as the MCP client while its own registry type stays allowed, and a tool
	 * can be denied by what its inline agent holds. Frontends resolve it to a display name;
	 * never show it raw.
	 */
	nodeType: z.string(),
	/** The level that denied the type. Absent when the policy names none. */
	scope: nodeTypeAvailabilityScopeSchema.optional(),
});
export type AgentConfigValidationRestriction = z.infer<
	typeof agentConfigValidationRestrictionSchema
>;

export const agentConfigValidationIssueSchema = z.object({
	code: agentConfigValidationIssueCodeSchema,
	/** Config dot-path, or a legacy `skill:<id>` token for backward compatibility. */
	path: z.string(),
	capability: agentConfigValidationCapabilityRefSchema,
	/**
	 * Stable, machine-readable sub-reason for `incompatible_reference` issues
	 * (e.g. `'incompatible_nodes'`, `'no_supported_trigger'`, `'not_published'`
	 * for workflow tools). For `restricted_node_type`, `'restricted_by_inline_tool'`
	 * means the entry itself is allowed and embeds an agent that holds a denied type.
	 * Values are qualified by their code because frontends resolve this field
	 * before the code. Absent when the code itself is specific enough.
	 * Frontends map this to a reason-specific i18n key; never display it raw.
	 */
	reason: z.string().optional(),
	/** Present only on `restricted_node_type` issues. */
	restriction: agentConfigValidationRestrictionSchema.optional(),
});
export type AgentConfigValidationIssue = z.infer<typeof agentConfigValidationIssueSchema>;

/** Stable, i18n-free code for a validation warning. A warning does not make a config invalid. */
export const agentConfigValidationWarningCodeSchema = z.enum(['similar_skill_names']);
export type AgentConfigValidationWarningCode = z.infer<
	typeof agentConfigValidationWarningCodeSchema
>;

export const agentConfigValidationWarningSchema = z.object({
	code: agentConfigValidationWarningCodeSchema,
	capability: agentConfigValidationCapabilityRefSchema,
	/** For `similar_skill_names`: the skill names that are hard to tell apart, at least two. */
	names: z.array(z.string().min(1)).min(2),
});
export type AgentConfigValidationWarning = z.infer<typeof agentConfigValidationWarningSchema>;

export const agentConfigValidationResponseSchema = z.object({
	status: z.enum(['valid', 'invalid']),
	issues: z.array(agentConfigValidationIssueSchema),
	/** Absent when there are no warnings. */
	warnings: z.array(agentConfigValidationWarningSchema).optional(),
});
export type AgentConfigValidationResponse = z.infer<typeof agentConfigValidationResponseSchema>;
