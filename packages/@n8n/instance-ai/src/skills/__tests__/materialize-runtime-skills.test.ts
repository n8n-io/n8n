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
	N8N_SKILL_DIR_ENV,
	N8N_WORKSPACE_DIR_ENV,
	SANDBOX_RUNTIME_SKILLS_DIR,
	SANDBOX_RUNTIME_SKILL_REGISTRY_FILE,
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
		writes,
		workspace: {
			filesystem: { writeFile },
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

		expect(executeCommand).not.toHaveBeenCalled();
		expect(writes.get(skillPath)).toContain('data-tables');
		expect(writes.get(skillPath)).toContain('parse-file');
		expect(writes.get(referencePath)).toContain('Fast Routing');

		const registry = jsonParse<{
			skills: Array<{ name: string; path: string; directory: string }>;
		}>(writes.get(registryPath) ?? '{}');
		expect(registry.skills[0]).toMatchObject({
			name: 'data-table-manager',
			path: skillPath,
			directory: skillDir,
		});

		expect(materialized?.env).toMatchObject({
			[N8N_WORKSPACE_DIR_ENV]: root,
			[N8N_SKILLS_DIR_ENV]: `${root}/${SANDBOX_RUNTIME_SKILLS_DIR}`,
			[N8N_SKILL_DIR_ENV]: skillDir,
		});

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
});
