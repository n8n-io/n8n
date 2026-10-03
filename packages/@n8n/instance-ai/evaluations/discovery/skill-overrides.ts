// ---------------------------------------------------------------------------
// `--skill-file <skillId>=<path>`: run the orchestrator with a different
// SKILL.md for one or more runtime skills, without a change to src/.
//
// The override starts from the production source (same exclusions and
// placeholder substitution as `loadInstanceAiRuntimeSkillSource`) and replaces
// only the named entries. A replaced entry keeps the bundled location fields
// and linked files, so the skill envelope the model sees differs only in the
// skill content and the registry hash.
//
// The override reaches the orchestrator's catalog and `load_skill`. Sub-agents
// that load their own skill source (for example `build-workflow`) still get the
// bundled files.
// ---------------------------------------------------------------------------

import {
	createRuntimeSkillRegistry,
	filterRuntimeSkillSource,
	formatSkillValidationErrors,
	parseRuntimeSkillMarkdown,
	type RuntimeSkill,
	type RuntimeSkillSource,
} from '@n8n/agents';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import type { SkillOverride } from './cli-args';
import {
	loadInstanceAiRuntimeSkillSource,
	substituteSkillPlaceholders,
} from '../../src/skills/runtime-skills';

/** Recorded in the results file, so a run says which skill files it used. */
export interface SkillOverrideRecord {
	path: string;
	sha256: string;
}

function replacementSkill(
	source: RuntimeSkillSource,
	override: SkillOverride,
	content: string,
): RuntimeSkill {
	const entry = source.registry.skills.find(({ id }) => id === override.skillId);
	if (!entry) {
		const known = source.registry.skills.map(({ id }) => id).join(', ');
		throw new Error(
			`--skill-file: "${override.skillId}" is not in the runtime skill catalog (${known})`,
		);
	}
	const parsed = parseRuntimeSkillMarkdown(content, {
		...(entry.sourceName ? { sourceName: entry.sourceName } : {}),
		...(entry.path ? { path: entry.path } : {}),
		...(entry.sourcePath ? { sourcePath: entry.sourcePath } : {}),
		...(entry.directory ? { directory: entry.directory } : {}),
		...(entry.sourceDirectory ? { sourceDirectory: entry.sourceDirectory } : {}),
		...(entry.category ? { category: entry.category } : {}),
	});
	if (!parsed.ok) {
		throw new Error(
			`--skill-file: ${override.path} is not a valid skill file: ${formatSkillValidationErrors(parsed.errors)}`,
		);
	}
	if (parsed.skill.id !== entry.id) {
		throw new Error(
			`--skill-file: ${override.path} must declare name "${entry.id}", got "${parsed.skill.id}"`,
		);
	}
	return {
		...parsed.skill,
		instructions: substituteSkillPlaceholders(parsed.skill.instructions),
		linkedFiles: entry.linkedFiles,
	};
}

/**
 * The production runtime skill source with the given skills replaced, and a
 * record of each replacement file. Returns `undefined` for no overrides.
 */
export function buildSkillOverrideSource(
	overrides: SkillOverride[],
	base: RuntimeSkillSource = loadInstanceAiRuntimeSkillSource(),
): { source: RuntimeSkillSource; records: Record<string, SkillOverrideRecord> } | undefined {
	if (overrides.length === 0) return undefined;

	const replacements = new Map<string, RuntimeSkill>();
	const records: Record<string, SkillOverrideRecord> = {};
	for (const override of overrides) {
		if (replacements.has(override.skillId)) {
			throw new Error(`--skill-file: "${override.skillId}" is given more than once`);
		}
		const content = readFileSync(override.path, 'utf-8');
		replacements.set(override.skillId, replacementSkill(base, override, content));
		records[override.skillId] = {
			path: override.path,
			sha256: createHash('sha256').update(content).digest('hex'),
		};
	}

	const entries = new Map(
		createRuntimeSkillRegistry([...replacements.values()]).skills.map((entry) => [entry.id, entry]),
	);
	const skills = base.registry.skills.map((existing) => entries.get(existing.id) ?? existing);
	// Filtering with no exclusions recomputes the registry hash from the new entries.
	const source = filterRuntimeSkillSource(
		{
			...base,
			registry: { ...base.registry, skills },
			loadSkill: async (skillId, anchor) =>
				replacements.get(skillId) ?? (await base.loadSkill(skillId, anchor)),
		},
		[],
	);
	return { source, records };
}
