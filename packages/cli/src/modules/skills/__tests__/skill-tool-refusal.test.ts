import { ConflictError, UserError } from '@n8n/errors';

import { SkillNameTakenError, skillNameTakenToolMessage } from '../errors/skill-name-taken.error';
import { SkillSyncedError } from '../errors/skill-synced.error';
import { toSkillToolRefusal } from '../errors/skill-tool-refusal';

describe('toSkillToolRefusal', () => {
	const nameTaken = new SkillNameTakenError('Brand voice');
	const conflict = new ConflictError('"Support" would lose access to this skill.');
	const update = (currentHash: string) => ({
		baseSkillHash: 'base',
		currentHash: vi.fn(async () => currentHash),
	});

	it.each([
		{
			case: 'a taken name on a create',
			error: nameTaken,
			update: undefined,
			expected: { code: 'skill_name_taken', message: skillNameTakenToolMessage('Brand voice') },
		},
		{
			case: 'a taken name on an update, also when the hash changed',
			error: nameTaken,
			update: update('newer'),
			expected: { code: 'skill_name_taken', message: skillNameTakenToolMessage('Brand voice') },
		},
		{
			case: 'a conflict on an update after another save',
			error: conflict,
			update: update('newer'),
			expected: { code: 'stale_skill', skillHash: 'newer' },
		},
		{
			case: 'a conflict on an update of an unchanged skill, such as a refused move',
			error: conflict,
			update: update('base'),
			expected: undefined,
		},
		{ case: 'a conflict on a create', error: conflict, update: undefined, expected: undefined },
		{
			case: 'a change to a synced skill, also when the hash changed',
			error: new SkillSyncedError('Brand voice', 'GitHub'),
			update: update('newer'),
			expected: {
				code: 'skill_synced',
				message:
					'The skill "Brand voice" is synced from GitHub, so it is read-only and nothing was saved. Do not retry. Tell the user to change it in GitHub.',
			},
		},
		{
			case: 'a move of a synced skill on its own',
			error: new SkillSyncedError('Brand voice', 'GitHub', 'move'),
			update: update('base'),
			expected: {
				code: 'skill_synced',
				message:
					'The skill "Brand voice" is synced from GitHub, so it moves only with its source and nothing was saved. Do not retry. Tell the user to stop syncing it first.',
			},
		},
		{
			case: 'any other error',
			error: new UserError('Bad input'),
			update: update('newer'),
			expected: undefined,
		},
	])('$case', async ({ error, update, expected }) => {
		expect(await toSkillToolRefusal(error, update)).toEqual(expected);
	});

	it('reads the current hash only for a conflict on an update', async () => {
		const notAConflict = update('newer');
		await toSkillToolRefusal(nameTaken, notAConflict);
		await toSkillToolRefusal(new SkillSyncedError('Brand voice', 'GitHub'), notAConflict);
		await toSkillToolRefusal(new UserError('Bad input'), notAConflict);

		expect(notAConflict.currentHash).not.toHaveBeenCalled();
	});
});
