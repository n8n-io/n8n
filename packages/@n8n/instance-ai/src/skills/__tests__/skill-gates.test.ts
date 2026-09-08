import {
	BROWSER_RECORDING_PROPOSAL_SKILL_ID,
	CONFIG_EVALS_SKILL_ID,
	disabledInstanceAiSkillIds,
} from '../skill-gates';

describe('disabledInstanceAiSkillIds', () => {
	it('hides the config-evals skill when the flag is off', () => {
		expect(
			disabledInstanceAiSkillIds({
				configEvalsEnabled: false,
				browserRecordingProposalEnabled: true,
			}),
		).toEqual([CONFIG_EVALS_SKILL_ID]);
	});

	it('hides the browser-recording-proposal skill when Browser Use is disabled', () => {
		expect(
			disabledInstanceAiSkillIds({
				configEvalsEnabled: true,
				browserRecordingProposalEnabled: false,
			}),
		).toEqual([BROWSER_RECORDING_PROPOSAL_SKILL_ID]);
	});

	it('hides nothing when both flags are on', () => {
		expect(
			disabledInstanceAiSkillIds({
				configEvalsEnabled: true,
				browserRecordingProposalEnabled: true,
			}),
		).toEqual([]);
	});
});
