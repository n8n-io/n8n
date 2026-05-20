import { z } from 'zod';

import { Tool } from '../sdk/tool';
import type { BuiltTool } from '../types';
import {
	SKILLS_LIST_TOOL_NAME,
	SKILL_VIEW_TOOL_NAME,
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

export const RUNTIME_SKILL_TOOL_NAMES = new Set([SKILLS_LIST_TOOL_NAME, SKILL_VIEW_TOOL_NAME]);

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

const skillViewInputSchema = z.object({
	name: z.string().describe('Skill name from skills_list.'),
	filePath: z
		.string()
		.min(1)
		.optional()
		.describe('Optional linked file path relative to the skill directory.'),
});

const skillViewOutputSchema = z.object({
	success: z.boolean(),
	name: z.string().optional(),
	path: z.string().optional(),
	skillDir: z.string().optional(),
	hash: z.string().optional(),
	category: z.string().optional(),
	content: z.string().optional(),
	filePath: z.string().optional(),
	bytes: z.number().optional(),
	sha256: z.string().optional(),
	activation: z.string().optional(),
	linkedFiles: linkedFilesSchema.optional(),
	error: z.string().optional(),
	availableSkills: z.array(z.string()).optional(),
});

export function createRuntimeSkillTools(source: RuntimeSkillSource): BuiltTool[] {
	return [createSkillsListTool(source), createSkillViewTool(source)];
}

export function createSkillsListTool(source: RuntimeSkillSource): BuiltTool {
	return new Tool(SKILLS_LIST_TOOL_NAME)
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

export function createSkillViewTool(source: RuntimeSkillSource): BuiltTool {
	return new Tool(SKILL_VIEW_TOOL_NAME)
		.description(
			'Read an installed skill SKILL.md, or a registered linked file by relative filePath.',
		)
		.input(skillViewInputSchema)
		.output(skillViewOutputSchema)
		.handler(async ({ name, filePath }) => {
			const skillEntry = source.registry.skills.find((entry) => entry.name === name);
			if (!skillEntry) {
				return {
					success: false,
					error: `Unknown skill: ${name}`,
					availableSkills: source.registry.skills.map((entry) => entry.name).slice(0, 20),
				};
			}

			if (filePath !== undefined) {
				const linkedFile = findRegisteredLinkedFile(skillEntry.linkedFiles, filePath);
				if (!linkedFile) {
					return {
						success: false,
						name,
						filePath,
						error: `File is not registered for skill ${name}: ${filePath}`,
						linkedFiles: skillEntry.linkedFiles,
					};
				}

				if (!source.loadFile) {
					return {
						success: false,
						name,
						filePath,
						error: 'This skill source does not support loading linked files.',
						linkedFiles: skillEntry.linkedFiles,
					};
				}

				const file = await source.loadFile(skillEntry.id, linkedFile.path);
				if (!file) {
					return {
						success: false,
						name,
						filePath,
						error: `File is not registered for skill ${name}: ${filePath}`,
						linkedFiles: skillEntry.linkedFiles,
					};
				}

				return {
					success: true,
					name,
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
					success: false,
					name,
					error: `Skill "${name}" is not attached to this agent.`,
					availableSkills: source.registry.skills.map((entry) => entry.name).slice(0, 20),
				};
			}

			return {
				success: true,
				name: skillEntry.name,
				path: skillEntry.path ?? skillEntry.sourcePath,
				skillDir: skillEntry.directory,
				hash: skillEntry.hash,
				category: skillEntry.category,
				content: cap(skill.instructions),
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
