import { z } from 'zod';

export const AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH = 65_536;
export const AGENT_SKILL_REFERENCE_MAX_COUNT = 20;
export const AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH = 65_536;
export const AGENT_SKILL_REFERENCES_TOTAL_MAX_LENGTH = 262_144;

const agentSkillStringArraySchema = z.array(z.string().trim().min(1));

const agentSkillReferenceSchema = z
	.object({
		path: z
			.string()
			.min(1)
			.max(512)
			.refine((path) => {
				const normalized = path.replaceAll('\\', '/');
				const segments = normalized.split('/');
				return (
					path === normalized &&
					normalized.startsWith('references/') &&
					(normalized.endsWith('.md') || normalized.endsWith('.markdown')) &&
					segments.every((segment) => segment !== '' && segment !== '.' && segment !== '..')
				);
			}, 'Reference path must be a markdown file under references/'),
		content: z
			.string()
			.min(1)
			.max(
				AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH,
				`Reference content must be ${AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH} characters or fewer`,
			),
	})
	.strict();

const agentSkillReferencesSchema = z
	.array(agentSkillReferenceSchema)
	.max(AGENT_SKILL_REFERENCE_MAX_COUNT)
	.superRefine((references, ctx) => {
		const paths = new Set<string>();
		let totalLength = 0;
		for (const [index, reference] of references.entries()) {
			totalLength += reference.content.length;
			if (paths.has(reference.path)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Duplicate reference path "${reference.path}"`,
					path: [index, 'path'],
				});
			}
			paths.add(reference.path);
		}
		if (totalLength > AGENT_SKILL_REFERENCES_TOTAL_MAX_LENGTH) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Reference content must total ${AGENT_SKILL_REFERENCES_TOTAL_MAX_LENGTH} characters or fewer`,
			});
		}
	});

/**
 * Persisted, user-editable body of a skill. Membership lives in the agent
 * config as `{ type: 'skill', id }` refs (mirroring tasks), so it is
 * intentionally not part of the body.
 */
export const agentSkillShape = {
	name: z.string().min(1).max(128),
	description: z.string().min(1).max(512),
	// Measured in characters like the name, description and reference limits,
	// so the editor can show the user the same count the server enforces.
	instructions: z
		.string()
		.min(1)
		.max(
			AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH,
			`Instructions must be ${AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH} characters or fewer`,
		),
	allowedTools: agentSkillStringArraySchema.optional(),
	references: agentSkillReferencesSchema.optional(),
	scripts: z.never().optional(),
	templates: z.never().optional(),
	assets: z.never().optional(),
	examples: z.never().optional(),
	other: z.never().optional(),
};

export const agentSkillSchema = z.object(agentSkillShape).strict();
