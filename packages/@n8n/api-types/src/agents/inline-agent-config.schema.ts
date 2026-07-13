import { z } from 'zod';

import {
	AgentJsonConfigSchema,
	AgentModelSchema,
	DraftAgentModelSchema,
	NodeToolJsonConfigSchema,
	WorkflowToolJsonConfigSchema,
} from './agent-json-config.schema';

/**
 * Tools allowed on inline agents. Custom (code) tools are excluded — their
 * bodies live on the agent entity, which inline agents don't have.
 * `requireApproval` is rejected: a suspended run cannot resume in workflow
 * context (execution throws on suspension, and inline runtimes have no
 * checkpoint storage), so an approval-gated tool would be configurable but
 * guaranteed to fail.
 */
const InlineAgentToolConfigSchema = z.discriminatedUnion('type', [
	WorkflowToolJsonConfigSchema.omit({ requireApproval: true }).strict(),
	NodeToolJsonConfigSchema.omit({ requireApproval: true }).strict(),
]);

/**
 * The subset of AgentJsonConfig an inline agent may define. Strict on purpose:
 * skills, memory, sub-agents, integrations, tasks and the `config` options
 * block are only available on saved agents; runtime defaults apply. MCP
 * servers are included because the tools UI treats them as tools, and they
 * are self-contained references (URL + credential id) like node tools.
 */
export const InlineAgentJsonConfigSchema = z
	.object({
		name: z.string().min(1).max(128),
		model: DraftAgentModelSchema,
		credential: z.string().optional(),
		instructions: z.string(),
		tools: z.array(InlineAgentToolConfigSchema).optional(),
		mcpServers: AgentJsonConfigSchema.shape.mcpServers,
	})
	.strict();

/**
 * Value of the MessageAnAgent node's hidden `inlineAgent` parameter. The
 * wrapper object leaves room to embed skill/custom-tool bodies later without
 * reshaping the stored parameter.
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
