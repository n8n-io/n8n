import {
	RUNTIME_SKILL_REGISTRY_SCHEMA_VERSION,
	createSkillLoadTool,
	type RuntimeSkillLinkedFiles,
	type RuntimeSkillSource,
	type Workspace,
	type WorkspaceSandbox,
} from '@n8n/agents';
import { jsonParse } from 'n8n-workflow';

import {
	N8N_SKILLS_DIR_ENV,
	N8N_WORKSPACE_DIR_ENV,
	RUNTIME_SKILL_MANIFEST_FILE,
	RUNTIME_SKILL_MANIFEST_SCHEMA_VERSION,
	SANDBOX_RUNTIME_SKILLS_DIR,
	SANDBOX_RUNTIME_SKILL_REGISTRY_FILE,
	buildRuntimeSkillWorkspaceBundle,
	createLazyWorkspaceRuntimeSkillSource,
	materializeRuntimeSkillsIntoWorkspace,
} from '../materialize-runtime-skills';
import { loadInstanceAiRuntimeSkillSource } from '../runtime-skills';

function createMockWorkspace() {
	const writes = new Map<string, string>();
	const writeFile = jest.fn(async (path: string, content: string | Buffer) => {
		writes.set(path, Buffer.isBuffer(content) ? content.toString('utf-8') : content);
		await Promise.resolve();
	});
	const readFile = jest.fn(async (path: string) => {
		const content = writes.get(path);
		if (content === undefined) throw new Error(`ENOENT: ${path}`);
		return await Promise.resolve(content);
	});
	const executeCommand = jest.fn<
		ReturnType<NonNullable<WorkspaceSandbox['executeCommand']>>,
		Parameters<NonNullable<WorkspaceSandbox['executeCommand']>>
	>(
		async () =>
			await Promise.resolve({
				success: true,
				exitCode: 0,
				stdout: '',
				stderr: '',
				executionTimeMs: 0,
			}),
	);
	const sandbox = {
		executeCommand,
	};

	return {
		executeCommand,
		readFile,
		writeFile,
		writes,
		workspace: {
			filesystem: { readFile, writeFile },
			sandbox,
		} as unknown as Workspace,
	};
}

function emptyLinkedFiles(): RuntimeSkillLinkedFiles {
	return {
		references: [],
		templates: [],
		scripts: [],
		assets: [],
		examples: [],
		other: [],
	};
}

function createRuntimeSkillSourceWithLinkedFile(path: string): RuntimeSkillSource {
	const linkedFiles = emptyLinkedFiles();
	linkedFiles.references.push({ path, bytes: 6, sha256: 'sha' });

	return {
		registry: {
			schemaVersion: RUNTIME_SKILL_REGISTRY_SCHEMA_VERSION,
			skillsHash: 'hash',
			skills: [
				{
					id: 'test-skill',
					name: 'test-skill',
					description: 'Test skill',
					hash: 'hash',
					linkedFiles,
				},
			],
		},
		loadSkill: async () =>
			await Promise.resolve({
				id: 'test-skill',
				name: 'test-skill',
				description: 'Test skill',
				instructions: 'Use the linked file.',
			}),
		loadFile: async (skillId, filePath) =>
			await Promise.resolve({
				skillId,
				filePath,
				content: 'linked',
			}),
	};
}

