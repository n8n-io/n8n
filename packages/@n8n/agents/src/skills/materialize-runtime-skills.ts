import { normalize as posixNormalize, join as posixJoin } from 'node:path/posix';

import { getWorkspaceRoot } from '../workspace/sandbox';
import type { Workspace } from '../workspace';
import {
	RUNTIME_SKILL_FILE_NAME,
	RUNTIME_SKILL_LINKED_FILE_GROUPS,
	type RuntimeSkillContent,
	type RuntimeSkillDependenciesContract,
	type RuntimeSkillInterfaceContract,
	type RuntimeSkillLinkedFile,
	type RuntimeSkillLinkedFileGroup,
	type RuntimeSkillPolicyContract,
	type RuntimeSkillRegistry,
	type RuntimeSkillRegistryEntry,
	type RuntimeSkillSource,
} from './types';
import { materializeWorkspaceBundle, type WorkspaceBundle } from './workspace-bundle';

export const SANDBOX_RUNTIME_SKILLS_DIR = 'skills';
export const SANDBOX_RUNTIME_SKILL_REGISTRY_FILE = 'registry.json';
export const RUNTIME_SKILL_MANIFEST_FILE = '.manifest.json';
export const RUNTIME_SKILL_MANIFEST_SCHEMA_VERSION = 1;
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

export interface RuntimeSkillWorkspaceManifest {
	schemaVersion: typeof RUNTIME_SKILL_MANIFEST_SCHEMA_VERSION;
	skillsHash: string;
}

export interface RuntimeSkillWorkspaceBundle
	extends MaterializedRuntimeSkills,
		WorkspaceBundle<RuntimeSkillWorkspaceManifest> {
	manifestPath: string;
	skillsHash: string;
}

interface BuildRuntimeSkillWorkspaceBundleOptions {
	source: RuntimeSkillSource;
	root: string;
	workspaceRoot?: string;
	skillsRoot?: string;
}

interface MaterializeRuntimeSkillsOptions {
	source: RuntimeSkillSource;
	workspace: Workspace;
	root?: string;
	workspaceRoot?: string;
}

interface LazyWorkspaceRuntimeSkillSourceOptions {
	source: RuntimeSkillSource;
	workspace: Workspace | undefined;
	root?: string;
	workspaceRoot?: string;
}

const LINKED_FILE_GROUPS = [
	...RUNTIME_SKILL_LINKED_FILE_GROUPS,
	'other',
] as const satisfies readonly RuntimeSkillLinkedFileGroup[];

const TEMPLATE_VALUES = {
	n8nSkillDir: '${N8N_SKILL_DIR}',
	n8nSkillsDir: '${N8N_SKILLS_DIR}',
	n8nWorkspaceDir: '${N8N_WORKSPACE_DIR}',
	skillDir: '${SKILL_DIR}',
} as const;

function isNonEmptyRecord(value: Record<string, unknown>): boolean {
	return Object.keys(value).length > 0;
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
	if (serialized) lines.push(`${key}: ${serialized}`);
}

function toFrontmatterSection<T>(
	value: T | undefined,
	build: (section: T) => Record<string, unknown>,
): Record<string, unknown> | undefined {
	if (!value) return undefined;
	const output = build(value);
	return isNonEmptyRecord(output) ? output : undefined;
}

function toFrontmatterInterface(
	value: RuntimeSkillInterfaceContract | undefined,
): Record<string, unknown> | undefined {
	return toFrontmatterSection(value, (section) => ({
		...(section.displayName ? { display_name: section.displayName } : {}),
		...(section.shortDescription ? { short_description: section.shortDescription } : {}),
		...(section.defaultPrompt ? { default_prompt: section.defaultPrompt } : {}),
		...(section.icon ? { icon: section.icon } : {}),
		...(section.brandColor ? { brand_color: section.brandColor } : {}),
	}));
}

function toFrontmatterPolicy(
	value: RuntimeSkillPolicyContract | undefined,
): Record<string, unknown> | undefined {
	return toFrontmatterSection(value, (section) => ({
		...(section.allowImplicitInvocation !== undefined
			? { allow_implicit_invocation: section.allowImplicitInvocation }
			: {}),
		...(section.product ? { product: section.product } : {}),
	}));
}

