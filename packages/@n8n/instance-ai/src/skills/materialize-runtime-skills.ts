import {
	RUNTIME_SKILL_FILE_NAME,
	type RuntimeSkillContent,
	type RuntimeSkillDependenciesContract,
	type RuntimeSkillInterfaceContract,
	type RuntimeSkillLinkedFile,
	type RuntimeSkillLinkedFileGroup,
	type RuntimeSkillPolicyContract,
	type RuntimeSkillRegistry,
	type RuntimeSkillRegistryEntry,
	type RuntimeSkillSource,
	type Workspace,
} from '@n8n/agents';
import { join as posixJoin, normalize as posixNormalize } from 'node:path/posix';

import { formatErrorForLog } from '../error-formatting';
import type { Logger } from '../logger';
import { writeFileViaSandbox } from '../workspace/sandbox-fs';
import { getWorkspaceRoot } from '../workspace/sandbox-setup';

export const SANDBOX_RUNTIME_SKILLS_DIR = 'skills';
export const SANDBOX_RUNTIME_SKILL_REGISTRY_FILE = 'registry.json';
export const N8N_SKILLS_DIR_ENV = 'N8N_SKILLS_DIR';
export const N8N_SKILL_DIR_ENV = 'N8N_SKILL_DIR';
export const N8N_WORKSPACE_DIR_ENV = 'N8N_WORKSPACE_DIR';

export interface MaterializedRuntimeSkill {
	id: string;
	name: string;
	path: string;
	directory: string;
}

export interface MaterializedRuntimeSkills {
	rootDir: string;
	registryPath: string;
	skills: MaterializedRuntimeSkill[];
	env: NodeJS.ProcessEnv;
	source: RuntimeSkillSource;
}

interface MaterializeRuntimeSkillsOptions {
	source: RuntimeSkillSource;
	workspace: Workspace;
	root: string;
	logger?: Logger;
}

interface LazyWorkspaceRuntimeSkillSourceOptions {
	source: RuntimeSkillSource;
	workspace: Workspace | undefined;
	logger?: Logger;
}

const LINKED_FILE_GROUPS = [
	'references',
	'templates',
	'scripts',
	'assets',
	'examples',
	'other',
] as const satisfies readonly RuntimeSkillLinkedFileGroup[];
const N8N_SKILL_DIR_TEMPLATE = '$' + '{N8N_SKILL_DIR}';
const N8N_SKILLS_DIR_TEMPLATE = '$' + '{N8N_SKILLS_DIR}';
const N8N_WORKSPACE_DIR_TEMPLATE = '$' + '{N8N_WORKSPACE_DIR}';

function isNonEmptyRecord(value: Record<string, unknown>): boolean {
	return Object.keys(value).length > 0;
}

function withTrailingNewline(content: string): string {
	return content.endsWith('\n') ? content : `${content}\n`;
}

function safeSkillDirectory(entry: RuntimeSkillRegistryEntry): string {
	const raw = entry.sourceDirectory ?? entry.name;
	if (!raw || raw.includes('\0') || raw.includes('\\') || raw.startsWith('/')) {
		throw new Error(`Invalid runtime skill directory for "${entry.name}"`);
	}

	const normalized = posixNormalize(raw);
	if (
		normalized === '.' ||
		normalized === '..' ||
		normalized.startsWith('../') ||
		normalized.split('/').includes('..')
	) {
		throw new Error(`Runtime skill directory escapes skills root for "${entry.name}"`);
	}

	return normalized;
}

function materializedSkillDirectory(root: string, entry: RuntimeSkillRegistryEntry): string {
	return posixJoin(root, SANDBOX_RUNTIME_SKILLS_DIR, safeSkillDirectory(entry));
}

