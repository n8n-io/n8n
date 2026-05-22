import { z } from 'zod';

import { Tool } from '../sdk/tool';
import type { BuiltTool } from '../types';
import {
	LIST_SKILLS_TOOL_NAME,
	SKILL_LOAD_TOOL_NAME,
	type RuntimeSkillLinkedFile,
	type RuntimeSkillLinkedFiles,
	type RuntimeSkillRegistry,
	type RuntimeSkillRegistryEntry,
	type RuntimeSkillSource,
} from './types';

const MAX_OUTPUT_BYTES = 64 * 1024;
const TRUNCATION_FOOTER = '\n\n[... output truncated to 64 KB ...]';
const SECRET_REDACTION = '[REDACTED]';
const LINKED_FILE_GROUPS: Array<keyof RuntimeSkillLinkedFiles> = [
	'references',
	'templates',
	'scripts',
	'assets',
	'examples',
	'other',
];

export const RUNTIME_SKILL_TOOL_NAMES = new Set([LIST_SKILLS_TOOL_NAME, SKILL_LOAD_TOOL_NAME]);

const skillsListInputSchema = z.object({
	category: z.string().optional().describe('Optional exact category filter.'),
});

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

const skillInterfaceSchema = z
	.object({
		displayName: z.string().optional(),
		shortDescription: z.string().optional(),
		defaultPrompt: z.string().optional(),
		icon: z.string().optional(),
		brandColor: z.string().optional(),
	})
	.optional();

const skillPolicySchema = z
	.object({
		allowImplicitInvocation: z.boolean().optional(),
		product: z.string().optional(),
	})
	.optional();

const skillDependenciesSchema = z
	.object({
		tools: z.array(z.string()).optional(),
		secrets: z.array(z.string()).optional(),
		mcpServers: z
			.array(
				z.object({
					name: z.string(),
					description: z.string().optional(),
					transport: z.string().optional(),
					url: z.string().optional(),
					command: z.string().optional(),
				}),
			)
			.optional(),
	})
	.optional();

const compactSkillSchema = z.object({
	name: z.string(),
	description: z.string(),
	category: z.string().optional(),
	path: z.string().optional(),
	directory: z.string().optional(),
	hash: z.string(),
	recommendedTools: z.array(z.string()).optional(),
	allowedTools: z.array(z.string()).optional(),
	interface: skillInterfaceSchema,
	policy: skillPolicySchema,
	dependencies: skillDependenciesSchema,
	platforms: z.array(z.string()).optional(),
});

const skillsListOutputSchema = z.object({
	success: z.boolean(),
	registryHash: z.string(),
	count: z.number(),
	categories: z.array(z.string()),
	skills: z.array(compactSkillSchema),
});

const skillLoadInputSchema = z
	.object({
		skillId: z.string().min(1).optional().describe('Skill id from list_skills.'),
		name: z.string().min(1).optional().describe('Skill name from list_skills.'),
		filePath: z
			.string()
			.min(1)
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
	instructions: z.string().optional(),
	filePath: z.string().optional(),
	bytes: z.number().optional(),
	sha256: z.string().optional(),
	activation: z.string().optional(),
	linkedFiles: linkedFilesSchema.optional(),
	error: z.string().optional(),
	availableSkills: z.array(z.string()).optional(),
});

export function createRuntimeSkillTools(source: RuntimeSkillSource): BuiltTool[] {
	return [createListSkillsTool(source), createSkillLoadTool(source)];
}

export function createListSkillsTool(source: RuntimeSkillSource): BuiltTool {
	return new Tool(LIST_SKILLS_TOOL_NAME)
		.description(
			'List installed skills from the registry. Use before loading a skill when you need to discover available domains.',
		)
		.input(skillsListInputSchema)
		.output(skillsListOutputSchema)
		.handler(async ({ category }) => {
			const skills = source.registry.skills
				.filter((skill) => !category || skill.category === category)
				.map(compactSkill);

			return await Promise.resolve({
				success: true,
				registryHash: source.registry.skillsHash,
				count: skills.length,
				categories: categoriesFor(source.registry),
				skills,
			});
		})
		.build();
}

