import { describe, expect, it } from 'vitest';

import { createRuntimeSkillRegistry } from '../registry';
import {
	N8N_SKILLS_DIR_ENV,
	N8N_WORKSPACE_DIR_ENV,
	RUNTIME_SKILL_MANIFEST_FILE,
	SANDBOX_RUNTIME_SKILL_REGISTRY_FILE,
	SANDBOX_RUNTIME_SKILLS_DIR,
	buildRuntimeSkillWorkspaceBundle,
	createPrebakedWorkspaceRuntimeSkillSource,
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

describe('runtime skill workspace bundles', () => {
	it('builds a snapshot bundle with SKILL.md, registry, manifest, and linked files', async () => {
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

		const bundle = await buildRuntimeSkillWorkspaceBundle({
			source,
			root: '/home/daytona/workspace',
		});

		const skillDir = `/home/daytona/workspace/${SANDBOX_RUNTIME_SKILLS_DIR}/aiq-research`;
		expect(bundle).toMatchObject({
			rootDir: `/home/daytona/workspace/${SANDBOX_RUNTIME_SKILLS_DIR}`,
			registryPath: `/home/daytona/workspace/${SANDBOX_RUNTIME_SKILLS_DIR}/${SANDBOX_RUNTIME_SKILL_REGISTRY_FILE}`,
			env: {
				[N8N_WORKSPACE_DIR_ENV]: '/home/daytona/workspace',
				[N8N_SKILLS_DIR_ENV]: `/home/daytona/workspace/${SANDBOX_RUNTIME_SKILLS_DIR}`,
			},
			manifest: {
				schemaVersion: 1,
				skillsHash: source.registry.skillsHash,
			},
		});
		expect(bundle?.files.get(`${skillDir}/SKILL.md`)).toContain(
			`python3 ${skillDir}/scripts/aiq.py from ${skillDir}`,
		);
		expect(bundle?.files.get(`${skillDir}/scripts/aiq.py`)).toBe(`print("${skillDir}")\n`);
		expect(
			bundle?.files.get(
				`/home/daytona/workspace/${SANDBOX_RUNTIME_SKILLS_DIR}/${SANDBOX_RUNTIME_SKILL_REGISTRY_FILE}`,
			),
		).toContain(`${skillDir}/SKILL.md`);
		expect(
			bundle?.files.get(
				`/home/daytona/workspace/${SANDBOX_RUNTIME_SKILLS_DIR}/${RUNTIME_SKILL_MANIFEST_FILE}`,
			),
		).toContain(source.registry.skillsHash);
	});

	it('creates a no-write prebaked source with snapshot paths and substitutions', async () => {
		const linkedFiles = emptyLinkedFiles();
		linkedFiles.scripts.push({ path: 'scripts/aiq.py', bytes: 42, sha256: 'sha' });
		const skill: RuntimeSkill = {
			id: 'aiq-research',
			name: 'aiq-research',
			description: 'Use AI-Q',
			instructions: 'Run python3 $N8N_SKILL_DIR/scripts/aiq.py from ${N8N_WORKSPACE_DIR}.',
			linkedFiles,
		};
		const source = createSource(skill, {
			'scripts/aiq.py': 'print("$N8N_SKILL_DIR")\n',
		});

		const prebakedSource = createPrebakedWorkspaceRuntimeSkillSource({
			source,
			root: '/home/daytona/workspace',
		});
		const loaded = await prebakedSource.loadSkill('aiq-research');
		const linkedFile = await prebakedSource.loadFile?.('aiq-research', 'scripts/aiq.py');

		expect(prebakedSource.registry.skills[0]).toMatchObject({
			id: 'aiq-research',
			path: '/home/daytona/workspace/skills/aiq-research/SKILL.md',
			directory: '/home/daytona/workspace/skills/aiq-research',
		});
		expect(loaded).toMatchObject({
			path: '/home/daytona/workspace/skills/aiq-research/SKILL.md',
			directory: '/home/daytona/workspace/skills/aiq-research',
			instructions:
				'Run python3 /home/daytona/workspace/skills/aiq-research/scripts/aiq.py from /home/daytona/workspace.',
		});
		expect(linkedFile?.content).toBe('print("/home/daytona/workspace/skills/aiq-research")\n');
	});

	it('rejects linked files that escape the skill directory when building a bundle', async () => {
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

		await expect(
			buildRuntimeSkillWorkspaceBundle({
				source,
				root: '/home/daytona/workspace',
			}),
		).rejects.toThrow('Runtime skill linked file escapes skill directory');
	});
});
