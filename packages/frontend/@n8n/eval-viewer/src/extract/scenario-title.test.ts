import { describe, expect, it } from 'vitest';

import { caseTitle, scenarioTitle, slugToSentence } from './scenario-title';

describe('slugToSentence', () => {
	it.each([
		['three-orders-three-runs', 'Three orders, three runs'],
		['fifty-five-ids-two-requests', 'Fifty-five IDs, two requests'],
		['seven-recipients-two-batches', 'Seven recipients, two batches'],
		['happy-path', 'Happy path'],
		['large-pdf', 'Large PDF'],
		['slack-fails-order-still-fulfilled', 'Slack fails order still fulfilled'],
		['retry-3-times', 'Retry, 3 times'],
	])('turns %s into %s', (slug, sentence) => {
		expect(slugToSentence(slug)).toBe(sentence);
	});
});

describe('scenarioTitle', () => {
	it('uses the scenario description when there is one', () => {
		expect(scenarioTitle('happy-path', '  PDF arrives and is parsed ')).toBe(
			'PDF arrives and is parsed',
		);
	});

	it('falls back to the slug as a sentence', () => {
		expect(scenarioTitle('three-orders-three-runs', '')).toBe('Three orders, three runs');
		expect(scenarioTitle('three-orders-three-runs', null)).toBe('Three orders, three runs');
	});
});

describe('caseTitle', () => {
	it('uses the harness title when there is one', () => {
		expect(caseTitle('nc-ab-http-retry', ' Retry failed HTTP calls ')).toBe(
			'Retry failed HTTP calls',
		);
	});

	it('falls back to the slug as a sentence without the nc- prefix and the holdout tag', () => {
		expect(caseTitle('nc-ab-holdout-github-bugs-to-slack', null)).toBe('Ab github bugs to slack');
		expect(caseTitle('loop-chunked-bulk-api', '')).toBe('Loop chunked bulk API');
	});
});
