import { MAX_ASSISTANT_THREAD_OPEN_TABS, type AssistantThreadTabsState } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { N8nMemory } from '@/modules/agents/integrations/n8n-memory';
import type { DataTableRepository } from '@/modules/data-table/data-table.repository';

import {
	ASSISTANT_TABS_METADATA_KEY,
	AssistantThreadTabsService,
	withShownTab,
} from '../assistant-thread-tabs.service';
import { ASSISTANT_AGENT_ID } from '../assistant-turn-options';

const THREAD_ID = 'thread-1';

type Metadata = Record<string, unknown> | undefined;

/** A thread row in memory. `patchThread` applies the update the way the real memory does. */
function createMemory(initial: { exists: boolean; metadata?: Metadata }) {
	const row = { ...initial };
	const memory = {
		getThread: vi.fn(async () => (row.exists ? { id: THREAD_ID, metadata: row.metadata } : null)),
		patchThread: vi.fn(
			async (args: {
				threadId: string;
				update: (current: { metadata?: Metadata }) => { metadata?: Metadata } | null | undefined;
			}) => {
				if (!row.exists) return null;
				const patch = args.update({ metadata: row.metadata });
				if (patch?.metadata !== undefined) row.metadata = patch.metadata;
				return { id: THREAD_ID, metadata: row.metadata };
			},
		),
	};
	return { row, memory };
}

