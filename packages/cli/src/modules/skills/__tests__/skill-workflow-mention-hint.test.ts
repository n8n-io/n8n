import {
	SKILL_WORKFLOW_MENTION_HINT,
	withSkillWorkflowMentionHint,
} from '../utils/skill-workflow-mention-hint';

const mentioning = 'Run [Report](n8n://workflow/wf-1).';

describe('withSkillWorkflowMentionHint', () => {
	it('adds the hint after instructions that mention a workflow', () => {
		expect(withSkillWorkflowMentionHint({ instructions: mentioning }).instructions).toBe(
			`${mentioning}\n\n${SKILL_WORKFLOW_MENTION_HINT}`,
		);
	});

	it('keeps instructions without a mention', () => {
		const skill = { instructions: 'Be brief.' };

		expect(withSkillWorkflowMentionHint(skill)).toBe(skill);
	});

	it('adds the hint only once to instructions that already end with it', () => {
		const hinted = withSkillWorkflowMentionHint({ instructions: mentioning });

		expect(withSkillWorkflowMentionHint(hinted)).toBe(hinted);
	});
});
