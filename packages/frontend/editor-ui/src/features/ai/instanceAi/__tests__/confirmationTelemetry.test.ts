import type { InstanceAiQuestion } from '@n8n/api-types';

import { questionsInputs } from '../confirmationTelemetry';

describe('questionsInputs', () => {
	const questions: InstanceAiQuestion[] = [
		{ id: 'app', question: 'Which app?', type: 'single', options: ['Slack', 'Teams'] },
		{
			id: 'channel',
			question: 'Which channel?',
			type: 'single',
			options: ['Default channel'],
			optionsByAnswer: {
				questionId: 'app',
				options: { Slack: ['#general', '#sales'], Teams: ['General'] },
			},
		},
	];

	it('records the options that a dependent question showed for the earlier answer', () => {
		const { provided } = questionsInputs(questions, [
			{ questionId: 'app', question: 'Which app?', selectedOptions: ['Slack'] },
			{ questionId: 'channel', question: 'Which channel?', selectedOptions: ['#sales'] },
		]);

		expect(provided).toEqual([
			expect.objectContaining({ label: 'app', options: ['Slack', 'Teams'] }),
			expect.objectContaining({
				label: 'channel',
				options: ['#general', '#sales'],
				option_chosen: '#sales',
			}),
		]);
	});

	it('records the fallback options when the earlier answer has no list of its own', () => {
		const { provided, skipped } = questionsInputs(questions, [
			{ questionId: 'app', question: 'Which app?', selectedOptions: [], customText: 'Discord' },
			{ questionId: 'channel', question: 'Which channel?', selectedOptions: [], skipped: true },
		]);

		expect(provided).toEqual([expect.objectContaining({ label: 'app', option_chosen: 'Discord' })]);
		expect(skipped).toEqual([
			expect.objectContaining({ label: 'channel', options: ['Default channel'] }),
		]);
	});
});
