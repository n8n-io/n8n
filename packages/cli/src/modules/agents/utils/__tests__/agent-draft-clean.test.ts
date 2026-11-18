import { mock } from 'vitest-mock-extended';

import type { AgentSkillRefsService } from '../../agent-skill-refs.service';
import { isAgentDraftClean } from '../agent-draft-clean';

describe('isAgentDraftClean', () => {
	const snapshot = new Map([['skill-1', 'skill-version-1']]);
	const agent = {
		id: 'agent-1',
		schema: null,
		versionId: 'version-1',
		activeVersionId: 'version-1',
	};

	function makeSkillRefs(matches: boolean) {
		const skillRefs = mock<AgentSkillRefsService>();
		skillRefs.versionSnapshot.mockResolvedValue(snapshot);
		skillRefs.matchesVersion.mockResolvedValue(matches);
		return skillRefs;
	}

	it('is clean when the draft is the published version and the skill versions match', async () => {
		const skillRefs = makeSkillRefs(true);

		await expect(isAgentDraftClean(agent, skillRefs)).resolves.toBe(true);
		expect(skillRefs.matchesVersion).toHaveBeenCalledWith('version-1', snapshot, {});
	});

	it('is not clean when the agent is not published', async () => {
		const skillRefs = makeSkillRefs(true);

		await expect(isAgentDraftClean({ ...agent, activeVersionId: null }, skillRefs)).resolves.toBe(
			false,
		);
		expect(skillRefs.versionSnapshot).not.toHaveBeenCalled();
	});

	it('is not clean when the draft version is not the published version', async () => {
		await expect(
			isAgentDraftClean({ ...agent, versionId: 'version-2' }, makeSkillRefs(true)),
		).resolves.toBe(false);
	});

	it('is not clean when a followed skill has a different version', async () => {
		await expect(isAgentDraftClean(agent, makeSkillRefs(false))).resolves.toBe(false);
	});
});
