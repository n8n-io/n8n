import { MAX_INSTANCE_AI_THREAD_OPEN_TABS, type InstanceAiThreadTabsState } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { DataTableRepository } from '@/modules/data-table/data-table.repository';

import { InstanceAiThreadTabsService, withShownTab } from '../instance-ai-thread-tabs.service';
import type { InstanceAiThreadTabsRepository } from '../repositories/instance-ai-thread-tabs.repository';

const THREAD_ID = 'thread-1';
const USER_ID = 'user-1';

describe('InstanceAiThreadTabsService', () => {
	const logger = mock<Logger>();
	const repository = mock<InstanceAiThreadTabsRepository>();
	const workflowRepository = mock<WorkflowRepository>();
	const dataTableRepository = mock<DataTableRepository>();
	const service = new InstanceAiThreadTabsService(
		logger,
		repository,
		workflowRepository,
		dataTableRepository,
	);

	const state: InstanceAiThreadTabsState = {
		tabs: [{ type: 'agent', id: 'agent-1', name: 'SEO Auditor' }],
		closedTabs: [],
		activeTab: { type: 'agent', id: 'agent-1' },
	};

	beforeEach(() => {
		vi.clearAllMocks();
		workflowRepository.findByIds.mockResolvedValue([]);
		dataTableRepository.findSummariesByIds.mockResolvedValue([]);
	});

	it('returns the stored tabs', async () => {
		repository.findState.mockResolvedValue(state);

		await expect(service.getState(THREAD_ID, USER_ID)).resolves.toEqual(state);
		expect(repository.findState).toHaveBeenCalledWith(THREAD_ID, USER_ID);
	});

	it('returns stored tabs that were saved before previewOpen existed, and keeps previewOpen when present', async () => {
		repository.findState.mockResolvedValue(state);
		await expect(service.getState(THREAD_ID, USER_ID)).resolves.toEqual(state);

		repository.findState.mockResolvedValue({ ...state, previewOpen: true });
		await expect(service.getState(THREAD_ID, USER_ID)).resolves.toEqual({
			...state,
			previewOpen: true,
		});
	});

	it('returns null when no tabs are stored', async () => {
		repository.findState.mockResolvedValue(null);

		await expect(service.getState(THREAD_ID, USER_ID)).resolves.toBeNull();
	});

	it('returns null and logs a warning when the stored tabs have an invalid shape', async () => {
		repository.findState.mockResolvedValue({ tabs: 'not-an-array' });

		await expect(service.getState(THREAD_ID, USER_ID)).resolves.toBeNull();
		expect(logger.warn).toHaveBeenCalledWith(expect.any(String), { threadId: THREAD_ID });
	});

	it('saves the tabs for the user and thread', async () => {
		await service.saveState(THREAD_ID, USER_ID, state);

		expect(repository.saveState).toHaveBeenCalledWith(THREAD_ID, USER_ID, state);
	});

	describe('showArtifactTab', () => {
		it('writes the stored tabs with the artifact tab open', async () => {
			await service.showArtifactTab(THREAD_ID, USER_ID, {
				type: 'workflow',
				id: 'wf-1',
				name: 'Sync',
			});

			expect(repository.updateState).toHaveBeenCalledWith(THREAD_ID, USER_ID, expect.any(Function));
			const update = repository.updateState.mock.calls[0][2];
			expect(update(state)).toEqual({
				tabs: [...state.tabs, { type: 'workflow', id: 'wf-1', name: 'Sync' }],
				closedTabs: [],
				activeTab: { type: 'workflow', id: 'wf-1' },
				previewOpen: true,
			});
		});

		it('creates the stored tabs when none or only invalid tabs are stored', async () => {
			await service.showArtifactTab(THREAD_ID, USER_ID, {
				type: 'workflow',
				id: 'wf-1',
				name: 'Sync',
			});

			const update = repository.updateState.mock.calls[0][2];
			const created = {
				tabs: [{ type: 'workflow', id: 'wf-1', name: 'Sync' }],
				closedTabs: [],
				activeTab: { type: 'workflow', id: 'wf-1' },
				previewOpen: true,
			};
			expect(update(null)).toEqual(created);
			expect(update({ tabs: 'not-an-array' })).toEqual(created);
		});

		it('uses the current name of a workflow', async () => {
			workflowRepository.findByIds.mockResolvedValue([mock<WorkflowEntity>({ name: 'Renamed' })]);

			await service.showArtifactTab(THREAD_ID, USER_ID, {
				type: 'workflow',
				id: 'wf-1',
				name: 'Sync',
			});

			const update = repository.updateState.mock.calls[0][2];
			expect(update(null)?.tabs).toEqual([{ type: 'workflow', id: 'wf-1', name: 'Renamed' }]);
		});

		it('uses the current name and project of a data table', async () => {
			dataTableRepository.findSummariesByIds.mockResolvedValue([
				{ id: 'dt-1', name: 'Leads', projectId: 'project-1' },
			]);

			await service.showArtifactTab(THREAD_ID, USER_ID, { type: 'data-table', id: 'dt-1' });

			const update = repository.updateState.mock.calls[0][2];
			expect(update(null)?.tabs).toEqual([
				{ type: 'data-table', id: 'dt-1', name: 'Leads', projectId: 'project-1' },
			]);
		});
	});
});

describe('withShownTab', () => {
	const stored: InstanceAiThreadTabsState = {
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
		expect(withShownTab(null, { type: 'workflow', id: 'wf-9' })?.tabs).toEqual([
			{ type: 'workflow', id: 'wf-9', name: 'wf-9' },
		]);
	});

	it('closes the leftmost tabs over the limit, but not the new tab', () => {
		const tabs = Array.from({ length: MAX_INSTANCE_AI_THREAD_OPEN_TABS }, (_, i) => ({
			type: 'workflow' as const,
			id: `wf-${i}`,
			name: `Workflow ${i}`,
		}));
		const result = withShownTab(
			{ tabs, closedTabs: [], activeTab: { type: 'workflow', id: 'wf-0' } },
			{ type: 'agent', id: 'agent-1', name: 'Helper' },
		);

		expect(result?.tabs).toHaveLength(MAX_INSTANCE_AI_THREAD_OPEN_TABS);
		expect(result?.tabs.at(-1)).toEqual({ type: 'agent', id: 'agent-1', name: 'Helper' });
		expect(result?.closedTabs).toEqual([{ type: 'workflow', id: 'wf-0' }]);
		expect(result?.activeTab).toEqual({ type: 'agent', id: 'agent-1' });
	});
});
