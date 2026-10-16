import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useToast } from '@n8n/composables/useToast';
import { mockRestrictedNodeTypes } from '@n8n/frontend-module-type-availability-policies/__tests__/mocks';

import { mockNodeTypeDescription } from '@/__tests__/mocks';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

import { useRestrictedNodeWarning } from './useRestrictedNodeWarning';

vi.mock('@n8n/composables/useToast', () => {
	const showMessage = vi.fn();
	return { useToast: () => ({ showMessage }) };
});

const SLACK_NODE = 'n8n-nodes-base.slack';
const NOTION_NODE = 'n8n-nodes-base.notion';
const SET_NODE = 'n8n-nodes-base.set';

describe('useRestrictedNodeWarning', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());

		const nodeTypesStore = useNodeTypesStore();
		nodeTypesStore.nodeTypes = {
			[SLACK_NODE]: { 1: mockNodeTypeDescription({ name: SLACK_NODE, displayName: 'Slack' }) },
			[NOTION_NODE]: { 1: mockNodeTypeDescription({ name: NOTION_NODE, displayName: 'Notion' }) },
			[SET_NODE]: { 1: mockNodeTypeDescription({ name: SET_NODE, displayName: 'Edit Fields' }) },
		};
	});

	describe('warnIfRestricted', () => {
		it('shows a warning and reports true for a restricted type', () => {
			mockRestrictedNodeTypes({ [SLACK_NODE]: 'instance' });
			const toast = useToast();

			const { warnIfRestricted } = useRestrictedNodeWarning();
			expect(warnIfRestricted(SLACK_NODE)).toBe(true);

			expect(toast.showMessage).toHaveBeenCalledWith({
				type: 'warning',
				title: 'This node is restricted',
				message:
					"An administrator blocked 'Slack' on this instance. Contact an instance admin to continue.",
			});
		});

		it('does nothing and reports false for an unrestricted type', () => {
			mockRestrictedNodeTypes();
			const toast = useToast();

			const { warnIfRestricted } = useRestrictedNodeWarning();
			expect(warnIfRestricted(SET_NODE)).toBe(false);

			expect(toast.showMessage).not.toHaveBeenCalled();
		});
	});

	describe('warnAboutRestrictedNodes', () => {
		it('shows no toast when none of the types are restricted', () => {
			mockRestrictedNodeTypes();
			const toast = useToast();

			const { warnAboutRestrictedNodes } = useRestrictedNodeWarning();
			warnAboutRestrictedNodes([SET_NODE, NOTION_NODE]);

			expect(toast.showMessage).not.toHaveBeenCalled();
		});

		it('shows a single warning with the replace next step for one restricted node', () => {
			mockRestrictedNodeTypes({ [SLACK_NODE]: 'project' });
			const toast = useToast();

			const { warnAboutRestrictedNodes } = useRestrictedNodeWarning();
			warnAboutRestrictedNodes([SET_NODE, SLACK_NODE]);

			expect(toast.showMessage).toHaveBeenCalledTimes(1);
			expect(toast.showMessage).toHaveBeenCalledWith({
				type: 'warning',
				title: 'This node is restricted',
				message:
					"An administrator blocked 'Slack' in this project. Contact an instance admin or replace the node to continue.",
			});
		});

		it('shows one combined toast listing display names when several nodes are restricted', () => {
			mockRestrictedNodeTypes({ [SLACK_NODE]: 'instance', [NOTION_NODE]: 'project' });
			const toast = useToast();

			const { warnAboutRestrictedNodes } = useRestrictedNodeWarning();
			warnAboutRestrictedNodes([SET_NODE, SLACK_NODE, NOTION_NODE]);

			expect(toast.showMessage).toHaveBeenCalledTimes(1);
			expect(toast.showMessage).toHaveBeenCalledWith({
				type: 'warning',
				title: 'Some nodes are restricted',
				message:
					"An administrator blocked 'Slack', 'Notion'. Contact an instance admin or replace these nodes to continue.",
			});
		});

		it('counts duplicate occurrences of the same restricted type once', () => {
			mockRestrictedNodeTypes({ [SLACK_NODE]: 'instance' });
			const toast = useToast();

			const { warnAboutRestrictedNodes } = useRestrictedNodeWarning();
			warnAboutRestrictedNodes([SLACK_NODE, SLACK_NODE, SLACK_NODE]);

			// Three duplicates of the same restricted type still take the single-warning branch.
			expect(toast.showMessage).toHaveBeenCalledTimes(1);
			expect(toast.showMessage).toHaveBeenCalledWith(
				expect.objectContaining({ title: 'This node is restricted' }),
			);
		});
	});
});
