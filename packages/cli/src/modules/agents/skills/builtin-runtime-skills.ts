import { loadRuntimeSkillSourceFromDirectory, type RuntimeSkillSource } from '@n8n/agents';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const BUILTIN_SKILLS_DIR = join(__dirname, 'builtin');

let cachedFullBuiltinSource: RuntimeSkillSource | undefined;
let cachedBuiltinSource: RuntimeSkillSource | undefined;

function builtinSkillsDirectory(): string {
	if (!existsSync(join(BUILTIN_SKILLS_DIR, 'aiq-research', 'SKILL.md'))) {
		throw new Error(`Built-in agent skills directory not found: ${BUILTIN_SKILLS_DIR}`);
	}
	return BUILTIN_SKILLS_DIR;
}

export function createBuiltinRuntimeSkillSource(): RuntimeSkillSource {
	cachedBuiltinSource ??= withoutScriptLinkedFiles(createFullBuiltinRuntimeSkillSource());
	return cachedBuiltinSource;
}

export function createFullBuiltinRuntimeSkillSource(): RuntimeSkillSource {
	cachedFullBuiltinSource ??= loadRuntimeSkillSourceFromDirectory(builtinSkillsDirectory());
	return cachedFullBuiltinSource;
}

function withoutScriptLinkedFiles(source: RuntimeSkillSource): RuntimeSkillSource {
	const registry = {
		...source.registry,
		skills: source.registry.skills.map((skill) => ({
			...skill,
			linkedFiles: {
				...skill.linkedFiles,
				scripts: [],
			},
		})),
	};
	const hasLoadableLinkedFiles = registry.skills.some((skill) =>
		Object.entries(skill.linkedFiles).some(
			([group, files]) => group !== 'scripts' && files.length > 0,
		),
	);
	const loadFile = source.loadFile;

	return {
		registry,
		loadSkill: async (skillId) => {
			const skill = await source.loadSkill(skillId);
			if (!skill) return null;
			return {
				...skill,
				linkedFiles: skill.linkedFiles
					? {
							...skill.linkedFiles,
							scripts: [],
						}
					: undefined,
			};
		},
		...(hasLoadableLinkedFiles && loadFile
			? {
					loadFile: async (skillId: string, filePath: string) =>
						filePath.startsWith('scripts/') ? null : await loadFile(skillId, filePath),
				}
			: {}),
	};
}
