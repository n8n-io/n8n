import { describe, expect, it } from 'vitest';

import { questionDrafts, saveQuestionsDraft } from '../questionDrafts';

describe('saveQuestionsDraft', () => {
	it('drops the oldest draft when there are too many', () => {
		questionDrafts.clear();
		for (let i = 0; i <= 20; i++) {
			saveQuestionsDraft(`request-${i}`, { currentIndex: 0, answers: new Map() });
		}

		expect(questionDrafts.size).toBe(20);
		expect(questionDrafts.has('request-0')).toBe(false);
		expect(questionDrafts.has('request-20')).toBe(true);
	});
});
