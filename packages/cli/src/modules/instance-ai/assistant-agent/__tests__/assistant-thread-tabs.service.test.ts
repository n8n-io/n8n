import type { AssistantThreadTabsState } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { SystemAgentThreadMetadataService } from '@/modules/agents/system-agents/system-agent-thread-metadata.service';

import type { AssistantTurnMemory } from '../../turn-setup/assistant-turn-runtime';
import type { AssistantArtifactNamesService } from '../assistant-artifact-names.service';
import { ASSISTANT_TABS_METADATA_KEY } from '../assistant-thread-tabs';
import { AssistantThreadTabsService } from '../assistant-thread-tabs.service';
import { ASSISTANT_AGENT_ID } from '../assistant-turn-options';

const THREAD_ID = 'thread-1';

type Metadata = Record<string, unknown> | undefined;

describe('AssistantThreadTabsService', () => {
	const logger = mock<Logger>();
	const threadMetadata = mock<SystemAgentThreadMetadataService>();
	const artifactNames = mock<AssistantArtifactNamesService>();
	const service = new AssistantThreadTabsService(logger, threadMetadata, artifactNames);
	const user = mock<User>({ id: 'user-1' });

	const state: AssistantThreadTabsState = {
		tabs: [{ type: 'agent', id: 'agent-1', name: 'SEO Auditor' }],
		closedTabs: [],
		activeTab: { type: 'agent', id: 'agent-1' },
		previewOpen: true,
	};

	/** The thread row of the turn. `patchThread` applies the update the way the real memory does. */
	let row: { metadata?: Metadata };
	let memory: { patchThread: ReturnType<typeof vi.fn> };
	function useMemory(metadata?: Metadata) {
		row = { metadata };
		memory = {
			patchThread: vi.fn(
				async (args: {
					threadId: string;
					update: (current: { metadata?: Metadata }) => { metadata?: Metadata } | null;
				}) => {
					const patch = args.update({ metadata: row.metadata });
					if (patch?.metadata !== undefined) row.metadata = patch.metadata;
					return { id: THREAD_ID, metadata: row.metadata };
				},
			),
		};
		return { row, memory };
	}
	const turnMemory = () => memory as unknown as AssistantTurnMemory;

	beforeEach(() => {
		vi.clearAllMocks();
		artifactNames.withCurrentName.mockImplementation(async (artifact) => artifact);
	});

	describe('getState', () => {
		it('reads the tabs key of the Assistant agent thread for the user', async () => {
			threadMetadata.read.mockResolvedValue(state);

			await expect(service.getState(user, THREAD_ID)).resolves.toEqual(state);
			expect(threadMetadata.read).toHaveBeenCalledWith(
				ASSISTANT_AGENT_ID,
				user,
				THREAD_ID,
				ASSISTANT_TABS_METADATA_KEY,
			);
		});

		it('returns null when no tabs are stored', async () => {
			threadMetadata.read.mockResolvedValue(undefined);

			await expect(service.getState(user, THREAD_ID)).resolves.toBeNull();
		});

		it('returns null and logs a warning when the stored tabs have an invalid shape', async () => {
			threadMetadata.read.mockResolvedValue({ tabs: 'x' });

			await expect(service.getState(user, THREAD_ID)).resolves.toBeNull();
			expect(logger.warn).toHaveBeenCalledWith(expect.any(String), { threadId: THREAD_ID });
		});
	});

	describe('saveState', () => {
		it('writes the tabs key of the Assistant agent thread for the user', async () => {
			await service.saveState(user, THREAD_ID, state);

			expect(threadMetadata.update).toHaveBeenCalledWith(
				ASSISTANT_AGENT_ID,
				user,
				THREAD_ID,
				ASSISTANT_TABS_METADATA_KEY,
				expect.any(Function),
			);
			const change = threadMetadata.update.mock.calls[0][4];
			expect(change(undefined)).toBe(state);
		});
	});

	describe('showArtifactTab', () => {
		it('adds the artifact tab to the stored tabs and keeps the other metadata keys', async () => {
			const { row } = useMemory({ assistantOpened: true, [ASSISTANT_TABS_METADATA_KEY]: state });

			await service.showArtifactTab(turnMemory(), THREAD_ID, {
				type: 'workflow',
				id: 'wf-1',
				name: 'Sync',
			});

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

			const empty = useMemory();
			await service.showArtifactTab(turnMemory(), THREAD_ID, {
				type: 'workflow',
				id: 'wf-1',
				name: 'Sync',
			});
			expect(empty.row.metadata).toEqual({ [ASSISTANT_TABS_METADATA_KEY]: created });

			const invalid = useMemory({ [ASSISTANT_TABS_METADATA_KEY]: { tabs: 'x' } });
			await service.showArtifactTab(turnMemory(), THREAD_ID, {
				type: 'workflow',
				id: 'wf-1',
				name: 'Sync',
			});
			expect(invalid.row.metadata).toEqual({ [ASSISTANT_TABS_METADATA_KEY]: created });
		});

		it('writes nothing when the tab is already shown with the same details', async () => {
			const metadata = { [ASSISTANT_TABS_METADATA_KEY]: state };
			const { memory, row } = useMemory(metadata);

			await service.showArtifactTab(turnMemory(), THREAD_ID, { type: 'agent', id: 'agent-1' });

			expect(memory.patchThread).toHaveBeenCalled();
			// A write would replace the metadata object, even with equal content.
			expect(row.metadata).toBe(metadata);
		});
	});

	it('uses the current name of the artifact', async () => {
		useMemory();
		artifactNames.withCurrentName.mockResolvedValue({
			type: 'workflow',
			id: 'wf-1',
			name: 'Renamed',
		});

		await service.showArtifactTab(turnMemory(), THREAD_ID, {
			type: 'workflow',
			id: 'wf-1',
			name: 'Sync',
		});

		expect(row.metadata).toMatchObject({
			[ASSISTANT_TABS_METADATA_KEY]: { tabs: [{ type: 'workflow', id: 'wf-1', name: 'Renamed' }] },
		});
	});
});