function toFrontmatterDependencies(
	value: RuntimeSkillDependenciesContract | undefined,
): Record<string, unknown> | undefined {
	return toFrontmatterSection(value, (section) => ({
		...(section.tools?.length ? { tools: section.tools } : {}),
		...(section.secrets?.length ? { secrets: section.secrets } : {}),
		...(section.mcpServers?.length
			? {
					mcp_servers: section.mcpServers.map((server) => ({
						name: server.name,
						...(server.description ? { description: server.description } : {}),
						...(server.transport ? { transport: server.transport } : {}),
						...(server.url ? { url: server.url } : {}),
						...(server.command ? { command: server.command } : {}),
					})),
				}
			: {}),
	}));
}

function withTrailingNewline(value: string): string {
	return value.endsWith('\n') ? value : `${value}\n`;
}

function substituteRuntimeSkillVars(
	content: string,
	skillDir: string,
	workspaceRoot: string,
	skillsRoot: string,
): string {
	return content
		.replaceAll(TEMPLATE_VALUES.n8nSkillDir, skillDir)
		.replaceAll('$N8N_SKILL_DIR', skillDir)
		.replaceAll(TEMPLATE_VALUES.n8nSkillsDir, skillsRoot)
		.replaceAll('$N8N_SKILLS_DIR', skillsRoot)
		.replaceAll(TEMPLATE_VALUES.n8nWorkspaceDir, workspaceRoot)
		.replaceAll('$N8N_WORKSPACE_DIR', workspaceRoot)
		.replaceAll(TEMPLATE_VALUES.skillDir, skillDir)
		.replaceAll('$SKILL_DIR', skillDir);
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

function materializedSkillDirectory(skillsRoot: string, entry: RuntimeSkillRegistryEntry): string {
	return posixJoin(skillsRoot, safeSkillDirectory(entry));
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

function renderRuntimeSkillMarkdown(
	skill: RuntimeSkillContent,
	entry: RuntimeSkillRegistryEntry,
	skillDir: string,
	workspaceRoot: string,
	skillsRoot: string,
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

	const instructions = substituteRuntimeSkillVars(
		skill.instructions,
		skillDir,
		workspaceRoot,
		skillsRoot,
	);
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

			const materializedEntry = { ...entry };
			delete materializedEntry.sourcePath;

			return {
				...materializedEntry,
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
	skillsRoot: string,
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
					skillsRoot,
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
								skillsRoot,
							),
						};
					},
				}
			: {}),
	};
}

function linkedFilesFor(entry: RuntimeSkillRegistryEntry): RuntimeSkillLinkedFile[] {
	return LINKED_FILE_GROUPS.flatMap((group) => entry.linkedFiles[group] ?? []);
}

export async function buildRuntimeSkillWorkspaceBundle({
	source,
	root,
	workspaceRoot = root,
	skillsRoot = posixJoin(root, SANDBOX_RUNTIME_SKILLS_DIR),
}: BuildRuntimeSkillWorkspaceBundleOptions): Promise<RuntimeSkillWorkspaceBundle | undefined> {
	if (source.registry.skills.length === 0) return undefined;

	const files = new Map<string, string | Buffer>();
	const materialized = await Promise.all(
		source.registry.skills.map(async (entry): Promise<MaterializedRuntimeSkill> => {
			const skill = await source.loadSkill(entry.id);
			if (!skill)
				throw new Error(`Runtime skill "${entry.name}" is registered but cannot be loaded`);

			const directory = materializedSkillDirectory(skillsRoot, entry);
			const path = posixJoin(directory, RUNTIME_SKILL_FILE_NAME);
			files.set(
				path,
				renderRuntimeSkillMarkdown(skill, entry, directory, workspaceRoot, skillsRoot),
			);

			const linkedFiles = linkedFilesFor(entry);
			if (linkedFiles.length > 0 && !source.loadFile) {
				throw new Error(`Runtime skill "${entry.name}" has linked files but no file loader`);
			}

			await Promise.all(
				linkedFiles.map(async (linkedFile) => {
					const { relativePath, materializedPath } = safeLinkedFilePath(
						directory,
						entry,
						linkedFile,
					);
					const content = await source.loadFile?.(entry.id, relativePath);
					if (!content) {
						throw new Error(
							`Runtime skill "${entry.name}" linked file is registered but cannot be loaded: ${linkedFile.path}`,
						);
					}

					files.set(
						materializedPath,
						substituteRuntimeSkillVars(content.content, directory, workspaceRoot, skillsRoot),
					);
				}),
			);

			return { id: entry.id, name: entry.name, path, directory };
		}),
	);

	const registry = materializedRegistry(source.registry, materialized);
	const registryPath = posixJoin(skillsRoot, SANDBOX_RUNTIME_SKILL_REGISTRY_FILE);
	files.set(registryPath, `${JSON.stringify(registry, null, 2)}\n`);

	const manifest: RuntimeSkillWorkspaceManifest = {
		schemaVersion: RUNTIME_SKILL_MANIFEST_SCHEMA_VERSION,
		skillsHash: source.registry.skillsHash,
	};
	const manifestPath = posixJoin(skillsRoot, RUNTIME_SKILL_MANIFEST_FILE);
	const env: NodeJS.ProcessEnv = {
		[N8N_WORKSPACE_DIR_ENV]: workspaceRoot,
		[N8N_SKILLS_DIR_ENV]: skillsRoot,
	};

	return {
		rootDir: skillsRoot,
		registryPath,
		skills: materialized,
		env,
		source: createMaterializedRuntimeSkillSource(
			source,
			registry,
			materialized,
			workspaceRoot,
			skillsRoot,
		),
		files,
		manifest,
		manifestPath,
		skillsHash: source.registry.skillsHash,
	};
}

