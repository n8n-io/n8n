import { createPinia, setActivePinia } from 'pinia';

import { LOCAL_STORAGE_WORKFLOW_REVIEW_REQUIRED_BY_WORKFLOW } from '@/app/constants/localStorage';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useReviewRequiredStore } from './reviewRequired.store';

const USER_1 = 'user-1';
const USER_2 = 'user-2';

const createStoreForUser = (userId: string) => {
	setActivePinia(createPinia());
	useUsersStore().currentUserId = userId;
	return useReviewRequiredStore();
};

describe('reviewRequired.store', () => {
	beforeEach(() => {
		localStorage.removeItem(LOCAL_STORAGE_WORKFLOW_REVIEW_REQUIRED_BY_WORKFLOW(USER_1));
		localStorage.removeItem(LOCAL_STORAGE_WORKFLOW_REVIEW_REQUIRED_BY_WORKFLOW(USER_2));
		createStoreForUser(USER_1);
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

		expect(createStoreForUser(USER_1).isReviewRequired('workflow-1')).toBe(true);
	});

	it('keeps preferences independent between users', () => {
		useReviewRequiredStore().setReviewRequired('workflow-1', true);

		expect(createStoreForUser(USER_2).isReviewRequired('workflow-1')).toBe(false);
		expect(createStoreForUser(USER_1).isReviewRequired('workflow-1')).toBe(true);
	});
});