describe('AssistantThreadTabsService', () => {
	const logger = mock<Logger>();
	const n8nMemory = mock<N8nMemory>();
	const workflowRepository = mock<WorkflowRepository>();
	const dataTableRepository = mock<DataTableRepository>();
	const service = new AssistantThreadTabsService(
		logger,
		n8nMemory,
		workflowRepository,
		dataTableRepository,
	);

	const state: AssistantThreadTabsState = {
		tabs: [{ type: 'agent', id: 'agent-1', name: 'SEO Auditor' }],
		closedTabs: [],
		activeTab: { type: 'agent', id: 'agent-1' },
		previewOpen: true,
	};

	function useMemory(initial: { exists: boolean; metadata?: Metadata }) {
		const created = createMemory(initial);
		n8nMemory.getImplementation.mockReturnValue(
			created.memory as unknown as ReturnType<N8nMemory['getImplementation']>,
		);
		return created;
	}

	beforeEach(() => {
		vi.clearAllMocks();
		workflowRepository.findByIds.mockResolvedValue([]);
		dataTableRepository.findSummariesByIds.mockResolvedValue([]);
	});

	describe('getState', () => {
		it('returns the stored tabs from the metadata of the Assistant memory thread', async () => {
			useMemory({ exists: true, metadata: { [ASSISTANT_TABS_METADATA_KEY]: state } });

			await expect(service.getState(THREAD_ID)).resolves.toEqual(state);
			expect(n8nMemory.getImplementation).toHaveBeenCalledWith(ASSISTANT_AGENT_ID);
		});

		it('returns null when the thread or the key does not exist', async () => {
			useMemory({ exists: false });
			await expect(service.getState(THREAD_ID)).resolves.toBeNull();

			useMemory({ exists: true, metadata: { assistantOpened: true } });
			await expect(service.getState(THREAD_ID)).resolves.toBeNull();
		});

		it('returns null and logs a warning when the stored tabs have an invalid shape', async () => {
			useMemory({ exists: true, metadata: { [ASSISTANT_TABS_METADATA_KEY]: { tabs: 'x' } } });

			await expect(service.getState(THREAD_ID)).resolves.toBeNull();
			expect(logger.warn).toHaveBeenCalledWith(expect.any(String), { threadId: THREAD_ID });
		});
	});

	describe('saveState', () => {
		it('stores the tabs and keeps the other metadata keys', async () => {
			const { row } = useMemory({
				exists: true,
				metadata: { assistantOpened: true, assistantTemporaryWorkflowIds: ['wf-1'] },
			});

			await service.saveState(THREAD_ID, state);

			expect(row.metadata).toEqual({
				assistantOpened: true,
				assistantTemporaryWorkflowIds: ['wf-1'],
				[ASSISTANT_TABS_METADATA_KEY]: state,
			});
		});

		it('does nothing when the thread has no memory row yet', async () => {
			const { row } = useMemory({ exists: false });

			await expect(service.saveState(THREAD_ID, state)).resolves.toBeUndefined();
			expect(row.metadata).toBeUndefined();
		});
	});

	describe('showArtifactTab', () => {
		it('adds the artifact tab to the stored tabs and keeps the other metadata keys', async () => {
			const { row } = useMemory({
				exists: true,
				metadata: { assistantOpened: true, [ASSISTANT_TABS_METADATA_KEY]: state },
			});

			await service.showArtifactTab(THREAD_ID, { type: 'workflow', id: 'wf-1', name: 'Sync' });

			expect(row.metadata).toEqual({
				assistantOpened: true,
				[ASSISTANT_TABS_METADATA_KEY]: {
					tabs: [...state.tabs, { type: 'workflow', id: 'wf-1', name: 'Sync' }],
					closedTabs: [],
					activeTab: { type: 'workflow', id: 'wf-1' },
					previewOpen: true,
				},
			});
		});

		it('creates the stored tabs when none or only invalid tabs are stored', async () => {
			const created = {
				tabs: [{ type: 'workflow', id: 'wf-1', name: 'Sync' }],
				closedTabs: [],
				activeTab: { type: 'workflow', id: 'wf-1' },
				previewOpen: true,
			};

			const empty = useMemory({ exists: true });
			await service.showArtifactTab(THREAD_ID, { type: 'workflow', id: 'wf-1', name: 'Sync' });
			expect(empty.row.metadata).toEqual({ [ASSISTANT_TABS_METADATA_KEY]: created });

			const invalid = useMemory({
				exists: true,
				metadata: { [ASSISTANT_TABS_METADATA_KEY]: { tabs: 'x' } },
			});
			await service.showArtifactTab(THREAD_ID, { type: 'workflow', id: 'wf-1', name: 'Sync' });
			expect(invalid.row.metadata).toEqual({ [ASSISTANT_TABS_METADATA_KEY]: created });
		});

		it('writes nothing when the tab is already shown with the same details', async () => {
			const metadata = { [ASSISTANT_TABS_METADATA_KEY]: state };
			const { memory, row } = useMemory({ exists: true, metadata });

			await service.showArtifactTab(THREAD_ID, { type: 'agent', id: 'agent-1' });

			expect(memory.patchThread).toHaveBeenCalled();
			// A write would replace the metadata object, even with equal content.
			expect(row.metadata).toBe(metadata);
		});
	});

	describe('withCurrentName', () => {
		it('uses the current name of a workflow', async () => {
			workflowRepository.findByIds.mockResolvedValue([mock<WorkflowEntity>({ name: 'Renamed' })]);

			await expect(
				service.withCurrentName({ type: 'workflow', id: 'wf-1', name: 'Sync' }),
			).resolves.toEqual({ type: 'workflow', id: 'wf-1', name: 'Renamed' });
		});

		it('uses the current name and project of a data table', async () => {
			dataTableRepository.findSummariesByIds.mockResolvedValue([
				{ id: 'dt-1', name: 'Leads', projectId: 'project-1' },
			]);

			await expect(service.withCurrentName({ type: 'data-table', id: 'dt-1' })).resolves.toEqual({
				type: 'data-table',
				id: 'dt-1',
				name: 'Leads',
				projectId: 'project-1',
			});
		});

		it('keeps the artifact when the resource is not found', async () => {
			const artifact = { type: 'workflow' as const, id: 'wf-1', name: 'Sync' };

			await expect(service.withCurrentName(artifact)).resolves.toEqual(artifact);
		});
	});
});

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
