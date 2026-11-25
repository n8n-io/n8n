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
// from the stored path. U+200C and U+200D stay valid, because Persian and Indic scripts use
// them inside words.
const HIDDEN_PATH_CHARACTERS = /[\u200b\u200e\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/;

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

/** Why a reference read is not valid. A tool refuses the read with this text. */
export function skillReferenceReadError({
	referencePath,
	referenceOffset,
}: SkillReferenceRead = {}): string | undefined {
	return referenceOffset !== undefined && referencePath === undefined
		? 'Pass referencePath with referenceOffset.'
		: undefined;
}

/**
 * Maximum JSON-serialized UTF-8 bytes for one projected skill read.
 * A BPE token is at least one UTF-8 byte, so keeping the response below the runtime's
 * 50,000-token tool-result limit (with headroom for outer tool fields) prevents a second
 * truncation after `nextOffset` is computed.
 */
export const SKILL_READ_MAX_BYTES = 40 * 1024;

/** Minimum per-page byte budget when a caller explicitly requests reference paths on a large skill. */
const SKILL_READ_MIN_EXPLICIT_REFERENCE_BYTES = 8 * 1024;

/** Byte overhead of adding `,"content":""` to a listed reference entry. */
const CONTENT_FIELD_OVERHEAD_BYTES = 13;

/** Byte overhead of adding `,"contentTruncated":true,"nextOffset":<digits>` to a listed entry. */
const TRUNCATED_FIELD_OVERHEAD_BYTES = 48;

/** Byte overhead of adding `,"truncated":true,"omittedReferencePaths":[]` to the projection. */
const OMITTED_ENVELOPE_OVERHEAD_BYTES = 44;

const utf8Encoder = new TextEncoder();

function utf8ByteLength(value: string): number {
	return utf8Encoder.encode(value).byteLength;
}

/** UTF-8 bytes that one code point at `index` occupies inside a JSON string, plus its UTF-16 width. */
function jsonCodePointSize(content: string, index: number): { bytes: number; codeUnits: number } {
	const code = content.charCodeAt(index);
	if (code < 0x80) {
		if (code === 0x22 || code === 0x5c || (code >= 0x08 && code <= 0x0d && code !== 0x0b)) {
			return { bytes: 2, codeUnits: 1 };
		}
		if (code < 0x20) return { bytes: 6, codeUnits: 1 };
		return { bytes: 1, codeUnits: 1 };
	}
	if (code < 0x800) return { bytes: 2, codeUnits: 1 };
	if (code >= 0xd800 && code <= 0xdbff) {
		const next = content.charCodeAt(index + 1);
		if (next >= 0xdc00 && next <= 0xdfff) return { bytes: 4, codeUnits: 2 };
		return { bytes: 6, codeUnits: 1 };
	}
	if (code >= 0xdc00 && code <= 0xdfff) return { bytes: 6, codeUnits: 1 };
	return { bytes: 3, codeUnits: 1 };
}

/** Measure how much of `content.slice(start)` fits inside `budgetBytes` of JSON string bytes. */
function sliceToJsonBytes(
	content: string,
	start: number,
	budgetBytes: number,
): { end: number; bytes: number } {
	let index = start;
	let bytes = 0;
	while (index < content.length) {
		const next = jsonCodePointSize(content, index);
		if (bytes + next.bytes > budgetBytes) break;
		bytes += next.bytes;
		index += next.codeUnits;
	}
	return { end: index, bytes };
}

export function projectSkillDetailsForModel<T extends { references?: AgentSkillReference[] }>(
	skill: T,
	{ referencePath, referenceOffset }: SkillReferenceRead = {},
) {
	return projectSkillForModel(skill, {
		paths: referencePath === undefined ? undefined : [referencePath],
		offset: referenceOffset,
		maxBytes: SKILL_READ_MAX_BYTES,
	});
}

/**
 * List paths and limit the serialized projection by JSON UTF-8 bytes so the full response stays
 * within the runtime tool-result limit. Never returns binary content.
 */
export function projectSkillForModel<T extends { references?: AgentSkillReference[] }>(
	skill: T,
	{ paths, offset = 0, maxBytes }: { paths?: string[]; offset?: number; maxBytes: number },
) {
	const { references, ...body } = skill;
	const requested = paths && new Set(paths);
	const omittedReferencePaths: string[] = [];

	const referenceList = references ?? [];
	const existingPaths = new Set(referenceList.map((reference) => reference.path));
	const missingReferencePaths = requested
		? [...requested].filter((path) => !existingPaths.has(path))
		: [];
	const includedIndices = referenceList.map(
		({ path, isBinary }) => !isBinary && (requested ? requested.has(path) : true),
	);

	// Precompute the exact JSON byte cost of omitting all later included text references,
	// so truncating an oversized file reserves room for `omittedReferencePaths`.
	const suffixOmittedBytes = new Array<number>(referenceList.length).fill(0);
	let trailingOmittedBytes = 0;
	let trailingOmittedCount = 0;
	for (let index = referenceList.length - 1; index >= 0; index--) {
		suffixOmittedBytes[index] =
			trailingOmittedCount > 0 ? trailingOmittedBytes + (trailingOmittedCount - 1) : 0;
		if (includedIndices[index]) {
			trailingOmittedBytes += utf8ByteLength(JSON.stringify(referenceList[index].path));
			trailingOmittedCount += 1;
		}
	}

	const baseReferences = references?.map(({ path, content, isBinary }) => ({
		path,
		characterCount: content.length,
		...(isBinary ? { isBinary } : {}),
	}));
	const baseBytes =
		maxBytes <= 0
			? 0
			: utf8ByteLength(
					JSON.stringify({
						skill: { ...body, ...(baseReferences ? { references: baseReferences } : {}) },
						...(missingReferencePaths.length ? { missingReferencePaths } : {}),
					}),
				);
	const explicitRequest = paths !== undefined && paths.length > 0;
	const initialBudget =
		maxBytes <= 0
			? 0
			: explicitRequest
				? Math.min(
						maxBytes,
						Math.max(SKILL_READ_MIN_EXPLICIT_REFERENCE_BYTES, maxBytes - baseBytes),
					)
				: Math.max(0, maxBytes - baseBytes);
	let remaining = initialBudget;
	let hasIncludedContent = false;

	const visibleReferences = references?.map(({ path, content, isBinary }, index) => {
		const included = requested?.delete(path) ?? true;
		const listed = { path, characterCount: content.length };
		if (isBinary) return { ...listed, isBinary };
		if (!included) return listed;

		const start = Math.min(offset, content.length);
		const fullFitBudget = remaining - CONTENT_FIELD_OVERHEAD_BYTES;
		if (fullFitBudget >= 0) {
			const { end, bytes } = sliceToJsonBytes(content, start, fullFitBudget);
			if (end === content.length) {
				remaining -= bytes + CONTENT_FIELD_OVERHEAD_BYTES;
				hasIncludedContent = true;
				return { ...listed, content: content.slice(start) };
			}
		}

		if (!hasIncludedContent && remaining > 0) {
			const futureOmittedBytes =
				suffixOmittedBytes[index] > 0
					? suffixOmittedBytes[index] +
						(omittedReferencePaths.length === 0 ? OMITTED_ENVELOPE_OVERHEAD_BYTES : 1)
					: 0;
			const sliceBudget = Math.max(
				0,
				remaining -
					CONTENT_FIELD_OVERHEAD_BYTES -
					TRUNCATED_FIELD_OVERHEAD_BYTES -
					futureOmittedBytes,
			);
			let { end } = sliceToJsonBytes(content, start, sliceBudget);
			if (end === start && start < content.length) {
				// Always advance at least one whole character so nextOffset makes forward progress.
				end = start + jsonCodePointSize(content, start).codeUnits;
			}
			remaining = 0;
			hasIncludedContent = true;
			if (end === content.length) {
				return { ...listed, content: content.slice(start) };
			}
			return {
				...listed,
				content: content.slice(start, end),
				contentTruncated: true,
				nextOffset: end,
			};
		}

		omittedReferencePaths.push(path);
		const omittedCost =
			utf8ByteLength(JSON.stringify(path)) +
			(omittedReferencePaths.length === 1 ? OMITTED_ENVELOPE_OVERHEAD_BYTES : 1);
		remaining = Math.max(0, remaining - omittedCost);
		return listed;
	});

	return {
		skill: { ...body, ...(visibleReferences ? { references: visibleReferences } : {}) },
		...(omittedReferencePaths.length ? { truncated: true, omittedReferencePaths } : {}),
		...(missingReferencePaths.length ? { missingReferencePaths } : {}),
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
