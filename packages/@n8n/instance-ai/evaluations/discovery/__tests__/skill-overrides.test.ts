import { loadRuntimeSkillSourceFromDirectory } from '@n8n/agents';
import { TOP_LEVEL_ITEM_CEILING } from 'n8n-workflow';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
	INSTANCE_AI_SKILLS_DIR,
	substituteSkillPlaceholders,
} from '../../../src/skills/runtime-skills';
import { buildSkillOverrideSource } from '../skill-overrides';

/** The bundled skills with every skill present, independent of the agents module flag. */
function bundledSource() {
	return loadRuntimeSkillSourceFromDirectory(INSTANCE_AI_SKILLS_DIR, {
		transformInstructions: substituteSkillPlaceholders,
	});
}

function skillFile(name: string, body: string): string {
	const dir = mkdtempSync(join(tmpdir(), 'skill-override-'));
	const path = join(dir, 'SKILL.md');
	writeFileSync(
		path,
		`---\nname: ${name}\ndescription: Variant of the skill for an eval run.\n---\n\n${body}\n`,
	);
	return path;
}

describe('buildSkillOverrideSource', () => {
	it('replaces only the named skill and keeps its bundled location', async () => {
		const base = bundledSource();
		const path = skillFile(
			'intent-recognition',
			'Variant body. Ceiling: {{TOP_LEVEL_ITEM_CEILING_PLACEHOLDER}}.',
		);

		const built = buildSkillOverrideSource([{ skillId: 'intent-recognition', path }], base);
		if (!built) throw new Error('expected an override source');
		const { source, records } = built;

		const original = base.registry.skills.find(({ id }) => id === 'intent-recognition');
		const replaced = source.registry.skills.find(({ id }) => id === 'intent-recognition');
		expect(replaced?.description).toBe('Variant of the skill for an eval run.');
		expect(replaced?.path).toBe(original?.path);
		expect(replaced?.directory).toBe(original?.directory);
		expect(source.registry.skillsHash).not.toBe(base.registry.skillsHash);
		expect(source.registry.skills.map(({ id }) => id)).toEqual(
			base.registry.skills.map(({ id }) => id),
		);

		const loaded = await source.loadSkill('intent-recognition');
		expect(loaded?.instructions).toContain(`Ceiling: ${String(TOP_LEVEL_ITEM_CEILING)}.`);
		expect(await source.loadSkill('planning')).toEqual(await base.loadSkill('planning'));
		expect(records['intent-recognition']).toEqual({ path, sha256: expect.any(String) });
	});

	it('returns nothing without overrides', () => {
		expect(buildSkillOverrideSource([], bundledSource())).toBeUndefined();
	});

	it('refuses an unknown skill, a mismatched name, and a repeated skill', () => {
		const base = bundledSource();
		const path = skillFile('intent-recognition', 'Body.');

		expect(() => buildSkillOverrideSource([{ skillId: 'no-such-skill', path }], base)).toThrow(
			/"no-such-skill" is not in the runtime skill catalog/,
		);
		expect(() => buildSkillOverrideSource([{ skillId: 'planning', path }], base)).toThrow(
			/must declare name "planning", got "intent-recognition"/,
		);
		expect(() =>
			buildSkillOverrideSource(
				[
					{ skillId: 'intent-recognition', path },
					{ skillId: 'intent-recognition', path },
				],
				base,
			),
		).toThrow(/"intent-recognition" is given more than once/);
	});
});
