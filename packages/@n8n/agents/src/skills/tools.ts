import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';
import { posix } from 'path';
import { z } from 'zod';

import { Tool } from '../sdk/tool';
import type { BuiltTool } from '../types';
import {
	RUNTIME_SKILL_FILE_NAME,
	RUNTIME_SKILL_MAX_OUTPUT_BYTES,
	SKILL_LOAD_TOOL_NAME,
	type RuntimeSkillLinkedFile,
	type RuntimeSkillLinkedFiles,
	type RuntimeSkillRegistry,
	type RuntimeSkillRegistryEntry,
	type RuntimeSkillSource,
	type RuntimeSkillLoader,
	type RuntimeSkillContent,
} from './types';

const TRUNCATION_FOOTER = `\n\n[... output truncated to ${RUNTIME_SKILL_MAX_OUTPUT_BYTES / 1024} KB ...]`;
const LINKED_FILE_GROUPS: Array<keyof RuntimeSkillLinkedFiles> = [
	'references',
	'templates',
	'scripts',
	'assets',
	'examples',
	'other',
];

export const RUNTIME_SKILL_TOOL_NAMES = new Set([SKILL_LOAD_TOOL_NAME]);

const linkedFileSchema: z.ZodType<RuntimeSkillLinkedFile> = z.object({
	path: z.string(),
	bytes: z.number(),
	sha256: z.string(),
});

const linkedFilesSchema: z.ZodType<RuntimeSkillLinkedFiles> = z.object({
	references: z.array(linkedFileSchema),
	templates: z.array(linkedFileSchema),
	scripts: z.array(linkedFileSchema),
	assets: z.array(linkedFileSchema),
	examples: z.array(linkedFileSchema),
	other: z.array(linkedFileSchema),
});

const skillLoadBaseInputSchema = z.object({
	skillId: z.string().min(1).optional().describe('Skill id from the skill catalog.'),
	name: z.string().min(1).optional().describe('Skill name from the skill catalog.'),
});
const skillLoadInputSchema = skillLoadBaseInputSchema.refine(
	({ skillId, name }) => skillId !== undefined || name !== undefined,
	{
		message: 'Either skillId or name is required.',
		path: ['skillId'],
	},
);

const skillLoadInputWithFilesSchema = skillLoadBaseInputSchema
	.extend({
		filePath: z
			.string()
			.optional()
			.describe('Optional linked file path relative to the skill directory.'),
	})
	.refine(({ skillId, name }) => skillId !== undefined || name !== undefined, {
		message: 'Either skillId or name is required.',
		path: ['skillId'],
	});

const skillLoadOutputSchema = z.object({
	ok: z.boolean().optional(),
	success: z.boolean(),
	skillId: z.string().optional(),
	name: z.string().optional(),
	description: z.string().optional(),
	path: z.string().optional(),
	skillDir: z.string().optional(),
	hash: z.string().optional(),
	category: z.string().optional(),
	content: z.string().optional(),
	filePath: z.string().optional(),
	bytes: z.number().optional(),
	sha256: z.string().optional(),
	activation: z.string().optional(),
	references: z.array(z.object({ skillId: z.string(), description: z.string() })).optional(),
	linkedFiles: linkedFilesSchema.optional(),
	error: z.string().optional(),
	availableSkills: z.array(z.string()).optional(),
});

const skillLoadContentOutputSchema = z.object({
	type: z.literal('content'),
	value: z.array(z.object({ type: z.literal('text'), text: z.string() })),
});

const skillLoadResultSchema = z.union([skillLoadContentOutputSchema, skillLoadOutputSchema]);

type SkillLoadOutput = z.infer<typeof skillLoadOutputSchema>;

/** Main-skill success result; passed through as a text tool_result without JSON escaping. */
type SkillLoadContentOutput = z.infer<typeof skillLoadContentOutputSchema>;

export function createRuntimeSkillTools(source: RuntimeSkillSource): BuiltTool[] {
	return [createSkillLoadTool(source)];
}

export function createSkillLoadTool(source: RuntimeSkillSource): BuiltTool {
	if (!source.loadFile) {
		return new Tool(SKILL_LOAD_TOOL_NAME)
			.description(
				'Load a skill by skillId or name. This source does not support linked files, so do not pass filePath.',
			)
			.input(skillLoadInputSchema)
			.output(skillLoadResultSchema)
			.handler(
				async ({ skillId, name }, context) =>
					await loadSkill(source, { skillId, name }, context.loadSkill),
			)
			.build();
	}

	const loadFile = source.loadFile;
	return new Tool(SKILL_LOAD_TOOL_NAME)
		.description(
			'Load a skill by skillId or name. Omit filePath to load the main skill instructions; use filePath only for a linked file path returned in linkedFiles.',
		)
		.input(skillLoadInputWithFilesSchema)
		.output(skillLoadResultSchema)
		.handler(
			async ({ skillId, name, filePath }, context) =>
				await loadSkill(source, { skillId, name, filePath, loadFile }, context.loadSkill),
		)
		.build();
}