export async function materializeRuntimeSkillsIntoWorkspace({
	source,
	workspace,
	root,
	workspaceRoot,
}: MaterializeRuntimeSkillsOptions): Promise<MaterializedRuntimeSkills | undefined> {
	if (source.registry.skills.length === 0) return undefined;

	const resolvedWorkspaceRoot = workspaceRoot ?? root ?? (await getWorkspaceRoot(workspace));
	const resolvedRoot = root ?? resolvedWorkspaceRoot;
	const manifestPath = posixJoin(
		resolvedRoot,
		SANDBOX_RUNTIME_SKILLS_DIR,
		RUNTIME_SKILL_MANIFEST_FILE,
	);

	return await materializeWorkspaceBundle<
		RuntimeSkillWorkspaceBundle,
		RuntimeSkillWorkspaceManifest
	>({
		workspace,
		manifestPath,
		expectedHash: source.registry.skillsHash,
		hashField: 'skillsHash',
		schemaVersion: RUNTIME_SKILL_MANIFEST_SCHEMA_VERSION,
		loadPrebaked: async () =>
			await buildRuntimeSkillWorkspaceBundle({
				source,
				root: resolvedRoot,
				workspaceRoot: resolvedWorkspaceRoot,
			}),
		buildBundle: async () => {
			const bundle = await buildRuntimeSkillWorkspaceBundle({
				source,
				root: resolvedRoot,
				workspaceRoot: resolvedWorkspaceRoot,
			});
			if (!bundle) throw new Error('Expected runtime skill bundle after registry validation');
			return bundle;
		},
	});
}

export function createLazyWorkspaceRuntimeSkillSource({
	source,
	workspace,
	root,
	workspaceRoot,
}: LazyWorkspaceRuntimeSkillSourceOptions): RuntimeSkillSource {
	if (!workspace || source.registry.skills.length === 0) return source;
	const targetWorkspace = workspace;

	let materialized: MaterializedRuntimeSkills | undefined;
	let materializePromise: Promise<MaterializedRuntimeSkills | undefined> | undefined;

	const workspaceSource: RuntimeSkillSource = {
		registry: source.registry,
		prepare: async () => {
			await ensureMaterialized();
		},
		loadSkill: async (skillId: string) => await (await ensureSource()).loadSkill(skillId),
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

		materializePromise ??= materializeRuntimeSkillsIntoWorkspace({
			source,
			workspace: targetWorkspace,
			root,
			workspaceRoot,
		}).then(
			(result) => {
				if (result) {
					materialized = result;
					workspaceSource.registry = result.source.registry;
				}
				return result;
			},
			(error: unknown) => {
				materializePromise = undefined;
				throw error;
			},
		);

		return await materializePromise;
	}

	async function ensureSource(): Promise<RuntimeSkillSource> {
		return (await ensureMaterialized())?.source ?? source;
	}

	return workspaceSource;
}
