import { pickedClaudeInOnboarding } from './onboarding';

describe.each([
	{ surveyId: 'OArzTwNz', field: '6fe33101-6331-4088-b54f-ae4afe727f96' },
	{ surveyId: 'x0RS6StY', field: 'do_you_use_agents' },
])('Claude onboarding answer ($surveyId)', ({ surveyId, field }) => {
	it.each([
		{ choices: ['Claude (incl. Claude Code)'], expected: true },
		{ choices: ['ChatGPT', 'Claude (incl. Claude Code)', 'Cursor'], expected: true },
		{ choices: ['ChatGPT', 'Cursor'], expected: false },
		{ choices: ['None'], expected: false },
		{ choices: [], expected: false },
	])('reads $choices', ({ choices, expected }) => {
		expect(pickedClaudeInOnboarding({ surveyId, [field]: choices })).toBe(expected);
	});

	it.each([undefined, null, 'Claude (incl. Claude Code)', ['Claude (incl. Claude Code)', null]])(
		'leaves a missing or malformed answer unknown: %s',
		(answer) => {
			expect(pickedClaudeInOnboarding({ surveyId, [field]: answer })).toBeUndefined();
		},
	);

	it('does not match Claude in another question', () => {
		expect(
			pickedClaudeInOnboarding({ surveyId, referral: ['Claude (incl. Claude Code)'] }),
		).toBeUndefined();
	});
});

it.each([
	undefined,
	null,
	{},
	{ surveyId: 'ED6JPvTCMGCCYJud', do_you_use_agents: ['Claude (incl. Claude Code)'] },
])('leaves unsupported surveys unknown: %s', (information) =>
	expect(pickedClaudeInOnboarding(information)).toBeUndefined(),
);