async function loadSkill(
	source: RuntimeSkillSource,
	input: {
		skillId?: string;
		name?: string;
		filePath?: string;
		loadFile?: NonNullable<RuntimeSkillSource['loadFile']>;
	},
	activate?: RuntimeSkillLoader,
): Promise<SkillLoadOutput | SkillLoadContentOutput> {
	const { skillId, name, loadFile } = input;
	await source.prepare?.();
	const requestedEntry = findSkillEntry(source.registry, { skillId, name });
	// A path to a reference file activates the reference instead of returning raw text.
	const referenceEntry =
		requestedEntry && input.filePath !== undefined
			? findReferenceByPath(source.registry, requestedEntry.id, input.filePath)
			: undefined;
	const skillEntry = referenceEntry ?? requestedEntry;
	const filePath = referenceEntry ? undefined : input.filePath;
	if (!skillEntry) {
		return {
			ok: false,
			success: false,
			error: `Unknown skill: ${skillId ?? name ?? ''}`,
			availableSkills: source.registry.skills.map((entry) => entry.id).slice(0, 20),
		};
	}

	const loadMainSkill = isMainSkillFilePath(filePath);
	if (!loadMainSkill) {
		const linkedFilePath = filePath ?? '';
		const linkedFile = findRegisteredLinkedFile(skillEntry.linkedFiles, linkedFilePath);
		if (!linkedFile) {
			return {
				ok: false,
				success: false,
				skillId: skillEntry.id,
				name: skillEntry.name,
				filePath: linkedFilePath,
				error: `File is not registered for skill ${skillEntry.name}: ${linkedFilePath}. To load the main skill instructions, retry without filePath.`,
				linkedFiles: skillEntry.linkedFiles,
			};
		}

		if (!loadFile) {
			return {
				ok: false,
				success: false,
				skillId: skillEntry.id,
				name: skillEntry.name,
				filePath: linkedFilePath,
				error: 'This skill source does not support loading linked files.',
				linkedFiles: skillEntry.linkedFiles,
			};
		}

		const file = await loadFile(skillEntry.id, linkedFile.path);
		if (!file) {
			return {
				ok: false,
				success: false,
				skillId: skillEntry.id,
				name: skillEntry.name,
				filePath: linkedFilePath,
				error: `File is not registered for skill ${skillEntry.name}: ${linkedFilePath}`,
				linkedFiles: skillEntry.linkedFiles,
			};
		}

		return {
			ok: true,
			success: true,
			skillId: skillEntry.id,
			name: skillEntry.name,
			path: skillEntry.directory ? `${skillEntry.directory}/${linkedFile.path}` : linkedFile.path,
			skillDir: skillEntry.directory,
			hash: skillEntry.hash,
			category: skillEntry.category,
			filePath: linkedFile.path,
			content: cap(file.content),
			bytes: file.bytes ?? linkedFile.bytes,
			sha256: file.sha256 ?? linkedFile.sha256,
		};
	}

	const skill = await (activate ?? source.loadSkill)(skillEntry.id);
	if (!skill) {
		return {
			ok: false,
			success: false,
			skillId: skillEntry.id,
			name: skillEntry.name,
			error: `Skill "${skillEntry.name}" is not attached to this agent.`,
			availableSkills: source.registry.skills.map((entry) => entry.id).slice(0, 20),
		};
	}

	if (activate) {
		const { references, linkedFiles } = skillReferences(skillEntry, source.registry);
		return {
			success: true,
			skillId: skillEntry.id,
			name: skillEntry.name,
			hash: skillEntry.hash,
			content: 'The skill instructions are active. Follow them for this task.',
			...(references.length > 0
				? {
						references: references.map((entry) => ({
							skillId: entry.id,
							description: entry.description,
						})),
					}
				: {}),
			linkedFiles,
		};
	}
	return {
		type: 'content',
		value: [{ type: 'text', text: formatActiveSkill(skill, skillEntry, source.registry) }],
	};
}

