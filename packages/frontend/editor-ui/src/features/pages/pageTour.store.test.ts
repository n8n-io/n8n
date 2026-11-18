import { createPinia, setActivePinia } from 'pinia';

import { usePagePeekStore } from './pagePeek.store';
import { usePageTourStore } from './pageTour.store';

const tour = {
	pageTitle: 'Runbook',
	steps: [
		{ nodeIds: ['n1'], text: 'First' },
		{ nodeIds: ['n2'], text: 'Second' },
		{ nodeIds: ['n3'], text: 'Third' },
	],
};

describe('pageTour store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('should run no tour at the start', () => {
		const store = usePageTourStore();

		expect(store.isActive).toBe(false);
		expect(store.currentStep).toBeUndefined();
	});

	it('should start at the first step', () => {
		const store = usePageTourStore();

		store.start(tour);

		expect(store.isActive).toBe(true);
		expect(store.pageTitle).toBe('Runbook');
		expect(store.currentStep).toEqual({ nodeIds: ['n1'], text: 'First' });
		expect(store.stepNumber).toBe(1);
		expect(store.stepCount).toBe(3);
		expect(store.isFirstStep).toBe(true);
		expect(store.isLastStep).toBe(false);
	});

	it('should close the page side panel when a tour starts', () => {
		const peekStore = usePagePeekStore();
		peekStore.open('page-1');

		usePageTourStore().start(tour);

		expect(peekStore.pageId).toBeUndefined();
	});

	it('should move to the next step and back', () => {
		const store = usePageTourStore();
		store.start(tour);

		store.next();
		expect(store.currentStep?.text).toBe('Second');
		expect(store.stepNumber).toBe(2);

		store.previous();
		expect(store.currentStep?.text).toBe('First');
	});

	it('should stay on the first step when the user goes back', () => {
		const store = usePageTourStore();
		store.start(tour);

		store.previous();

		expect(store.stepNumber).toBe(1);
		expect(store.isActive).toBe(true);
	});

	it('should end the tour when the user goes past the last step', () => {
		const store = usePageTourStore();
		store.start(tour);
		store.next();
		store.next();
		expect(store.isLastStep).toBe(true);

		store.next();

		expect(store.isActive).toBe(false);
		expect(store.currentStep).toBeUndefined();
	});

	it('should restart at the first step when another tour starts', () => {
		const store = usePageTourStore();
		store.start(tour);
		store.next();

		store.start({ pageTitle: 'Notes', steps: [{ nodeIds: ['x'], text: 'Only' }] });

		expect(store.stepNumber).toBe(1);
		expect(store.pageTitle).toBe('Notes');
		expect(store.isLastStep).toBe(true);
	});

	it('should run no tour after the end', () => {
		const store = usePageTourStore();
		store.start(tour);

		store.end();

		expect(store.isActive).toBe(false);
		expect(store.pageTitle).toBe('');
	});
});
