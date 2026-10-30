import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';

import { SkillRuntimeService } from '../../services/skill-runtime.service';
import { createSkill, createSkillVersion, deleteAllSkills } from '../../testing';

// The agent reads of `SkillRuntimeService` on the database: the refs resolve to the rows
// that the queries find. The unit tests cover the same rules over a mocked repository.
describe('SkillRuntimeService agent reads', () => {
	let runtime: SkillRuntimeService;

	beforeAll(async () => {
		await testModules.loadModules(['skills']);
		await testDb.init();
		runtime = Container.get(SkillRuntimeService);
	});

	afterEach(async () => {
		await deleteAllSkills();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	/** "Voice" with v1 "Voice" and v2 "Voice 2", and "Tone" with v1 only. */
	async function givenSkills() {
		const voice = await createSkill({ content: { name: 'Voice' } });
		const voice2 = await createSkillVersion(voice.id, {
			name: 'Voice 2',
			instructions: 'v2',
			files: [{ path: 'references/a.md', content: 'A' }],
		});
		const tone = await createSkill({ content: { name: 'Tone' } });
		return { voice: { id: voice.id, v1: voice.versionId, v2: voice2.versionId }, tone };
	}

	it('resolves a following ref to the latest version and a pinned ref to its pin', async () => {
		const { voice, tone } = await givenSkills();

		const resolved = await runtime.resolveForAgentDraft([
			{ id: voice.id, versionId: voice.v1 },
			{ id: tone.id },
			{ id: 'skill_gone' },
		]);

		expect(resolved[voice.id]).toMatchObject({ name: 'Voice' });
		expect(resolved[tone.id]).toMatchObject({ name: 'Tone' });
		expect(resolved).not.toHaveProperty('skill_gone');
	});

	it('resolves a pin to a version of another skill to the latest version', async () => {
		const { voice, tone } = await givenSkills();

		const resolved = await runtime.resolveForAgentDraft([{ id: tone.id, versionId: voice.v2 }]);

		expect(resolved[tone.id]).toMatchObject({ name: 'Tone' });
	});

	it('names each ref by the version it runs', async () => {
		const { voice, tone } = await givenSkills();

		const nameOf = await runtime.runtimeNames(
			[
				{ id: voice.id, versionId: voice.v1 },
				{ id: voice.id },
				{ id: tone.id, versionId: voice.v1 },
				{ id: 'skill_gone' },
			],
			{},
		);

		expect(nameOf({ id: voice.id, versionId: voice.v1 })).toBe('Voice');
		expect(nameOf({ id: voice.id })).toBe('Voice 2');
		expect(nameOf({ id: tone.id, versionId: voice.v1 })).toBe('Tone');
		expect(nameOf({ id: 'skill_gone' })).toBeUndefined();
	});

	it('snapshots the version each ref runs for a saved agent version', async () => {
		const { voice, tone } = await givenSkills();

		const snapshot = await runtime.snapshotForSave(
			[{ id: voice.id, versionId: voice.v1 }, { id: tone.id }, { id: 'skill_gone' }],
			{},
		);

		expect(Object.fromEntries(snapshot)).toEqual({
			[voice.id]: voice.v1,
			[tone.id]: tone.versionId,
		});
	});

	it('finds the scope of each skill and leaves out unknown ids', async () => {
		const project = await createTeamProject('Team');
		const { id } = await createSkill({ projectId: project.id });

		const targets = await runtime.findTargets([id, 'skill_gone']);

		expect([...targets]).toEqual([[id, { projectId: project.id }]]);
	});

	it('resolves version ids to their skill, content and number', async () => {
		const { voice } = await givenSkills();

		// Version ids are UUIDs on Postgres, so an unknown one must be a UUID too.
		const unknown = randomUUID();
		const versions = await runtime.resolveVersions([voice.v2, unknown]);
		const refs = await runtime.findVersionRefs([voice.v1, voice.v2, unknown]);

		expect([...versions]).toEqual([
			[
				voice.v2,
				{
					skillId: voice.id,
					skill: {
						name: 'Voice 2',
						description: 'Write in our voice',
						instructions: 'v2',
						references: [{ path: 'references/a.md', content: 'A' }],
					},
				},
			],
		]);
		expect(Object.fromEntries(refs)).toEqual({
			[voice.v1]: { skillId: voice.id, version: 1 },
			[voice.v2]: { skillId: voice.id, version: 2 },
		});
	});
});
