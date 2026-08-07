import { z } from 'zod';

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

export const agentConfigValidationIssueSchema = z.object({
	code: agentConfigValidationIssueCodeSchema,
	/** Config dot-path, or a legacy `skill:<id>` token for backward compatibility. */
	path: z.string(),
	capability: agentConfigValidationCapabilityRefSchema,
});
export type AgentConfigValidationIssue = z.infer<typeof agentConfigValidationIssueSchema>;

export const agentConfigValidationResponseSchema = z.object({
	status: z.enum(['valid', 'invalid']),
	issues: z.array(agentConfigValidationIssueSchema),
});
export type AgentConfigValidationResponse = z.infer<typeof agentConfigValidationResponseSchema>;