function safeLinkedFilePath(
	directory: string,
	entry: RuntimeSkillRegistryEntry,
	linkedFile: RuntimeSkillLinkedFile,
): { relativePath: string; materializedPath: string } {
	const raw = linkedFile.path;
	if (
		!raw ||
		raw.trim() === '' ||
		raw.includes('\0') ||
		raw.includes('\\') ||
		raw.startsWith('/')
	) {
		throw new Error(`Invalid runtime skill linked file for "${entry.name}": ${raw}`);
	}

	const relativePath = posixNormalize(raw);
	const materializedPath = posixNormalize(posixJoin(directory, relativePath));
	const directoryBoundary = directory.endsWith('/') ? directory : `${directory}/`;
	if (
		relativePath === '.' ||
		relativePath.startsWith('../') ||
		materializedPath === directory ||
		!materializedPath.startsWith(directoryBoundary)
	) {
		throw new Error(
			`Runtime skill linked file escapes skill directory for "${entry.name}": ${raw}`,
		);
	}

	return { relativePath, materializedPath };
}

function substituteRuntimeSkillVars(
	content: string,
	skillDir: string,
	workspaceRoot: string,
): string {
	return content
		.replaceAll(N8N_SKILL_DIR_TEMPLATE, skillDir)
		.replaceAll(N8N_SKILLS_DIR_TEMPLATE, posixJoin(workspaceRoot, SANDBOX_RUNTIME_SKILLS_DIR))
		.replaceAll(N8N_WORKSPACE_DIR_TEMPLATE, workspaceRoot);
}

function toFrontmatterInterface(
	value: RuntimeSkillInterfaceContract | undefined,
): Record<string, unknown> | undefined {
	if (!value) return undefined;
	const output: Record<string, unknown> = {
		...(value.displayName ? { display_name: value.displayName } : {}),
		...(value.shortDescription ? { short_description: value.shortDescription } : {}),
		...(value.defaultPrompt ? { default_prompt: value.defaultPrompt } : {}),
		...(value.icon ? { icon: value.icon } : {}),
		...(value.brandColor ? { brand_color: value.brandColor } : {}),
	};
	return isNonEmptyRecord(output) ? output : undefined;
}

function toFrontmatterPolicy(
	value: RuntimeSkillPolicyContract | undefined,
): Record<string, unknown> | undefined {
	if (!value) return undefined;
	const output: Record<string, unknown> = {
		...(value.allowImplicitInvocation !== undefined
			? { allow_implicit_invocation: value.allowImplicitInvocation }
			: {}),
		...(value.product ? { product: value.product } : {}),
	};
	return isNonEmptyRecord(output) ? output : undefined;
}

function toFrontmatterDependencies(
	value: RuntimeSkillDependenciesContract | undefined,
): Record<string, unknown> | undefined {
	if (!value) return undefined;
	const output: Record<string, unknown> = {
		...(value.tools?.length ? { tools: value.tools } : {}),
		...(value.secrets?.length ? { secrets: value.secrets } : {}),
		...(value.mcpServers?.length
			? {
					mcp_servers: value.mcpServers.map((server) => ({
						name: server.name,
						...(server.description ? { description: server.description } : {}),
						...(server.transport ? { transport: server.transport } : {}),
						...(server.url ? { url: server.url } : {}),
						...(server.command ? { command: server.command } : {}),
					})),
				}
			: {}),
	};
	return isNonEmptyRecord(output) ? output : undefined;
}

function addFrontmatterField(lines: string[], key: string, value: unknown): void {
	if (value === undefined) return;
	if (Array.isArray(value) && value.length === 0) return;
	if (
		typeof value === 'object' &&
		value !== null &&
		!Array.isArray(value) &&
		Object.keys(value).length === 0
	) {
		return;
	}

	const serialized = JSON.stringify(value);
	if (serialized) {
		lines.push(`${key}: ${serialized}`);
	}
}