export function createSkillLoadTool(source: RuntimeSkillSource): BuiltTool {
	return new Tool(SKILL_LOAD_TOOL_NAME)
		.description(
			'Load an installed skill SKILL.md, or a registered linked file by relative filePath.',
		)
		.input(skillLoadInputSchema)
		.output(skillLoadOutputSchema)
		.handler(async ({ skillId, name, filePath }) => {
			await source.prepare?.();
			const skillEntry = findSkillEntry(source.registry, { skillId, name });
			if (!skillEntry) {
				return {
					ok: false,
					success: false,
					error: `Unknown skill: ${skillId ?? name ?? ''}`,
					availableSkills: source.registry.skills.map((entry) => entry.id).slice(0, 20),
				};
			}

			if (filePath !== undefined) {
				const linkedFile = findRegisteredLinkedFile(skillEntry.linkedFiles, filePath);
				if (!linkedFile) {
					return {
						ok: false,
						success: false,
						skillId: skillEntry.id,
						name: skillEntry.name,
						filePath,
						error: `File is not registered for skill ${skillEntry.name}: ${filePath}`,
						linkedFiles: skillEntry.linkedFiles,
					};
				}

				if (!source.loadFile) {
					return {
						ok: false,
						success: false,
						skillId: skillEntry.id,
						name: skillEntry.name,
						filePath,
						error: 'This skill source does not support loading linked files.',
						linkedFiles: skillEntry.linkedFiles,
					};
				}

				const file = await source.loadFile(skillEntry.id, linkedFile.path);
				if (!file) {
					return {
						ok: false,
						success: false,
						skillId: skillEntry.id,
						name: skillEntry.name,
						filePath,
						error: `File is not registered for skill ${skillEntry.name}: ${filePath}`,
						linkedFiles: skillEntry.linkedFiles,
					};
				}

				return {
					ok: true,
					success: true,
					skillId: skillEntry.id,
					name: skillEntry.name,
					path: skillEntry.directory
						? `${skillEntry.directory}/${linkedFile.path}`
						: linkedFile.path,
					skillDir: skillEntry.directory,
					hash: skillEntry.hash,
					category: skillEntry.category,
					filePath: linkedFile.path,
					content: cap(file.content),
					bytes: file.bytes ?? linkedFile.bytes,
					sha256: file.sha256 ?? linkedFile.sha256,
				};
			}

			const skill = await source.loadSkill(skillEntry.id);
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

			const content = cap(skill.instructions);
			return {
				ok: true,
				success: true,
				skillId: skillEntry.id,
				name: skillEntry.name,
				description: skill.description,
				path: skillEntry.path ?? skillEntry.sourcePath,
				skillDir: skillEntry.directory,
				hash: skillEntry.hash,
				category: skillEntry.category,
				content,
				instructions: content,
				activation: activationEnvelope(skillEntry),
				linkedFiles: skillEntry.linkedFiles,
			};
		})
		.build();
}

function compactSkill(skill: RuntimeSkillRegistryEntry) {
	return {
		name: skill.name,
		description: skill.description,
		...(skill.category ? { category: skill.category } : {}),
		...(skill.path ? { path: skill.path } : {}),
		...(skill.directory ? { directory: skill.directory } : {}),
		hash: skill.hash,
		...(skill.recommendedTools ? { recommendedTools: skill.recommendedTools } : {}),
		...(skill.allowedTools ? { allowedTools: skill.allowedTools } : {}),
		...(skill.interface ? { interface: skill.interface } : {}),
		...(skill.policy ? { policy: skill.policy } : {}),
		...(skill.dependencies ? { dependencies: skill.dependencies } : {}),
		...(skill.platforms ? { platforms: skill.platforms } : {}),
	};
}

function categoriesFor(registry: RuntimeSkillRegistry): string[] {
	return Array.from(
		new Set(registry.skills.map((skill) => skill.category).filter(isPresentString)),
	).sort();
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

function envelopeValue(value: string): string {
	return JSON.stringify(value);
}

function cap(content: string): string {
	const redacted = redactSecrets(content);
	const bytes = Buffer.from(redacted, 'utf8');
	if (bytes.byteLength <= MAX_OUTPUT_BYTES) return redacted;
	return `${bytes.subarray(0, MAX_OUTPUT_BYTES).toString('utf8')}${TRUNCATION_FOOTER}`;
}

function redactSecrets(content: string): string {
	return content
		.replace(/\b(authorization)(\s*:\s*Bearer\s+)[^\s"',;]+/gi, `$1$2${SECRET_REDACTION}`)
		.replace(
			/\b(api[_-]?key|token|password|passwd|secret|credential)(\s*[:=]\s*)(["']?)[^\s"',;]+(\3)/gi,
			`$1$2$3${SECRET_REDACTION}$4`,
		);
}

function isPresentString(value: string | undefined): value is string {
	return typeof value === 'string' && value.length > 0;
}
