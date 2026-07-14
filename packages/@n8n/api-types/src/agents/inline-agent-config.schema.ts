import { z } from 'zod';

import {
	AgentJsonConfigSchema,
	AgentModelSchema,
	NodeToolJsonConfigSchema,
	WorkflowToolJsonConfigSchema,
} from './agent-json-config.schema';
import { agentSkillSchema } from './agent-skill.schema';

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
 * Skill bodies embedded next to the config, keyed by the ids that
 * `config.skills` references — the inline stand-in for the agent entity's
 * `skills` column. Keys share the ref-id charset; the prototype-polluting
 * names that charset would admit are rejected explicitly (workflow JSON is
 * workflow-author-controlled).
 */
const InlineSkillIdSchema = z
	.string()
	.min(1)
	.max(64)
	.regex(/^[A-Za-z0-9_-]+$/)
	.refine((id) => !['__proto__', 'constructor', 'prototype'].includes(id), {
		message: 'Reserved skill id',
	});

const InlineAgentSkillBodiesSchema = z.record(InlineSkillIdSchema, agentSkillSchema);

/**
 * The subset of AgentJsonConfig an inline agent may define. Strict on purpose:
 * memory, sub-agents, integrations, tasks and the `config` options block are
 * only available on saved agents; runtime defaults apply. Skills are supported
 * as refs here, with their bodies in the sibling `skills` record.
 */
export const InlineAgentJsonConfigSchema = AgentJsonConfigSchema.pick({
	name: true,
	model: true,
	credential: true,
	instructions: true,
	skills: true,
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
 * Every `config.skills` ref must have a body in the sibling `skills` record —
 * a dangling ref would throw at compile time anyway (see
 * `getConfiguredSkillSource`); failing validation gives a pathed, readable
 * error instead. Orphan bodies are tolerated, matching the saved-agent entity:
 * the runtime only reads referenced ids, and the editor prunes orphans on
 * every parameter write.
 *
 * Referenced bodies must also have unique names (case-insensitive, trimmed):
 * saved agents enforce this when a skill is created
 * (`assertSkillNameIsUnique`), and the runtime rejects duplicates when
 * attaching skills (`normalizeRuntimeSkills`) — validating here keeps that
 * failure pathed too.
 */
function assertSkillRefIntegrity(
	value: {
		config: { skills?: Array<{ id: string }> };
		skills?: Record<string, z.infer<typeof agentSkillSchema>>;
	},
	ctx: z.RefinementCtx,
) {
	const bodies = value.skills ?? {};
	const idsByName = new Map<string, string>();
	for (const [index, ref] of (value.config.skills ?? []).entries()) {
		if (!Object.hasOwn(bodies, ref.id)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Skill "${ref.id}" is referenced in config.skills but has no body in skills`,
				path: ['config', 'skills', index, 'id'],
			});
			continue;
		}
		const name = bodies[ref.id].name.trim();
		const existingId = idsByName.get(name.toLowerCase());
		if (existingId !== undefined) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Skill "${ref.id}" has the same name as skill "${existingId}" ("${name}")`,
				path: ['skills', ref.id, 'name'],
			});
			continue;
		}
		idsByName.set(name.toLowerCase(), ref.id);
	}
}

/**
 * Value of the MessageAnAgent node's hidden `inlineAgent` parameter.
 *
 * The `superRefine` makes this (and the runnable variant below) a ZodEffects —
 * `.shape`/`.pick`/`.extend` are unavailable; derive from
 * `InlineAgentJsonConfigSchema` instead.
 */
export const InlineAgentConfigSchema = z
	.object({
		config: InlineAgentJsonConfigSchema,
		skills: InlineAgentSkillBodiesSchema.optional(),
	})
	.strict()
	.superRefine(assertSkillRefIntegrity);

export const RunnableInlineAgentConfigSchema = z
	.object({
		config: InlineAgentJsonConfigSchema.extend({
			model: AgentModelSchema,
			credential: z.string().refine((value) => value.trim().length > 0, {
				message: 'Credential is required',
			}),
		}),
		skills: InlineAgentSkillBodiesSchema.optional(),
	})
	.strict()
	.superRefine(assertSkillRefIntegrity);

export type InlineAgentJsonConfig = z.infer<typeof InlineAgentJsonConfigSchema>;
export type InlineAgentConfig = z.infer<typeof InlineAgentConfigSchema>;
export type RunnableInlineAgentConfig = z.infer<typeof RunnableInlineAgentConfigSchema>;
