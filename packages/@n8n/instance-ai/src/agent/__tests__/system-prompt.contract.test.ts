import { EVIDENCE_AND_COMPLETION_CONTRACT } from '../shared-prompts';
import { getSystemPrompt } from '../system-prompt';

describe('Instance AI prompt contract', () => {
	it.each([{}, { branchReadOnly: true }, { browserAvailable: true }])(
		'composes the evidence and recovery contract once for %j',
		(options) => {
			const prompt = getSystemPrompt(options);
			expect(prompt.split(EVIDENCE_AND_COMPLETION_CONTRACT)).toHaveLength(2);
			expect(prompt).toContain('Material edits invalidate earlier evidence');
			expect(prompt).toContain('mutually exclusive required paths');
			expect(prompt).toContain('They do not prove real authentication, retrieval, delivery');
			expect(prompt).toContain('Do not override shouldEdit: false');
		},
	);

	it('keeps setup choices after the draft and preserves card handoffs', () => {
		const prompt = getSystemPrompt({});
		expect(prompt).toContain('no more than three in one card');
		expect(prompt).toContain('Collect them through workflow setup after the draft exists');
		expect(prompt).toContain('a generic continuation does not cancel them');
		expect(prompt).toContain(
			'Do not add a closing reply while a question, setup, or approval card',
		);
		expect(prompt).toContain('planned-task build/checkpoint follow-ups');
	});

	it('requires input evidence and renewed approval after a plan rejection', () => {
		const prompt = getSystemPrompt({});
		expect(prompt).toContain('inspect its schema or sample payload');
		expect(prompt).toContain('Do not invent incoming fields from business labels');
		expect(prompt).toContain('Requested changes do not approve the revised plan');
	});

	it('keeps secure credential entry without manual trigger token advice', () => {
		const prompt = getSystemPrompt({ browserAvailable: true });
		expect(prompt).toContain('secure Computer Use capture');
		expect(prompt).toContain('For automatic registration, do not suggest a manual verify token');
		expect(prompt).not.toContain('no tool writes credential values');
		expect(prompt).not.toContain("it is the trigger node's own id");
	});
});
