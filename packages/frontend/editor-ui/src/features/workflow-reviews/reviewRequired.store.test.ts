import { createPinia, setActivePinia } from 'pinia';

import { LOCAL_STORAGE_WORKFLOW_REVIEW_REQUIRED_BY_WORKFLOW } from '@/app/constants/localStorage';
import { useReviewRequiredStore } from './reviewRequired.store';

describe('reviewRequired.store', () => {
	beforeEach(() => {
		localStorage.removeItem(LOCAL_STORAGE_WORKFLOW_REVIEW_REQUIRED_BY_WORKFLOW);
		setActivePinia(createPinia());
	});

	it('defaults to off', () => {
		const store = useReviewRequiredStore();

		expect(store.isReviewRequired('workflow-1')).toBe(false);
	});

	it('sets and reads true and false values', () => {
		const store = useReviewRequiredStore();

		store.setReviewRequired('workflow-1', true);
		expect(store.isReviewRequired('workflow-1')).toBe(true);

		store.setReviewRequired('workflow-1', false);
		expect(store.isReviewRequired('workflow-1')).toBe(false);
	});

	it('keeps workflow preferences independent', () => {
		const store = useReviewRequiredStore();

		store.setReviewRequired('workflow-1', true);

		expect(store.isReviewRequired('workflow-1')).toBe(true);
		expect(store.isReviewRequired('workflow-2')).toBe(false);
	});

	it('persists through a fresh Pinia and store instance', () => {
		useReviewRequiredStore().setReviewRequired('workflow-1', true);
		setActivePinia(createPinia());

		expect(useReviewRequiredStore().isReviewRequired('workflow-1')).toBe(true);
	});
});
