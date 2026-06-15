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
import { getWorkspaceRoot } from '@n8n/agents/sandbox';
import { join as posixJoin, normalize as posixNormalize } from 'node:path/posix';

import type { Logger } from '../logger';
import {
	loadPrebakedWorkspaceBundle,
	materializeWorkspaceBundle,
} from '../workspace/prebaked-workspace-bundle';
import { stringifyWorkspaceJson, withTrailingNewline } from '../workspace/workspace-file-content';
import { WORKSPACE_MANIFEST_FILE } from '../workspace/workspace-manifest';

export const SANDBOX_RUNTIME_SKILLS_DIR = 'skills';
export const SANDBOX_RUNTIME_SKILL_REGISTRY_FILE = 'registry.json';
export const RUNTIME_SKILL_MANIFEST_FILE = WORKSPACE_MANIFEST_FILE;
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

export interface RuntimeSkillWorkspaceBundle extends MaterializedRuntimeSkills {
	files: Map<string, string>;
	manifest: RuntimeSkillWorkspaceManifest;
	manifestPath: string;
	skillsHash: string;
}

interface BuildRuntimeSkillWorkspaceBundleOptions {
	source: RuntimeSkillSource;
	root: string;
	workspaceRoot?: string;
	skillsRoot?: string;
	logger?: Logger;
}

interface MaterializeRuntimeSkillsOptions {
	source: RuntimeSkillSource;
	workspace: Workspace;
	root: string;
	workspaceRoot?: string;
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
const LOAD_SKILL_OUTPUT_LIMIT_BYTES = 64 * 1024;

function isNonEmptyRecord(value: Record<string, unknown>): boolean {
	return Object.keys(value).length > 0;
}

function toFrontmatterSection<T>(
	value: T | undefined,
	build: (section: T) => Record<string, unknown>,
): Record<string, unknown> | undefined {
	if (!value) return undefined;
	const output = build(value);
	return isNonEmptyRecord(output) ? output : undefined;
}

function materializedSkillById(
	materialized: MaterializedRuntimeSkill[],
): Map<string, MaterializedRuntimeSkill> {
	return new Map(materialized.map((skill) => [skill.id, skill]));
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

function substituteRuntimeSkillVars(
	content: string,
	skillDir: string,
	workspaceRoot: string,
	skillsRoot: string,
): string {
	return content
		.replaceAll(N8N_SKILL_DIR_TEMPLATE, skillDir)
		.replaceAll(N8N_SKILLS_DIR_TEMPLATE, skillsRoot)
		.replaceAll(N8N_WORKSPACE_DIR_TEMPLATE, workspaceRoot);
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
	const materializedById = materializedSkillById(materialized);

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
	const materializedById = materializedSkillById(materialized);
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

const RUNTIME_SKILL_FILE_LABEL = 'Runtime skill file';

export async function loadPrebakedRuntimeSkillsBundle({
	source,
	workspace,
	root,
	workspaceRoot = root,
	logger,
}: MaterializeRuntimeSkillsOptions): Promise<RuntimeSkillWorkspaceBundle | undefined> {
	if (source.registry.skills.length === 0) return undefined;

	const skillsRoot = posixJoin(root, SANDBOX_RUNTIME_SKILLS_DIR);
	const manifestPath = posixJoin(skillsRoot, RUNTIME_SKILL_MANIFEST_FILE);

	return await loadPrebakedWorkspaceBundle({
		workspace,
		manifestPath,
		expectedHash: source.registry.skillsHash,
		hashField: 'skillsHash',
		schemaVersion: RUNTIME_SKILL_MANIFEST_SCHEMA_VERSION,
		resourceLabel: RUNTIME_SKILL_FILE_LABEL,
		logger,
		invalidManifestLogMessage: 'Ignoring invalid prebaked runtime skills manifest',
		staleManifestLogMessage: 'Ignoring stale prebaked runtime skills manifest',
		staleManifestLogKeys: {
			expected: 'expectedSkillsHash',
			actual: 'actualSkillsHash',
		},
		successLogMessage: 'Using prebaked runtime skills from workspace',
		successLogContext: (bundle) => ({
			root,
			workspaceRoot,
			skillsRoot: bundle.rootDir,
			registryPath: bundle.registryPath,
			skillsHash: bundle.skillsHash,
			count: bundle.skills.length,
		}),
		buildBundle: async () =>
			await buildRuntimeSkillWorkspaceBundle({
				source,
				root,
				workspaceRoot,
				skillsRoot,
				logger,
			}),
	});
}

function linkedFilesFor(entry: RuntimeSkillRegistryEntry): RuntimeSkillLinkedFile[] {
	return LINKED_FILE_GROUPS.flatMap((group) => entry.linkedFiles[group]);
}

function warnIfExceedsLoadSkillLimit(
	logger: Logger | undefined,
	entry: RuntimeSkillRegistryEntry,
	filePath: string,
	content: string,
): void {
	const bytes = Buffer.byteLength(content, 'utf8');
	if (bytes <= LOAD_SKILL_OUTPUT_LIMIT_BYTES) return;

	logger?.warn('Runtime skill file exceeds load_skill output limit', {
		skill: entry.name,
		path: filePath,
		bytes,
		maxBytes: LOAD_SKILL_OUTPUT_LIMIT_BYTES,
	});
}

export async function buildRuntimeSkillWorkspaceBundle({
	source,
	root,
	workspaceRoot = root,
	skillsRoot = posixJoin(root, SANDBOX_RUNTIME_SKILLS_DIR),
	logger,
}: BuildRuntimeSkillWorkspaceBundleOptions): Promise<RuntimeSkillWorkspaceBundle | undefined> {
	if (source.registry.skills.length === 0) return undefined;

	const files = new Map<string, string>();

	const materialized = await Promise.all(
		source.registry.skills.map(async (entry): Promise<MaterializedRuntimeSkill> => {
			const skill = await source.loadSkill(entry.id);
			if (!skill) {
				throw new Error(`Runtime skill "${entry.name}" is registered but cannot be loaded`);
			}

			const directory = materializedSkillDirectory(skillsRoot, entry);
			const path = posixJoin(directory, RUNTIME_SKILL_FILE_NAME);
			const skillMarkdown = renderRuntimeSkillMarkdown(
				skill,
				entry,
				directory,
				workspaceRoot,
				skillsRoot,
			);
			warnIfExceedsLoadSkillLimit(logger, entry, path, skillMarkdown);
			files.set(path, skillMarkdown);

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

					const materializedContent = substituteRuntimeSkillVars(
						content.content,
						directory,
						workspaceRoot,
						skillsRoot,
					);
					warnIfExceedsLoadSkillLimit(logger, entry, materializedPath, materializedContent);
					files.set(materializedPath, materializedContent);
				}),
			);

			return { id: entry.id, name: entry.name, path, directory };
		}),
	);

