import { describe, it, expect } from 'vitest';

import { isOnboardingExampleQuestion, isPendingItemFloating } from '../confirmationKinds';
import type { PendingConfirmationItem } from '../instanceAi.store';

function questionItem(requestId: string): PendingConfirmationItem {
	return {
		toolCall: { confirmation: { requestId, inputType: 'questions', questions: [] } },
	} as unknown as PendingConfirmationItem;
}

describe('confirmationKinds', () => {
	it('floats a question card into the input slot', () => {
		expect(isPendingItemFloating(questionItem('onboarding-intent~abc'))).toBe(true);
	});

	// The example card shows this question on its last node, so the slot must not take it.
	it('keeps the onboarding example question out of the input slot', () => {
		const item = questionItem('onboarding-example~abc');

		expect(isOnboardingExampleQuestion(item)).toBe(true);
		expect(isPendingItemFloating(item)).toBe(false);
	});

	it('tells other questions from the example question', () => {
		expect(isOnboardingExampleQuestion(questionItem('onboarding-intent~abc'))).toBe(false);
	});
});
