import { MAX_ASSISTANT_THREAD_OPEN_TABS, type AssistantThreadTabsState } from '@n8n/api-types';

import { withShownTab } from '../assistant-thread-tabs';

describe('withShownTab', () => {
	const stored: AssistantThreadTabsState = {
		tabs: [{ type: 'workflow', id: 'wf-1', name: 'Sync' }],
		closedTabs: [
			{ type: 'data-table', id: 'dt-1' },
			{ type: 'agent', id: 'agent-1' },
		],
		activeTab: { type: 'workflow', id: 'wf-1' },
		previewOpen: true,
	};

	it('creates a state that shows the tab when no state is stored', () => {
		expect(withShownTab(null, { type: 'agent', id: 'agent-1', name: 'Helper' })).toEqual({
			tabs: [{ type: 'agent', id: 'agent-1', name: 'Helper' }],
			closedTabs: [],
			activeTab: { type: 'agent', id: 'agent-1' },
			previewOpen: true,
		});
	});

	it('reopens a closed tab at the end, shows it, and keeps the other closed tabs', () => {
		expect(withShownTab(stored, { type: 'data-table', id: 'dt-1', name: 'Leads' })).toEqual({
			tabs: [...stored.tabs, { type: 'data-table', id: 'dt-1', name: 'Leads' }],
			closedTabs: [{ type: 'agent', id: 'agent-1' }],
			activeTab: { type: 'data-table', id: 'dt-1' },
			previewOpen: true,
		});
	});

	it('opens the preview of a closed preview, and makes an open tab active', () => {
		const result = withShownTab(
			{
				...stored,
				tabs: [...stored.tabs, { type: 'agent', id: 'agent-2', name: 'Bot' }],
				activeTab: null,
				previewOpen: false,
			},
			{ type: 'agent', id: 'agent-2', name: 'Bot' },
		);
		expect(result?.activeTab).toEqual({ type: 'agent', id: 'agent-2' });
		expect(result?.previewOpen).toBe(true);
	});

	it('keeps an open tab in place and updates its name', () => {
		const result = withShownTab(
			{ ...stored, tabs: [...stored.tabs, { type: 'agent', id: 'agent-2', name: 'Bot' }] },
			{ type: 'workflow', id: 'wf-1', name: 'Renamed' },
		);
		expect(result?.tabs).toEqual([
			{ type: 'workflow', id: 'wf-1', name: 'Renamed' },
			{ type: 'agent', id: 'agent-2', name: 'Bot' },
		]);
	});

	it('returns null when the tab is shown with the same details', () => {
		expect(withShownTab(stored, { type: 'workflow', id: 'wf-1', name: 'Sync' })).toBeNull();
		expect(withShownTab(stored, { type: 'workflow', id: 'wf-1' })).toBeNull();
	});

	it('falls back to the stored name, then the id, when the change has no name', () => {
		const result = withShownTab(
			{ ...stored, tabs: [...stored.tabs, { type: 'agent', id: 'agent-2', name: 'Bot' }] },
			{ type: 'agent', id: 'agent-2' },
		);
		expect(result?.tabs.at(-1)).toEqual({ type: 'agent', id: 'agent-2', name: 'Bot' });

		expect(withShownTab(null, { type: 'workflow', id: 'wf-9' })?.tabs).toEqual([
			{ type: 'workflow', id: 'wf-9', name: 'wf-9' },
		]);
	});

	it('closes the leftmost tabs over the limit, but not the new tab', () => {
		const tabs = Array.from({ length: MAX_ASSISTANT_THREAD_OPEN_TABS }, (_, i) => ({
			type: 'workflow' as const,
			id: `wf-${i}`,
			name: `Workflow ${i}`,
		}));
		const result = withShownTab(
			{ tabs, closedTabs: [], activeTab: { type: 'workflow', id: 'wf-0' } },
			{ type: 'agent', id: 'agent-1', name: 'Helper' },
		);

		expect(result?.tabs).toHaveLength(MAX_ASSISTANT_THREAD_OPEN_TABS);
		expect(result?.tabs.at(-1)).toEqual({ type: 'agent', id: 'agent-1', name: 'Helper' });
		expect(result?.closedTabs).toEqual([{ type: 'workflow', id: 'wf-0' }]);
		expect(result?.activeTab).toEqual({ type: 'agent', id: 'agent-1' });
	});
});