	const registry = materializedRegistry(source.registry, materialized);
	const registryPath = posixJoin(skillsRoot, SANDBOX_RUNTIME_SKILL_REGISTRY_FILE);
	files.set(registryPath, stringifyWorkspaceJson(registry));

	const manifest: RuntimeSkillWorkspaceManifest = {
		schemaVersion: RUNTIME_SKILL_MANIFEST_SCHEMA_VERSION,
		skillsHash: source.registry.skillsHash,
	};
	const manifestPath = posixJoin(skillsRoot, RUNTIME_SKILL_MANIFEST_FILE);
	files.set(manifestPath, stringifyWorkspaceJson(manifest));

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
	logger,
}: MaterializeRuntimeSkillsOptions): Promise<MaterializedRuntimeSkills | undefined> {
	if (source.registry.skills.length === 0) return undefined;

	return await materializeWorkspaceBundle({
		workspace,
		resourceLabel: RUNTIME_SKILL_FILE_LABEL,
		logger,
		loadPrebaked: async () =>
			await loadPrebakedRuntimeSkillsBundle({ source, workspace, root, logger }),
		buildBundle: async () => {
			const bundle = await buildRuntimeSkillWorkspaceBundle({ source, root, logger });
			if (!bundle) {
				throw new Error('Expected runtime skill bundle after registry validation');
			}
			return bundle;
		},
		materializedLogMessage: 'Materialized runtime skills into workspace',
		materializedLogContext: (bundle) => ({
			root,
			skillsRoot: bundle.rootDir,
			registryPath: bundle.registryPath,
			skillsHash: bundle.skillsHash,
			count: bundle.skills.length,
		}),
	});
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

		materializePromise ??= (async () => {
			const root = await getWorkspaceRoot(runtimeWorkspace);
			const options = { source, workspace: runtimeWorkspace, root, logger };
			const result =
				(await loadPrebakedRuntimeSkillsBundle(options)) ??
				(await materializeRuntimeSkillsIntoWorkspace(options));
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
