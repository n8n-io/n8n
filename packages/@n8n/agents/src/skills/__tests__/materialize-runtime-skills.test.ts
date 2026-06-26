import { describe, expect, it, vi } from 'vitest';

import { Workspace } from '../../workspace';
import type { WorkspaceFilesystem } from '../../workspace';
import { createRuntimeSkillRegistry } from '../registry';
import {
	N8N_SKILLS_DIR_ENV,
	N8N_WORKSPACE_DIR_ENV,
	RUNTIME_SKILL_MANIFEST_FILE,
	SANDBOX_RUNTIME_SKILL_REGISTRY_FILE,
	SANDBOX_RUNTIME_SKILLS_DIR,
	createLazyWorkspaceRuntimeSkillSource,
	materializeRuntimeSkillsIntoWorkspace,
} from '../materialize-runtime-skills';
import type {
	RuntimeSkill,
	RuntimeSkillFileContent,
	RuntimeSkillLinkedFiles,
	RuntimeSkillSource,
} from '../types';

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

function createMemoryWorkspace(seed: Map<string, string> = new Map()) {
	const writes = new Map(seed);
	const filesystem = {
		id: 'memory-fs',
		name: 'MemoryFs',
		provider: 'memory',
		status: 'ready',
		readFile: vi.fn(async (path: string) => {
			const content = writes.get(path);
			if (content === undefined) throw new Error(`missing ${path}`);
			return content;
		}),
		writeFile: vi.fn(async (path: string, content: string | Buffer) => {
			writes.set(path, typeof content === 'string' ? content : content.toString('utf-8'));
		}),
	} as unknown as WorkspaceFilesystem;

	return {
		workspace: new Workspace({
			filesystem,
			sandbox: {
				id: 'memory-sandbox',
				name: 'MemorySandbox',
				provider: 'daytona',
				status: 'ready',
				executeCommand: vi.fn(async (command: string) => ({
					success: true,
					exitCode: 0,
					stdout: command === 'echo $HOME' ? '/home/daytona\n' : '',
					stderr: '',
					executionTimeMs: 1,
				})),
			},
		}),
		writes,
		filesystem,
	};
}

function createSource(skill: RuntimeSkill, files: Record<string, string> = {}): RuntimeSkillSource {
	const registry = createRuntimeSkillRegistry([skill]);
	return {
		registry,
		loadSkill: async (skillId: string) => (skillId === skill.id ? skill : null),
		loadFile: async (
			skillId: string,
			filePath: string,
		): Promise<RuntimeSkillFileContent | null> => {
			const content = files[filePath];
			if (skillId !== skill.id || content === undefined) return null;
			return {
				skillId,
				filePath,
				content,
				bytes: Buffer.byteLength(content),
				sha256: 'sha',
			};
		},
	};
}

