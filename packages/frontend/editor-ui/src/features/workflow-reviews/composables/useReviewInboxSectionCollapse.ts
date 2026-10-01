import { useLocalStorage } from '@vueuse/core';
import { ref } from 'vue';

import { LOCAL_STORAGE_WORKFLOW_REVIEW_INBOX_COLLAPSED_SECTIONS } from '@/app/constants/localStorage';
import { useUsersStore } from '@n8n/stores/users.store';

/** Only the open tab is sectioned, so only those two sections can collapse. */
export type CollapsibleReviewInboxSection = 'waiting' | 'authored';

export type CollapsedReviewInboxSections = Record<CollapsibleReviewInboxSection, boolean>;

const DEFAULT_COLLAPSED: CollapsedReviewInboxSections = { waiting: false, authored: false };

/**
 * Which inbox sections are collapsed, persisted per user. Collapsing only hides
 * rows — the store keeps the loaded items and their cursors, so re-expanding
 * never refetches.
 */
export const useReviewInboxSectionCollapse = () => {
	const usersStore = useUsersStore();
	const userId = usersStore.currentUserId;

	const collapsedSections = userId
		? useLocalStorage<CollapsedReviewInboxSections>(
				LOCAL_STORAGE_WORKFLOW_REVIEW_INBOX_COLLAPSED_SECTIONS(userId),
				{ ...DEFAULT_COLLAPSED },
				{ writeDefaults: false },
			)
		: ref<CollapsedReviewInboxSections>({ ...DEFAULT_COLLAPSED });

	function isCollapsed(section: CollapsibleReviewInboxSection): boolean {
		return collapsedSections.value[section] ?? false;
	}

	function toggleSection(section: CollapsibleReviewInboxSection): void {
		collapsedSections.value = {
			...collapsedSections.value,
			[section]: !isCollapsed(section),
		};
	}

	return { collapsedSections, isCollapsed, toggleSection };
};
