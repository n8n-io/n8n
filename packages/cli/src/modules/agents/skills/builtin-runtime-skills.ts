import { loadRuntimeSkillSourceFromDirectory, type RuntimeSkillSource } from '@n8n/agents';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const BUILTIN_SKILLS_DIR = join(__dirname, 'builtin');
const SOURCE_TREE_BUILTIN_SKILLS_DIR = 'src/modules/agents/skills/builtin';

let cachedBuiltinSource: RuntimeSkillSource | undefined;

function builtinSkillsDirectory(): string {
	const candidates = [
		BUILTIN_SKILLS_DIR,
		resolve(process.cwd(), SOURCE_TREE_BUILTIN_SKILLS_DIR),
		resolve(process.cwd(), 'packages/cli', SOURCE_TREE_BUILTIN_SKILLS_DIR),
		resolve(__dirname, '../../../../src/modules/agents/skills/builtin'),
	];
	const directory = candidates.find((candidate) =>
		existsSync(join(candidate, 'aiq-research', 'SKILL.md')),
	);
	if (!directory) {
		throw new Error(`Built-in agent skills directory not found. Tried: ${candidates.join(', ')}`);
	}
	return directory;
}

export function createBuiltinRuntimeSkillSource(): RuntimeSkillSource {
	cachedBuiltinSource ??= loadRuntimeSkillSourceFromDirectory(builtinSkillsDirectory());
	return cachedBuiltinSource;
}
