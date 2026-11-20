import { z } from 'zod';

export const AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH = 65_536;
// The Agent Skills format sets no file limits, so these three are n8n limits. They bound what
// one skill version stores, because each version holds a full copy of every file.
// For scale: a popular public skill has 45 files and about 460 KB of text.
export const AGENT_SKILL_REFERENCE_MAX_COUNT = 500;
// The GitHub import already left out a file over 1 MiB. `load_skill` returns a longer file in
// parts of `RUNTIME_SKILL_MAX_OUTPUT_BYTES`.
export const AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH = 1024 * 1024;
export const AGENT_SKILL_BINARY_MAX_BYTES = 1024 * 1024;
export const AGENT_SKILL_BINARY_CONTENT_MAX_LENGTH =
	4 * Math.ceil(AGENT_SKILL_BINARY_MAX_BYTES / 3);
// Two files of the largest size. Binary files count with their Base64 length.
export const AGENT_SKILL_REFERENCES_TOTAL_MAX_LENGTH = 2 * 1024 * 1024;

const agentSkillStringArraySchema = z.array(z.string().trim().min(1));

// Zero-width and bidirectional characters. They make a file list show a name that differs
// from the stored path.
const HIDDEN_PATH_CHARACTERS = /[\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/;

export const agentSkillReferencePathSchema = z
	.string()
	.min(1)
	.max(512)
	.refine((path) => {
		const normalized = path.replaceAll('\\', '/');
		const segments = normalized.split('/');
		return (
			path === normalized &&
			// No control characters, such as NUL, which Postgres cannot store.
			// eslint-disable-next-line no-control-regex
			!/[\u0000-\u001f\u007f]/.test(path) &&
			!HIDDEN_PATH_CHARACTERS.test(path) &&
			// A file system that ignores case stores `skill.md` and `SKILL.md` as one file.
			segments[0].toLowerCase() !== 'skill.md' &&
			!/^[A-Za-z]:/.test(path) &&
			segments.every((segment) => segment !== '' && segment !== '.' && segment !== '..')
		);
	}, 'Use a relative file path within the skill folder');

const base64Schema = z.string().base64();

export const agentSkillReferenceSchema = z
	.object({
		path: agentSkillReferencePathSchema,
		content: z.string(),
		/** When set, content holds the file bytes as Base64. Otherwise, content is UTF-8 text. */
		isBinary: z.literal(true).optional(),
	})
	.strict()
	.superRefine(({ content, isBinary }, ctx) => {
		const maximum = isBinary
			? AGENT_SKILL_BINARY_CONTENT_MAX_LENGTH
			: AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH;
		if (content.length > maximum) {
			ctx.addIssue({
				code: 'too_big',
				type: 'string',
				maximum,
				inclusive: true,
				path: ['content'],
			});
		} else if (isBinary ? !base64Schema.safeParse(content).success : content.includes('\0')) {
			ctx.addIssue({ code: 'custom', message: 'Invalid file contents', path: ['content'] });
		}
	});

export type AgentSkillReference = z.infer<typeof agentSkillReferenceSchema>;

export const skillReferenceReadShape = {
	referencePath: agentSkillReferencePathSchema
		.optional()
		.describe('Return text only for this reference path'),
	referenceOffset: z
		.number()
		.int()
		.nonnegative()
		.optional()
		.describe('Pass nextOffset from the previous result with the same referencePath'),
};

export type SkillReferenceRead = z.infer<z.ZodObject<typeof skillReferenceReadShape>>;

export function projectSkillDetailsForModel<T extends { references?: AgentSkillReference[] }>(
	skill: T,
	{ referencePath, referenceOffset }: SkillReferenceRead = {},
) {
	if (referenceOffset !== undefined && referencePath === undefined) {
		return { error: 'Pass referencePath with referenceOffset.' };
	}
	return projectSkillForModel(skill, {
		paths: referencePath === undefined ? undefined : [referencePath],
		offset: referenceOffset,
		maxLength: 72 * 1024,
	});
}

/** List paths and limit the reference text by UTF-16 code units. Do not return binary content. */
export function projectSkillForModel<T extends { references?: AgentSkillReference[] }>(
	skill: T,
	{ paths, offset = 0, maxLength }: { paths?: string[]; offset?: number; maxLength: number },
) {
	const { references, ...body } = skill;
	const requested = paths && new Set(paths);
	const omittedReferencePaths: string[] = [];
	let remaining = maxLength;
	const visibleReferences = references?.map(({ path, content, isBinary }) => {
		const included = requested?.delete(path) ?? true;
		const listed = { path, characterCount: content.length };
		if (isBinary) return { ...listed, isBinary };
		if (!included) return listed;
		const start = Math.min(offset, content.length);
		const length = content.length - start;
		if (length <= remaining) {
			remaining -= length;
			return { ...listed, content: content.slice(start) };
		}
		if (remaining === maxLength) {
			let end = start + remaining;
			// Keep the two code units of a character in the same part.
			if ((content.codePointAt(end - 1) ?? 0) > 0xffff) end--;
			remaining = 0;
			return {
				...listed,
				content: content.slice(start, end),
				contentTruncated: true,
				nextOffset: end,
			};
		}
		omittedReferencePaths.push(path);
		return listed;
	});

	return {
		skill: { ...body, ...(visibleReferences ? { references: visibleReferences } : {}) },
		...(omittedReferencePaths.length ? { truncated: true, omittedReferencePaths } : {}),
		...(requested?.size ? { missingReferencePaths: [...requested] } : {}),
	};
}

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
export const AGENT_SKILL_NAME_MAX_LENGTH = 128;
/** The limit of the Agent Skills format, so skills from other tools fit without cuts. */
export const AGENT_SKILL_DESCRIPTION_MAX_LENGTH = 1024;

export const SKILL_INSTRUCTIONS_REQUIRED_MESSAGE = 'Skill instructions are required.';

/** Skill instructions need at least one character that is not white space. */
export function hasSkillInstructions(instructions: string): boolean {
	return instructions.trim().length > 0;
}

export const agentSkillShape = {
	name: z.string().min(1).max(AGENT_SKILL_NAME_MAX_LENGTH),
	description: z
		.string()
		.min(1)
		.max(
			AGENT_SKILL_DESCRIPTION_MAX_LENGTH,
			`Description must be ${AGENT_SKILL_DESCRIPTION_MAX_LENGTH} characters or fewer`,
		),
	// Measured in characters like the name, description and reference limits,
	// so the editor can show the user the same count the server enforces.
	instructions: z
		.string()
		.max(
			AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH,
			`Instructions must be ${AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH} characters or fewer`,
		)
		.refine(hasSkillInstructions, SKILL_INSTRUCTIONS_REQUIRED_MESSAGE),
	allowedTools: agentSkillStringArraySchema.optional(),
	references: agentSkillReferencesSchema.optional(),
	scripts: z.never().optional(),
	templates: z.never().optional(),
	assets: z.never().optional(),
	examples: z.never().optional(),
	other: z.never().optional(),
};

export const agentSkillSchema = z.object(agentSkillShape).strict();

/** Who owns a skill: one project, or the instance. `skillScopeSchema` is the same enum. */
export const agentSkillAvailabilitySchema = z.enum(['project', 'instance']);

export type AgentSkillAvailability = z.infer<typeof agentSkillAvailabilitySchema>;

/**
 * How a person made a new skill in the skill modal: typed it, or uploaded a SKILL.md file
 * or folder. The browser parses an upload, so only the client knows. Telemetry reads it
 * and the server does not store it.
 */
export const skillCreateMethodSchema = z.enum(['manual', 'upload']);

export type SkillCreateMethod = z.infer<typeof skillCreateMethodSchema>;

export const createAgentSkillSchema = agentSkillSchema.extend({
	availableTo: agentSkillAvailabilitySchema.optional(),
	method: skillCreateMethodSchema.optional(),
});