export function formatActiveSkill(
	skill: RuntimeSkillContent,
	skillEntry: RuntimeSkillRegistryEntry,
	registry?: RuntimeSkillRegistry,
): string {
	const content = cap(skill.instructions);
	const { references, linkedFiles } = skillReferences(skillEntry, registry);
	const linkedFilePaths = LINKED_FILE_GROUPS.flatMap((group) => linkedFiles[group]).map(
		(file) => file.path,
	);
	const header = [
		activationEnvelope(skillEntry),
		...(references.length > 0
			? [
					[
						'[References — load one via load_skill with { "skillId": "<id>" } only when its description matches the current step:',
						...references.map(
							(entry) => `- ${envelopeValue(entry.id)}: ${envelopeValue(entry.description)}`,
						),
						']',
					].join('\n'),
				]
			: []),
		...(linkedFilePaths.length > 0
			? [
					`[Linked files — load via load_skill with filePath: ${linkedFilePaths.map(envelopeValue).join(', ')}]`,
				]
			: []),
	];
	return `${header.join('\n')}\n\n${content}`;
}

/** A skill's references, and its linked files without the files those references come from. */
function skillReferences(
	skillEntry: RuntimeSkillRegistryEntry,
	registry: RuntimeSkillRegistry | undefined,
): { references: RuntimeSkillRegistryEntry[]; linkedFiles: RuntimeSkillLinkedFiles } {
	const references = (registry?.skills ?? []).filter((entry) =>
		entry.parents?.includes(skillEntry.id),
	);
	const referencePaths = new Set(
		references.flatMap((entry) =>
			entry.reference?.owner === skillEntry.id ? [entry.reference.path] : [],
		),
	);
	if (referencePaths.size === 0) return { references, linkedFiles: skillEntry.linkedFiles };
	return {
		references,
		linkedFiles: {
			...skillEntry.linkedFiles,
			references: skillEntry.linkedFiles.references.filter(
				(file) => !referencePaths.has(file.path),
			),
		},
	};
}

/** The reference skill that a parent's linked file path points to, if any. */
export function findReferenceByPath(
	registry: RuntimeSkillRegistry,
	ownerId: string,
	filePath: string,
): RuntimeSkillRegistryEntry | undefined {
	const normalized = posix.normalize(filePath.trim());
	return registry.skills.find(
		(entry) => entry.reference?.owner === ownerId && entry.reference.path === normalized,
	);
}

function findSkillEntry(
	registry: RuntimeSkillRegistry,
	input: { skillId?: string; name?: string },
): RuntimeSkillRegistryEntry | undefined {
	if (input.skillId) {
		const skillById = registry.skills.find((entry) => entry.id === input.skillId);
		if (skillById) return skillById;
	}

	if (input.name) {
		return registry.skills.find((entry) => entry.name === input.name);
	}

	return undefined;
}

function activationEnvelope(skill: RuntimeSkillRegistryEntry): string {
	return [
		`[Skill: ${envelopeValue(skill.name)}]`,
		...(skill.parents?.length
			? [`[Reference of: ${skill.parents.map(envelopeValue).join(', ')}]`]
			: []),
		...(skill.category ? [`[Skill category: ${envelopeValue(skill.category)}]`] : []),
		...(skill.directory ? [`[Skill directory: ${envelopeValue(skill.directory)}]`] : []),
		...((skill.path ?? skill.sourcePath)
			? [`[Skill path: ${envelopeValue(skill.path ?? skill.sourcePath ?? '')}]`]
			: []),
		`[Skill hash: ${envelopeValue(skill.hash)}]`,
	].join('\n');
}

function findRegisteredLinkedFile(
	linkedFiles: RuntimeSkillLinkedFiles,
	filePath: string,
): RuntimeSkillLinkedFile | undefined {
	for (const group of LINKED_FILE_GROUPS) {
		const linkedFile = linkedFiles[group].find((file) => file.path === filePath);
		if (linkedFile) return linkedFile;
	}
	return undefined;
}

function isMainSkillFilePath(filePath?: string): boolean {
	if (filePath === undefined) return true;
	const normalized = filePath.trim();
	return (
		normalized === '' ||
		normalized === '/' ||
		normalized === '.' ||
		normalized === RUNTIME_SKILL_FILE_NAME
	);
}

function envelopeValue(value: string): string {
	return JSON.stringify(value);
}

function cap(content: string): string {
	const redacted = scrubSecretsInText(content);
	const bytes = Buffer.from(redacted, 'utf8');
	if (bytes.byteLength <= RUNTIME_SKILL_MAX_OUTPUT_BYTES) return redacted;
	return `${bytes.subarray(0, RUNTIME_SKILL_MAX_OUTPUT_BYTES).toString('utf8')}${TRUNCATION_FOOTER}`;
}
