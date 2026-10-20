import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';

import { useUsersStore } from '@n8n/stores/users.store';
import { useReviewInboxSectionCollapse } from './useReviewInboxSectionCollapse';

describe('useReviewInboxSectionCollapse', () => {
	beforeEach(() => {
		localStorage.clear();
		setActivePinia(createPinia());
	});

	it('starts with both sections expanded and writes nothing until toggled', () => {
		useUsersStore().currentUserId = 'user-1';
		const { isCollapsed } = useReviewInboxSectionCollapse();

		expect(isCollapsed('waiting')).toBe(false);
		expect(isCollapsed('authored')).toBe(false);
		expect(localStorage.getItem('user-1_N8N_WORKFLOW_REVIEW_INBOX_COLLAPSED_SECTIONS')).toBeNull();
	});

	it('restores the existing review section preference', () => {
		useUsersStore().currentUserId = 'user-1';
		localStorage.setItem(
			'user-1_N8N_WORKFLOW_REVIEW_INBOX_COLLAPSED_SECTIONS',
			JSON.stringify({ waiting: true, authored: false }),
		);
		const { isCollapsed } = useReviewInboxSectionCollapse();
		expect(isCollapsed('waiting')).toBe(true);
		expect(isCollapsed('authored')).toBe(false);
	});

	it('persists a collapsed section for the current user', async () => {
		useUsersStore().currentUserId = 'user-1';
		const { isCollapsed, toggleSection } = useReviewInboxSectionCollapse();

		toggleSection('authored');
		await nextTick();

		expect(isCollapsed('authored')).toBe(true);
		expect(isCollapsed('waiting')).toBe(false);
		expect(localStorage.getItem('user-1_N8N_WORKFLOW_REVIEW_INBOX_COLLAPSED_SECTIONS')).toBe(
			JSON.stringify({ waiting: false, authored: true }),
		);
	});

	it('keeps the choice independent between users', () => {
		useUsersStore().currentUserId = 'user-1';
		useReviewInboxSectionCollapse().toggleSection('waiting');

		setActivePinia(createPinia());
		useUsersStore().currentUserId = 'user-2';

		expect(useReviewInboxSectionCollapse().isCollapsed('waiting')).toBe(false);
	});

	it('falls back to a non-persistent ref when there is no current user', async () => {
		const { isCollapsed, toggleSection } = useReviewInboxSectionCollapse();

		toggleSection('waiting');
		await nextTick();

		expect(isCollapsed('waiting')).toBe(true);
		expect(localStorage.getItem('_N8N_WORKFLOW_REVIEW_INBOX_COLLAPSED_SECTIONS')).toBeNull();
	});
});
