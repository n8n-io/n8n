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
import { readFileViaSandbox, writeFileViaSandbox } from '../workspace/sandbox-fs';
import { getWorkspaceRoot } from '../workspace/sandbox-setup';

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
	logger?: Logger;
}

interface PrebakedRuntimeSkillsOptions {
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

function withTrailingNewline(content: string): string {
	return content.endsWith('\n') ? content : `${content}\n`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
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

function parseRuntimeSkillWorkspaceManifest(raw: string): RuntimeSkillWorkspaceManifest | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return null;
	}

	if (!isRecord(parsed)) return null;
	if (parsed.schemaVersion !== RUNTIME_SKILL_MANIFEST_SCHEMA_VERSION) return null;
	if (typeof parsed.skillsHash !== 'string' || parsed.skillsHash.length === 0) return null;

	return {
		schemaVersion: RUNTIME_SKILL_MANIFEST_SCHEMA_VERSION,
		skillsHash: parsed.skillsHash,
	};
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

async function readWorkspaceFile(
	workspace: Workspace,
	filePath: string,
	logger?: Logger,
): Promise<string | null> {
	if (workspace.filesystem) {
		try {
			const content = await workspace.filesystem.readFile(filePath, { encoding: 'utf-8' });
			return Buffer.isBuffer(content) ? content.toString('utf-8') : content;
		} catch (error) {
			logger?.debug('Sandbox runtime skill manifest filesystem read missed', {
				path: filePath,
				error: formatErrorForLog(error),
			});
			return null;
		}
	}

	if (!workspace.sandbox) return null;

	try {
		return await readFileViaSandbox(workspace, filePath);
	} catch (error) {
		logger?.debug('Sandbox runtime skill manifest command read missed', {
			path: filePath,
			error: formatErrorForLog(error),
		});
		return null;
	}
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
	files.set(registryPath, `${JSON.stringify(registry, null, 2)}\n`);

	const manifest: RuntimeSkillWorkspaceManifest = {
		schemaVersion: RUNTIME_SKILL_MANIFEST_SCHEMA_VERSION,
		skillsHash: source.registry.skillsHash,
	};
	const manifestPath = posixJoin(skillsRoot, RUNTIME_SKILL_MANIFEST_FILE);
	files.set(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

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
	const bundle = await buildRuntimeSkillWorkspaceBundle({ source, root, logger });
	if (!bundle) return undefined;

	await Promise.all(
		[...bundle.files].map(async ([filePath, content]) => {
			await writeWorkspaceFile(workspace, filePath, content, logger);
		}),
	);

	logger?.debug('Materialized runtime skills into workspace', {
		root,
		skillsRoot: bundle.rootDir,
		registryPath: bundle.registryPath,
		skillsHash: bundle.skillsHash,
		count: bundle.skills.length,
	});

	return bundle;
}

export async function createPrebakedRuntimeSkillsFromWorkspace({
	source,
	workspace,
	root,
	workspaceRoot = root,
	logger,
}: PrebakedRuntimeSkillsOptions): Promise<RuntimeSkillWorkspaceBundle | undefined> {
	if (source.registry.skills.length === 0) return undefined;

	const skillsRoot = posixJoin(root, SANDBOX_RUNTIME_SKILLS_DIR);
	const manifestPath = posixJoin(skillsRoot, RUNTIME_SKILL_MANIFEST_FILE);
	const manifestRaw = await readWorkspaceFile(workspace, manifestPath, logger);
	if (!manifestRaw) return undefined;

	const manifest = parseRuntimeSkillWorkspaceManifest(manifestRaw);
	if (!manifest) {
		logger?.debug('Ignoring invalid prebaked runtime skills manifest', { manifestPath });
		return undefined;
	}

	if (manifest.skillsHash !== source.registry.skillsHash) {
		logger?.debug('Ignoring stale prebaked runtime skills manifest', {
			manifestPath,
			expectedSkillsHash: source.registry.skillsHash,
			actualSkillsHash: manifest.skillsHash,
		});
		return undefined;
	}

	const bundle = await buildRuntimeSkillWorkspaceBundle({
		source,
		root,
		workspaceRoot,
		skillsRoot,
		logger,
	});
	if (!bundle) return undefined;

	logger?.debug('Using prebaked runtime skills from workspace', {
		root,
		workspaceRoot,
		skillsRoot: bundle.rootDir,
		registryPath: bundle.registryPath,
		skillsHash: bundle.skillsHash,
		count: bundle.skills.length,
	});

	return bundle;
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
			const result =
				(await createPrebakedRuntimeSkillsFromWorkspace({
					source,
					workspace: runtimeWorkspace,
					root,
					logger,
				})) ??
				(await materializeRuntimeSkillsIntoWorkspace({
					source,
					workspace: runtimeWorkspace,
					root,
					logger,
				}));
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