describe('runtime skill workspace materialization', () => {
	it('materializes SKILL.md, registry, manifest, and linked files into a workspace', async () => {
		const linkedFiles = emptyLinkedFiles();
		linkedFiles.scripts.push({ path: 'scripts/aiq.py', bytes: 42, sha256: 'sha' });
		const skill: RuntimeSkill = {
			id: 'aiq-research',
			name: 'aiq-research',
			description: 'Use AI-Q',
			instructions:
				'Run python3 $SKILL_DIR/scripts/aiq.py from ${SKILL_DIR}. Workspace: ${N8N_WORKSPACE_DIR}.',
			linkedFiles,
		};
		const source = createSource(skill, {
			'scripts/aiq.py': 'print("${SKILL_DIR}")\n',
		});
		const { workspace, writes } = createMemoryWorkspace();

		const materialized = await materializeRuntimeSkillsIntoWorkspace({
			source,
			workspace,
			root: '/home/daytona/workspace',
		});

		const skillDir = `/home/daytona/workspace/${SANDBOX_RUNTIME_SKILLS_DIR}/aiq-research`;
		expect(materialized).toMatchObject({
			rootDir: `/home/daytona/workspace/${SANDBOX_RUNTIME_SKILLS_DIR}`,
			registryPath: `/home/daytona/workspace/${SANDBOX_RUNTIME_SKILLS_DIR}/${SANDBOX_RUNTIME_SKILL_REGISTRY_FILE}`,
			env: {
				[N8N_WORKSPACE_DIR_ENV]: '/home/daytona/workspace',
				[N8N_SKILLS_DIR_ENV]: `/home/daytona/workspace/${SANDBOX_RUNTIME_SKILLS_DIR}`,
			},
		});
		expect(writes.get(`${skillDir}/SKILL.md`)).toContain(
			`python3 ${skillDir}/scripts/aiq.py from ${skillDir}`,
		);
		expect(writes.get(`${skillDir}/scripts/aiq.py`)).toBe(`print("${skillDir}")\n`);
		expect(
			writes.get(
				`/home/daytona/workspace/${SANDBOX_RUNTIME_SKILLS_DIR}/${SANDBOX_RUNTIME_SKILL_REGISTRY_FILE}`,
			),
		).toContain(`${skillDir}/SKILL.md`);
		expect(
			writes.get(
				`/home/daytona/workspace/${SANDBOX_RUNTIME_SKILLS_DIR}/${RUNTIME_SKILL_MANIFEST_FILE}`,
			),
		).toContain(source.registry.skillsHash);
	});

	it('materializes lazily before load_skill reads the source', async () => {
		const skill: RuntimeSkill = {
			id: 'demo-skill',
			name: 'demo-skill',
			description: 'Demo',
			instructions: 'Use $N8N_SKILL_DIR',
		};
		const source = createSource(skill);
		const { workspace, writes } = createMemoryWorkspace();
		const lazySource = createLazyWorkspaceRuntimeSkillSource({ source, workspace });

		const loaded = await lazySource.loadSkill('demo-skill');

		expect(loaded?.directory).toBe('/home/daytona/workspace/skills/demo-skill');
		expect(loaded?.instructions).toContain('/home/daytona/workspace/skills/demo-skill');
		expect(writes.get('/home/daytona/workspace/skills/demo-skill/SKILL.md')).toContain(
			'/home/daytona/workspace/skills/demo-skill',
		);
	});

	it('uses a matching manifest to skip workspace rewrites', async () => {
		const skill: RuntimeSkill = {
			id: 'demo-skill',
			name: 'demo-skill',
			description: 'Demo',
			instructions: 'Already baked',
		};
		const source = createSource(skill);
		const manifestPath = '/home/daytona/workspace/skills/.manifest.json';
		const { workspace, filesystem } = createMemoryWorkspace(
			new Map([
				[
					manifestPath,
					JSON.stringify({
						schemaVersion: 1,
						skillsHash: source.registry.skillsHash,
					}),
				],
			]),
		);

		await materializeRuntimeSkillsIntoWorkspace({
			source,
			workspace,
			root: '/home/daytona/workspace',
		});

		expect(filesystem.writeFile).not.toHaveBeenCalled();
	});

	it('rejects linked files that escape the skill directory', async () => {
		const linkedFiles = emptyLinkedFiles();
		linkedFiles.scripts.push({ path: '../escape.py', bytes: 1, sha256: 'sha' });
		const skill: RuntimeSkill = {
			id: 'bad-skill',
			name: 'bad-skill',
			description: 'Bad',
			instructions: 'Bad',
			linkedFiles,
		};
		const source = createSource(skill, { '../escape.py': 'print(1)' });
		const { workspace } = createMemoryWorkspace();

		await expect(
			materializeRuntimeSkillsIntoWorkspace({
				source,
				workspace,
				root: '/home/daytona/workspace',
			}),
		).rejects.toThrow('Runtime skill linked file escapes skill directory');
	});
});
