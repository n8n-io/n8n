import { z } from 'zod';

import {
	AgentJsonConfigSchema,
	AgentModelSchema,
	NodeToolJsonConfigSchema,
	WorkflowToolJsonConfigSchema,
} from './agent-json-config.schema';

/**
 * Tools allowed on inline agents. Custom (code) tools are excluded — their
 * bodies live on the agent entity, which inline agents don't have.
 * `requireApproval` is rejected: a suspended run cannot resume in workflow
 * context.
 */
const InlineAgentToolConfigSchema = z.discriminatedUnion('type', [
	WorkflowToolJsonConfigSchema.omit({ requireApproval: true }).strict(),
	NodeToolJsonConfigSchema.omit({ requireApproval: true }).strict(),
]);

/**
 * The subset of AgentJsonConfig an inline agent may define. Strict on purpose:
 * skills, memory, sub-agents, integrations, tasks and the `config` options
 * block are only available on saved agents; runtime defaults apply.
 */
export const InlineAgentJsonConfigSchema = AgentJsonConfigSchema.pick({
	name: true,
	model: true,
	credential: true,
	instructions: true,
})
	.extend({
		tools: z.array(InlineAgentToolConfigSchema).optional(),
		// Approval suspends the run for a human, which workflow executions
		// don't support — same reason the tool variants above omit
		// `requireApproval`.
		mcpServers: AgentJsonConfigSchema.shape.mcpServers.refine(
			(servers) => (servers ?? []).every((server) => server.approval === undefined),
			{ message: 'MCP tool approval is not available for inline agents' },
		),
	})
	.strict();

/**
 * Value of the MessageAnAgent node's hidden `inlineAgent` parameter.
 */
export const InlineAgentConfigSchema = z
	.object({
		config: InlineAgentJsonConfigSchema,
	})
	.strict();

export const RunnableInlineAgentConfigSchema = z
	.object({
		config: InlineAgentJsonConfigSchema.extend({
			model: AgentModelSchema,
			credential: z.string().refine((value) => value.trim().length > 0, {
				message: 'Credential is required',
			}),
		}),
	})
	.strict();

export type InlineAgentJsonConfig = z.infer<typeof InlineAgentJsonConfigSchema>;
export type InlineAgentConfig = z.infer<typeof InlineAgentConfigSchema>;
export type RunnableInlineAgentConfig = z.infer<typeof RunnableInlineAgentConfigSchema>;