function renderRuntimeSkillMarkdown(
	skill: RuntimeSkillContent,
	entry: RuntimeSkillRegistryEntry,
	skillDir: string,
	workspaceRoot: string,
): string {
	const lines = ['---'];
	addFrontmatterField(lines, 'name', skill.name);
	addFrontmatterField(lines, 'description', skill.description);
	addFrontmatterField(lines, 'recommended_tools', skill.recommendedTools);
	addFrontmatterField(lines, 'allowed_tools', skill.allowedTools);
	addFrontmatterField(lines, 'interface', toFrontmatterInterface(skill.interface));
	addFrontmatterField(lines, 'policy', toFrontmatterPolicy(skill.policy));
	addFrontmatterField(lines, 'dependencies', toFrontmatterDependencies(skill.dependencies));
	addFrontmatterField(lines, 'version', skill.version);
	addFrontmatterField(lines, 'license', skill.license);
	addFrontmatterField(lines, 'compatibility', skill.compatibility);
	addFrontmatterField(lines, 'platforms', skill.platforms);
	addFrontmatterField(lines, 'metadata', skill.metadata);
	lines.push('---', '');

	const instructions = substituteRuntimeSkillVars(skill.instructions, skillDir, workspaceRoot);
	const sourceNote =
		entry.sourceDirectory && entry.sourceDirectory !== entry.name
			? `<!-- materialized from ${entry.sourceDirectory} -->\n\n`
			: '';
	return withTrailingNewline(`${lines.join('\n')}\n${sourceNote}${instructions.trim()}`);
}

function materializedRegistry(
	registry: RuntimeSkillRegistry,
	materialized: MaterializedRuntimeSkill[],
): RuntimeSkillRegistry {
	const materializedById = new Map(materialized.map((skill) => [skill.id, skill]));

	return {
		...registry,
		skills: registry.skills.map((entry) => {
			const skill = materializedById.get(entry.id);
			if (!skill) return entry;

			return {
				...entry,
				path: skill.path,
				directory: skill.directory,
			};
		}),
	};
}

function createMaterializedRuntimeSkillSource(
	source: RuntimeSkillSource,
	registry: RuntimeSkillRegistry,
	materialized: MaterializedRuntimeSkill[],
	workspaceRoot: string,
): RuntimeSkillSource {
	const materializedById = new Map(materialized.map((skill) => [skill.id, skill]));
	const loadFile = source.loadFile;

	return {
		registry,
		loadSkill: async (skillId) => {
			const skill = await source.loadSkill(skillId);
			const materializedSkill = materializedById.get(skillId);
			if (!skill || !materializedSkill) return skill;

			return {
				...skill,
				path: materializedSkill.path,
				directory: materializedSkill.directory,
				instructions: substituteRuntimeSkillVars(
					skill.instructions,
					materializedSkill.directory,
					workspaceRoot,
				),
			};
		},
		...(loadFile
			? {
					loadFile: async (skillId: string, filePath: string) => {
						const file = await loadFile(skillId, filePath);
						const materializedSkill = materializedById.get(skillId);
						if (!file || !materializedSkill) return file;

						return {
							...file,
							content: substituteRuntimeSkillVars(
								file.content,
								materializedSkill.directory,
								workspaceRoot,
							),
						};
					},
				}
			: {}),
	};
}

async function writeWorkspaceFile(
	workspace: Workspace,
	filePath: string,
	content: string,
	logger?: Logger,
): Promise<void> {
	if (workspace.filesystem) {
		try {
			await workspace.filesystem.writeFile(filePath, content, { recursive: true });
			return;
		} catch (error) {
			try {
				await writeFileViaSandbox(workspace, filePath, content);
				logger?.warn('Sandbox runtime skill filesystem write failed; used command fallback', {
					path: filePath,
					error: formatErrorForLog(error),
				});
				return;
			} catch (fallbackError) {
				throw new Error(
					`Failed to write runtime skill file "${filePath}": ${formatErrorForLog(error)}; command fallback failed: ${formatErrorForLog(fallbackError)}`,
				);
			}
		}
	}

	try {
		await writeFileViaSandbox(workspace, filePath, content);
	} catch (error) {
		throw new Error(
			`Failed to write runtime skill file "${filePath}": ${formatErrorForLog(error)}`,
		);
	}
}

function linkedFilesFor(entry: RuntimeSkillRegistryEntry): RuntimeSkillLinkedFile[] {
	return LINKED_FILE_GROUPS.flatMap((group) => entry.linkedFiles[group]);
}