describe('materializeRuntimeSkillsIntoWorkspace', () => {
	it('builds a runtime skill workspace bundle without writing files', async () => {
		const source = loadInstanceAiRuntimeSkillSource();
		const root = '/home/daytona/workspace';

		const bundle = await buildRuntimeSkillWorkspaceBundle({ source, root });

		if (!bundle) throw new Error('Expected runtime skill bundle');
		const skillDir = `${root}/${SANDBOX_RUNTIME_SKILLS_DIR}/data-table-manager`;
		const skillPath = `${skillDir}/SKILL.md`;
		const referencePath = `${skillDir}/references/data-table-playbook.md`;
		const registryPath = `${root}/${SANDBOX_RUNTIME_SKILLS_DIR}/${SANDBOX_RUNTIME_SKILL_REGISTRY_FILE}`;
		const manifestPath = `${root}/${SANDBOX_RUNTIME_SKILLS_DIR}/${RUNTIME_SKILL_MANIFEST_FILE}`;

		expect(bundle.files.get(skillPath)).toContain('data-tables');
		expect(bundle.files.get(referencePath)).toContain('Fast Routing');
		expect(bundle.registryPath).toBe(registryPath);
		expect(bundle.manifestPath).toBe(manifestPath);
		expect(bundle.manifest).toEqual({
			schemaVersion: RUNTIME_SKILL_MANIFEST_SCHEMA_VERSION,
			skillsHash: source.registry.skillsHash,
		});
		expect(bundle.env).toMatchObject({
			[N8N_WORKSPACE_DIR_ENV]: root,
			[N8N_SKILLS_DIR_ENV]: `${root}/${SANDBOX_RUNTIME_SKILLS_DIR}`,
		});

		const registry = jsonParse<{
			skills: Array<{ name: string; path: string; directory: string }>;
		}>(bundle.files.get(registryPath) ?? '{}');
		const dataTableSkill = registry.skills.find((skill) => skill.name === 'data-table-manager');
		expect(dataTableSkill).toMatchObject({
			name: 'data-table-manager',
			path: skillPath,
			directory: skillDir,
		});
		expect(dataTableSkill).not.toHaveProperty('sourcePath');

		const manifest = jsonParse<{ schemaVersion: number; skillsHash: string }>(
			bundle.files.get(manifestPath) ?? '{}',
		);
		expect(manifest).toEqual(bundle.manifest);
	});

	it('copies bundled skills and linked files into the builder workspace', async () => {
		const source = loadInstanceAiRuntimeSkillSource();
		const { workspace, writes, executeCommand } = createMockWorkspace();
		const root = '/home/daytona/workspace';

		const materialized = await materializeRuntimeSkillsIntoWorkspace({
			source,
			workspace,
			root,
		});

		expect(materialized).toBeDefined();
		const skillDir = `${root}/${SANDBOX_RUNTIME_SKILLS_DIR}/data-table-manager`;
		const skillPath = `${skillDir}/SKILL.md`;
		const referencePath = `${skillDir}/references/data-table-playbook.md`;
		const registryPath = `${root}/${SANDBOX_RUNTIME_SKILLS_DIR}/${SANDBOX_RUNTIME_SKILL_REGISTRY_FILE}`;
		const manifestPath = `${root}/${SANDBOX_RUNTIME_SKILLS_DIR}/${RUNTIME_SKILL_MANIFEST_FILE}`;

		expect(executeCommand).not.toHaveBeenCalled();
		expect(writes.get(skillPath)).toContain('data-tables');
		expect(writes.get(skillPath)).toContain('parse-file');
		expect(writes.get(referencePath)).toContain('Fast Routing');

		const registry = jsonParse<{
			skills: Array<{ name: string; path: string; directory: string }>;
		}>(writes.get(registryPath) ?? '{}');
		const dataTableSkill = registry.skills.find((skill) => skill.name === 'data-table-manager');
		expect(dataTableSkill).toMatchObject({
			name: 'data-table-manager',
			path: skillPath,
			directory: skillDir,
		});
		expect(dataTableSkill).not.toHaveProperty('sourcePath');
		const manifestContent = writes.get(manifestPath);
		if (!manifestContent) throw new Error('Expected runtime skill manifest to be written');
		const manifest = jsonParse<{ schemaVersion: number; skillsHash: string }>(manifestContent);
		expect(manifest).toEqual({
			schemaVersion: RUNTIME_SKILL_MANIFEST_SCHEMA_VERSION,
			skillsHash: source.registry.skillsHash,
		});

		expect(materialized?.env).toMatchObject({
			[N8N_WORKSPACE_DIR_ENV]: root,
			[N8N_SKILLS_DIR_ENV]: `${root}/${SANDBOX_RUNTIME_SKILLS_DIR}`,
		});
		expect(materialized?.env).not.toHaveProperty('N8N_SKILL_DIR');

		expect(executeCommand).not.toHaveBeenCalled();
	});

	it('returns a sandbox-aware skill source for load_skill output', async () => {
		const source = loadInstanceAiRuntimeSkillSource();
		const { workspace } = createMockWorkspace();
		const root = '/home/daytona/workspace';

		const materialized = await materializeRuntimeSkillsIntoWorkspace({
			source,
			workspace,
			root,
		});
		if (!materialized) throw new Error('Expected runtime skills to materialize');

		const loadTool = createSkillLoadTool(materialized.source);
		const result = await loadTool.handler?.({ skillId: 'data-table-manager' }, {});

		expect(result).toMatchObject({
			success: true,
			skillId: 'data-table-manager',
			name: 'data-table-manager',
			skillDir: `${root}/${SANDBOX_RUNTIME_SKILLS_DIR}/data-table-manager`,
		});
		if (
			!result ||
			typeof result !== 'object' ||
			!('content' in result) ||
			typeof result.content !== 'string'
		) {
			throw new Error('Expected load_skill to return materialized skill content');
		}
		expect(result.content).toContain('references/data-table-playbook.md');
	});

	it('materializes skills into the workspace before load_skill reads them', async () => {
		const source = loadInstanceAiRuntimeSkillSource();
		const { workspace, writes, executeCommand } = createMockWorkspace();
		const runtimeSource = createLazyWorkspaceRuntimeSkillSource({
			source,
			workspace,
		});
		const loadTool = createSkillLoadTool(runtimeSource);

		const result = await loadTool.handler?.({ skillId: 'data-table-manager' }, {});
		const root = '/home/daytona/workspace';
		const skillDir = `${root}/${SANDBOX_RUNTIME_SKILLS_DIR}/data-table-manager`;
		const skillPath = `${skillDir}/SKILL.md`;

		expect(executeCommand).toHaveBeenCalledTimes(1);
		expect(writes.get(skillPath)).toContain('data-tables');
		expect(result).toMatchObject({
			success: true,
			skillId: 'data-table-manager',
			path: skillPath,
			skillDir,
		});

		await loadTool.handler?.({ skillId: 'data-table-manager' }, {});

		expect(executeCommand).toHaveBeenCalledTimes(1);
	});

	it('uses prebaked runtime skills when the manifest matches the source hash', async () => {
		const source = loadInstanceAiRuntimeSkillSource();
		const { workspace, writes, executeCommand, writeFile } = createMockWorkspace();
		const root = '/home/daytona/workspace';
		const bundle = await buildRuntimeSkillWorkspaceBundle({ source, root });
		if (!bundle) throw new Error('Expected runtime skill bundle');
		writes.set(bundle.manifestPath, bundle.files.get(bundle.manifestPath) ?? '');

		const runtimeSource = createLazyWorkspaceRuntimeSkillSource({
			source,
			workspace,
		});
		const loadTool = createSkillLoadTool(runtimeSource);
		const result = await loadTool.handler?.({ skillId: 'data-table-manager' }, {});

		const skillDir = `${root}/${SANDBOX_RUNTIME_SKILLS_DIR}/data-table-manager`;
		const skillPath = `${skillDir}/SKILL.md`;
		expect(executeCommand).toHaveBeenCalledTimes(1);
		expect(writeFile).not.toHaveBeenCalled();
		expect(writes.get(skillPath)).toBeUndefined();
		expect(result).toMatchObject({
			success: true,
			skillId: 'data-table-manager',
			path: skillPath,
			skillDir,
		});
	});

	it('falls back to live materialization when the prebaked manifest is stale', async () => {
		const source = loadInstanceAiRuntimeSkillSource();
		const { workspace, writes, writeFile } = createMockWorkspace();
		const root = '/home/daytona/workspace';
		const manifestPath = `${root}/${SANDBOX_RUNTIME_SKILLS_DIR}/${RUNTIME_SKILL_MANIFEST_FILE}`;
		writes.set(
			manifestPath,
			`${JSON.stringify({
				schemaVersion: RUNTIME_SKILL_MANIFEST_SCHEMA_VERSION,
				skillsHash: 'old-hash',
			})}\n`,
		);

		const runtimeSource = createLazyWorkspaceRuntimeSkillSource({
			source,
			workspace,
		});
		const loadTool = createSkillLoadTool(runtimeSource);

		await loadTool.handler?.({ skillId: 'data-table-manager' }, {});

		const skillPath = `${root}/${SANDBOX_RUNTIME_SKILLS_DIR}/data-table-manager/SKILL.md`;
		expect(writeFile).toHaveBeenCalled();
		expect(writes.get(skillPath)).toContain('data-tables');
	});

	it('falls back to live materialization when the prebaked manifest is invalid', async () => {
		const source = loadInstanceAiRuntimeSkillSource();
		const { workspace, writes, writeFile } = createMockWorkspace();
		const root = '/home/daytona/workspace';
		const manifestPath = `${root}/${SANDBOX_RUNTIME_SKILLS_DIR}/${RUNTIME_SKILL_MANIFEST_FILE}`;
		writes.set(manifestPath, 'not json');

		const runtimeSource = createLazyWorkspaceRuntimeSkillSource({
			source,
			workspace,
		});
		const loadTool = createSkillLoadTool(runtimeSource);

		await loadTool.handler?.({ skillId: 'data-table-manager' }, {});

		const skillPath = `${root}/${SANDBOX_RUNTIME_SKILLS_DIR}/data-table-manager/SKILL.md`;
		expect(writeFile).toHaveBeenCalled();
		expect(writes.get(skillPath)).toContain('data-tables');
	});

	it('rejects linked file paths that escape the materialized skill directory', async () => {
		const source = createRuntimeSkillSourceWithLinkedFile('../outside.md');
		const { workspace } = createMockWorkspace();

		await expect(
			materializeRuntimeSkillsIntoWorkspace({
				source,
				workspace,
				root: '/home/daytona/workspace',
			}),
		).rejects.toThrow('Runtime skill linked file escapes skill directory');
	});

	it('warns when materialized skill files exceed the load_skill output limit', async () => {
		const runtimeSkillMaxOutputBytes = 64 * 1024;
		const source: RuntimeSkillSource = {
			registry: {
				schemaVersion: RUNTIME_SKILL_REGISTRY_SCHEMA_VERSION,
				skillsHash: 'hash',
				skills: [
					{
						id: 'large-skill',
						name: 'large-skill',
						description: 'Large skill',
						hash: 'hash',
						linkedFiles: emptyLinkedFiles(),
					},
				],
			},
			loadSkill: async () =>
				await Promise.resolve({
					id: 'large-skill',
					name: 'large-skill',
					description: 'Large skill',
					instructions: 'x'.repeat(runtimeSkillMaxOutputBytes + 1),
				}),
		};
		const { workspace } = createMockWorkspace();
		const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

		await materializeRuntimeSkillsIntoWorkspace({
			source,
			workspace,
			root: '/home/daytona/workspace',
			logger,
		});

		const [[message, meta]] = logger.warn.mock.calls as [
			[string, { skill?: unknown; bytes?: unknown; maxBytes?: unknown }],
		];
		expect(message).toBe('Runtime skill file exceeds load_skill output limit');
		expect(meta.skill).toBe('large-skill');
		expect(typeof meta.bytes).toBe('number');
		expect(meta.maxBytes).toBe(runtimeSkillMaxOutputBytes);
	});
});
