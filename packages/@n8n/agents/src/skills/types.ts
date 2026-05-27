export const RUNTIME_SKILL_REGISTRY_SCHEMA_VERSION = 1 as const;

export const RUNTIME_SKILL_FILE_NAME = 'SKILL.md';

export const LIST_SKILLS_TOOL_NAME = 'list_skills';

export const SKILL_LOAD_TOOL_NAME = 'load_skill';

export const RUNTIME_SKILL_LINKED_FILE_GROUPS = [
	'references',
	'templates',
	'scripts',
	'assets',
	'examples',
] as const;

export interface RuntimeSkillLinkedFile {
	path: string;
	bytes: number;
	sha256: string;
}

export type RuntimeSkillLinkedFileGroup =
	| (typeof RUNTIME_SKILL_LINKED_FILE_GROUPS)[number]
	| 'other';

export interface RuntimeSkillLinkedFiles {
	references: RuntimeSkillLinkedFile[];
	templates: RuntimeSkillLinkedFile[];
	scripts: RuntimeSkillLinkedFile[];
	assets: RuntimeSkillLinkedFile[];
	examples: RuntimeSkillLinkedFile[];
	other: RuntimeSkillLinkedFile[];
}

export interface RuntimeSkillIndexEntry {
	name: string;
	description: string;
	recommendedTools?: string[];
}

export interface RuntimeSkillInterfaceContract {
	displayName?: string;
	shortDescription?: string;
	defaultPrompt?: string;
	icon?: string;
	brandColor?: string;
}

export interface RuntimeSkillPolicyContract {
	allowImplicitInvocation?: boolean;
	product?: string;
}

export interface RuntimeSkillMcpServerDependency {
	name: string;
	description?: string;
	transport?: string;
	url?: string;
	command?: string;
}

export interface RuntimeSkillDependenciesContract {
	tools?: string[];
	secrets?: string[];
	mcpServers?: RuntimeSkillMcpServerDependency[];
}

export interface RuntimeSkill extends RuntimeSkillIndexEntry {
	id: string;
	instructions: string;
	sourceName?: string;
	path?: string;
	sourcePath?: string;
	directory?: string;
	sourceDirectory?: string;
	category?: string;
	allowedTools?: string[];
	interface?: RuntimeSkillInterfaceContract;
	policy?: RuntimeSkillPolicyContract;
	dependencies?: RuntimeSkillDependenciesContract;
	version?: string;
	license?: string;
	compatibility?: string;
	platforms?: string[];
	metadata?: Record<string, unknown>;
	linkedFiles?: RuntimeSkillLinkedFiles;
}

export interface RuntimeSkillRegistryEntry extends RuntimeSkillIndexEntry {
	id: string;
	hash: string;
	sourceName?: string;
	path?: string;
	sourcePath?: string;
	directory?: string;
	sourceDirectory?: string;
	category?: string;
	allowedTools?: string[];
	interface?: RuntimeSkillInterfaceContract;
	policy?: RuntimeSkillPolicyContract;
	dependencies?: RuntimeSkillDependenciesContract;
	version?: string;
	license?: string;
	compatibility?: string;
	platforms?: string[];
	metadata?: Record<string, unknown>;
	linkedFiles: RuntimeSkillLinkedFiles;
}

export interface RuntimeSkillRegistry {
	schemaVersion: typeof RUNTIME_SKILL_REGISTRY_SCHEMA_VERSION;
	skillsHash: string;
	skills: RuntimeSkillRegistryEntry[];
}

export interface RuntimeSkillContent extends RuntimeSkillIndexEntry {
	id: string;
	instructions: string;
	sourceName?: string;
	path?: string;
	sourcePath?: string;
	directory?: string;
	sourceDirectory?: string;
	category?: string;
	allowedTools?: string[];
	interface?: RuntimeSkillInterfaceContract;
	policy?: RuntimeSkillPolicyContract;
	dependencies?: RuntimeSkillDependenciesContract;
	version?: string;
	license?: string;
	compatibility?: string;
	platforms?: string[];
	metadata?: Record<string, unknown>;
	linkedFiles?: RuntimeSkillLinkedFiles;
}

export type RuntimeSkillLoader = (skillId: string) => Promise<RuntimeSkillContent | null>;

export interface RuntimeSkillFileContent {
	skillId: string;
	filePath: string;
	content: string;
	bytes?: number;
	sha256?: string;
}

export type RuntimeSkillFileLoader = (
	skillId: string,
	filePath: string,
) => Promise<RuntimeSkillFileContent | null>;

export interface RuntimeSkillSource {
	registry: RuntimeSkillRegistry;
	prepare?: () => Promise<void>;
	loadSkill: RuntimeSkillLoader;
	loadFile?: RuntimeSkillFileLoader;
}

export interface RuntimeSkillValidationError {
	code: string;
	message: string;
	path?: string;
	field?: string;
	hint?: string;
}

export type RuntimeSkillValidationResult =
	| { ok: true; skill: RuntimeSkill }
	| { ok: false; errors: RuntimeSkillValidationError[] };