export async function materializeRuntimeSkillsIntoWorkspace({
	source,
	workspace,
	root,
	logger,
}: MaterializeRuntimeSkillsOptions): Promise<MaterializedRuntimeSkills | undefined> {
	if (source.registry.skills.length === 0) return undefined;

	const rootDir = posixJoin(root, SANDBOX_RUNTIME_SKILLS_DIR);
	const materialized: MaterializedRuntimeSkill[] = [];

	for (const entry of source.registry.skills) {
		const skill = await source.loadSkill(entry.id);
		if (!skill) {
			throw new Error(`Runtime skill "${entry.name}" is registered but cannot be loaded`);
		}

		const directory = materializedSkillDirectory(root, entry);
		const path = posixJoin(directory, RUNTIME_SKILL_FILE_NAME);
		await writeWorkspaceFile(
			workspace,
			path,
			renderRuntimeSkillMarkdown(skill, entry, directory, root),
			logger,
		);

		const linkedFiles = linkedFilesFor(entry);
		if (linkedFiles.length > 0 && !source.loadFile) {
			throw new Error(`Runtime skill "${entry.name}" has linked files but no file loader`);
		}

		for (const linkedFile of linkedFiles) {
			const { relativePath, materializedPath } = safeLinkedFilePath(directory, entry, linkedFile);
			const content = await source.loadFile?.(entry.id, relativePath);
			if (!content) {
				throw new Error(
					`Runtime skill "${entry.name}" linked file is registered but cannot be loaded: ${linkedFile.path}`,
				);
			}

			await writeWorkspaceFile(
				workspace,
				materializedPath,
				substituteRuntimeSkillVars(content.content, directory, root),
				logger,
			);
		}

		materialized.push({ id: entry.id, name: entry.name, path, directory });
	}

	const registry = materializedRegistry(source.registry, materialized);
	const registryPath = posixJoin(rootDir, SANDBOX_RUNTIME_SKILL_REGISTRY_FILE);
	await writeWorkspaceFile(
		workspace,
		registryPath,
		`${JSON.stringify(registry, null, 2)}\n`,
		logger,
	);

	const defaultSkill =
		materialized.find((skill) => skill.name === 'data-table-manager') ?? materialized[0];
	const env: NodeJS.ProcessEnv = {
		[N8N_WORKSPACE_DIR_ENV]: root,
		[N8N_SKILLS_DIR_ENV]: rootDir,
		...(defaultSkill ? { [N8N_SKILL_DIR_ENV]: defaultSkill.directory } : {}),
	};

	logger?.debug('Materialized runtime skills into workspace', {
		root,
		skillsRoot: rootDir,
		registryPath,
		skillsHash: source.registry.skillsHash,
		count: materialized.length,
	});

	return {
		rootDir,
		registryPath,
		skills: materialized,
		env,
		source: createMaterializedRuntimeSkillSource(source, registry, materialized, root),
	};
}

export function createLazyWorkspaceRuntimeSkillSource({
	source,
	workspace,
	logger,
}: LazyWorkspaceRuntimeSkillSourceOptions): RuntimeSkillSource {
	if (!workspace || source.registry.skills.length === 0) return source;
	const runtimeWorkspace = workspace;

	let materialized: MaterializedRuntimeSkills | undefined;
	let materializePromise: Promise<MaterializedRuntimeSkills | undefined> | undefined;

	const workspaceSource: RuntimeSkillSource = {
		registry: source.registry,
		prepare: async () => {
			await ensureMaterialized();
		},
		loadSkill: async (skillId) => await (await ensureSource()).loadSkill(skillId),
		...(source.loadFile
			? {
					loadFile: async (skillId: string, filePath: string) => {
						const preparedSource = await ensureSource();
						return (await preparedSource.loadFile?.(skillId, filePath)) ?? null;
					},
				}
			: {}),
	};

	async function ensureMaterialized(): Promise<MaterializedRuntimeSkills | undefined> {
		if (materialized) return materialized;

		materializePromise ??= (async () => {
			const root = await getWorkspaceRoot(runtimeWorkspace);
			const result = await materializeRuntimeSkillsIntoWorkspace({
				source,
				workspace: runtimeWorkspace,
				root,
				logger,
			});
			if (result) {
				materialized = result;
				workspaceSource.registry = result.source.registry;
			}
			return result;
		})().catch((error: unknown) => {
			materializePromise = undefined;
			throw error;
		});

		return await materializePromise;
	}

	async function ensureSource(): Promise<RuntimeSkillSource> {
		return (await ensureMaterialized())?.source ?? source;
	}

	return workspaceSource;
}
