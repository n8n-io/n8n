import { describe, it, expect } from 'vitest';
import { ref } from 'vue';
import { useWizardNavigation } from './useWizardNavigation';

describe('useWizardNavigation', () => {
	it('initializes at step 0 by default', () => {
		const { currentStepIndex } = useWizardNavigation({ totalSteps: 3 });
		expect(currentStepIndex.value).toBe(0);
	});

	it('initializes at custom step', () => {
		const { currentStepIndex } = useWizardNavigation({ totalSteps: 3, initialStep: 2 });
		expect(currentStepIndex.value).toBe(2);
	});

	it('navigates forward', () => {
		const { currentStepIndex, goToNext } = useWizardNavigation({ totalSteps: 3 });
		goToNext();
		expect(currentStepIndex.value).toBe(1);
		goToNext();
		expect(currentStepIndex.value).toBe(2);
	});

	it('does not navigate past last step', () => {
		const { currentStepIndex, goToNext } = useWizardNavigation({ totalSteps: 2 });
		goToNext();
		goToNext();
		expect(currentStepIndex.value).toBe(1);
	});

	it('navigates backward', () => {
		const { currentStepIndex, goToPrev } = useWizardNavigation({
			totalSteps: 3,
			initialStep: 2,
		});
		goToPrev();
		expect(currentStepIndex.value).toBe(1);
	});

	it('does not navigate before first step', () => {
		const { currentStepIndex, goToPrev } = useWizardNavigation({ totalSteps: 3 });
		goToPrev();
		expect(currentStepIndex.value).toBe(0);
	});

	it('computes isPrevDisabled correctly', () => {
		const { isPrevDisabled, goToNext } = useWizardNavigation({ totalSteps: 3 });
		expect(isPrevDisabled.value).toBe(true);
		goToNext();
		expect(isPrevDisabled.value).toBe(false);
	});

	it('computes isNextDisabled correctly', () => {
		const { isNextDisabled, goToNext } = useWizardNavigation({ totalSteps: 2 });
		expect(isNextDisabled.value).toBe(false);
		goToNext();
		expect(isNextDisabled.value).toBe(true);
	});

	it('computes isFirstStep and isLastStep', () => {
		const { isFirstStep, isLastStep, goToNext } = useWizardNavigation({ totalSteps: 2 });
		expect(isFirstStep.value).toBe(true);
		expect(isLastStep.value).toBe(false);
		goToNext();
		expect(isFirstStep.value).toBe(false);
		expect(isLastStep.value).toBe(true);
	});

	it('goToStep navigates to specific step', () => {
		const { currentStepIndex, goToStep } = useWizardNavigation({ totalSteps: 5 });
		goToStep(3);
		expect(currentStepIndex.value).toBe(3);
	});

	it('goToStep ignores out-of-range values', () => {
		const { currentStepIndex, goToStep } = useWizardNavigation({ totalSteps: 3 });
		goToStep(5);
		expect(currentStepIndex.value).toBe(0);
		goToStep(-1);
		expect(currentStepIndex.value).toBe(0);
	});

	it('works with reactive totalSteps', () => {
		const totalSteps = ref(3);
		const { isNextDisabled, goToNext } = useWizardNavigation({ totalSteps });
		goToNext();
		goToNext();
		expect(isNextDisabled.value).toBe(true);
		totalSteps.value = 5;
		expect(isNextDisabled.value).toBe(false);
	});

	it('handles single step wizard', () => {
		const { isPrevDisabled, isNextDisabled, isFirstStep, isLastStep } = useWizardNavigation({
			totalSteps: 1,
		});
		expect(isPrevDisabled.value).toBe(true);
		expect(isNextDisabled.value).toBe(true);
		expect(isFirstStep.value).toBe(true);
		expect(isLastStep.value).toBe(true);
	});
});
