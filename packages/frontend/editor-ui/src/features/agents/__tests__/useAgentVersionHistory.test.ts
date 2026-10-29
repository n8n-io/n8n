/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AgentVersionMetadataModalData } from '../components/AgentVersionMetadataModal.vue';
import type { AgentVersionListItemDto } from '@n8n/api-types';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

const mocks = vi.hoisted(() => ({
	listAgentVersions: vi.fn(),
	publishAgent: vi.fn(),
	revertAgentToVersion: vi.fn(),
	openAgentConfirmationModal: vi.fn(),
	openVersionMetadata: vi.fn(),
	updateAgentVersion: vi.fn(),
	showMessage: vi.fn(),
	showError: vi.fn(),
	track: vi.fn(),
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: mocks.track }),
}));

vi.mock('../composables/useAgentApi', () => ({
	listAgentVersions: mocks.listAgentVersions,
	updateAgentVersion: mocks.updateAgentVersion,
	revertAgentToVersion: mocks.revertAgentToVersion,
}));

vi.mock('../composables/useAgentPublish', () => ({
	useAgentPublish: () => ({ publish: mocks.publishAgent }),
}));

vi.mock('../composables/useAgentVersionMetadataModal', () => ({
	useAgentVersionMetadataModal: () => ({ openVersionMetadata: mocks.openVersionMetadata }),
}));

vi.mock('../composables/useAgentConfirmationModal', () => ({
	useAgentConfirmationModal: () => ({
		openAgentConfirmationModal: mocks.openAgentConfirmationModal,
	}),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({
		showMessage: mocks.showMessage,
		showError: mocks.showError,
	}),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (k: string) => k }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		restApiContext: { baseUrl: '/rest', pushRef: 'ref' },
		pushRef: 'version-editor-session',
	}),
}));

vi.mock('@/app/constants', () => ({
	MODAL_CONFIRM: 'confirm',
}));

import { useAgentVersionHistory } from '../composables/useAgentVersionHistory';

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((res) => {
		resolve = res;
	});
	return { promise, resolve };
}

function makeVersion(versionId: string, overrides: Partial<AgentVersionListItemDto> = {}) {
	return {
		versionId,
		agentId: 'agent-1',
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		author: 'Ada Lovelace',
		isActive: false,
		...overrides,
	} satisfies AgentVersionListItemDto;
}

describe('useAgentVersionHistory', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('refresh', () => {
		it('fetches the first page and populates items', async () => {
			const rows = [makeVersion('v2', { isActive: true }), makeVersion('v1')];
			mocks.listAgentVersions.mockResolvedValue(rows);

			const history = useAgentVersionHistory();
			await history.refresh('project-1', 'agent-1');

			expect(mocks.listAgentVersions).toHaveBeenCalledWith(
				expect.anything(),
				'project-1',
				'agent-1',
				{ take: 20, skip: 0 },
			);
			expect(history.items.value).toEqual(rows);
			expect(history.isInitialLoad.value).toBe(false);
			expect(history.hasMore.value).toBe(false);
		});

		it('marks hasMore when the page is full', async () => {
			const rows = Array.from({ length: 20 }, (_, i) => makeVersion(`v${i}`));
			mocks.listAgentVersions.mockResolvedValue(rows);

			const history = useAgentVersionHistory();
			await history.refresh('project-1', 'agent-1');

			expect(history.hasMore.value).toBe(true);
		});

		it('shows an error toast and leaves items unchanged on failure', async () => {
			mocks.listAgentVersions.mockRejectedValue(new Error('boom'));

			const history = useAgentVersionHistory();
			await history.refresh('project-1', 'agent-1');

			expect(mocks.showError).toHaveBeenCalledWith(
				expect.any(Error),
				'agents.versionHistory.error.load',
			);
			expect(history.items.value).toEqual([]);
		});

		it('keeps the newest result when an older refresh resolves out of order', async () => {
			const stale = deferred<AgentVersionListItemDto[]>();
			const fresh = deferred<AgentVersionListItemDto[]>();
			mocks.listAgentVersions.mockReturnValueOnce(stale.promise).mockReturnValueOnce(fresh.promise);

			const staleRows = [makeVersion('old')];
			const freshRows = [makeVersion('new')];

			const history = useAgentVersionHistory();

			// Two overlapping loads, e.g. the panel's prop watcher firing on an
			// agent switch before the first request has returned.
			const first = history.refresh('project-1', 'agent-1');
			const second = history.refresh('project-1', 'agent-2');

			// Newer request settles first, then the older one resolves late.
			fresh.resolve(freshRows);
			await second;
			stale.resolve(staleRows);
			await first;

			expect(history.items.value).toEqual(freshRows);
			expect(history.isLoading.value).toBe(false);
		});
	});

	it('clears a previous Agent history when loading another Agent fails', async () => {
		mocks.listAgentVersions
			.mockResolvedValueOnce([makeVersion('v1')])
			.mockRejectedValueOnce(new Error('Failed'));
		const history = useAgentVersionHistory();
		await history.refresh('project', 'first');
		await history.refresh('project', 'second');
		expect(history.items.value).toEqual([]);
		expect(history.hasLoadError.value).toBe(true);
	});

	it('deduplicates shifted pages while advancing by the fetched row count', async () => {
		mocks.listAgentVersions
			.mockResolvedValueOnce(Array.from({ length: 20 }, (_, i) => makeVersion(`v${i}`)))
			.mockResolvedValueOnce(Array.from({ length: 20 }, (_, i) => makeVersion(`v${i + 19}`)))
			.mockResolvedValueOnce([]);
		const history = useAgentVersionHistory();
		await history.refresh('project', 'agent');
		await history.fetchMore('project', 'agent');
		expect(history.items.value).toHaveLength(39);
		await history.fetchMore('project', 'agent');
		expect(mocks.listAgentVersions).toHaveBeenLastCalledWith(
			expect.anything(),
			'project',
			'agent',
			{ take: 20, skip: 40 },
		);
	});

	describe('fetchMore', () => {
		it('appends the next page using items.length as skip', async () => {
			const firstPage = Array.from({ length: 20 }, (_, i) => makeVersion(`v${20 - i}`));
			const secondPage = [makeVersion('vA'), makeVersion('vB')];
			mocks.listAgentVersions.mockResolvedValueOnce(firstPage).mockResolvedValueOnce(secondPage);

			const history = useAgentVersionHistory();
			await history.refresh('project-1', 'agent-1');
			await history.fetchMore('project-1', 'agent-1');

			expect(mocks.listAgentVersions).toHaveBeenNthCalledWith(
				2,
				expect.anything(),
				'project-1',
				'agent-1',
				{ take: 20, skip: 20 },
			);
			expect(history.items.value).toEqual([...firstPage, ...secondPage]);
		});

		it('is a no-op when hasMore is false', async () => {
			mocks.listAgentVersions.mockResolvedValue([makeVersion('v1')]);

			const history = useAgentVersionHistory();
			await history.refresh('project-1', 'agent-1');
			expect(history.hasMore.value).toBe(false);

			await history.fetchMore('project-1', 'agent-1');

			expect(mocks.listAgentVersions).toHaveBeenCalledTimes(1);
		});
	});

	describe('retry', () => {
		it.each([0, 1, 20])(
			'retries a failed refresh with %i loaded rows from the first page',
			async (count) => {
				const rows = Array.from({ length: count }, (_, i) => makeVersion(`v${i}`));
				const updatedRows = [makeVersion('new')];
				mocks.listAgentVersions
					.mockResolvedValueOnce(rows)
					.mockRejectedValueOnce(new Error('Failed'))
					.mockResolvedValueOnce(updatedRows);
				const history = useAgentVersionHistory();
				await history.refresh('project', 'agent');
				await history.refresh('project', 'agent');
				expect(history.items.value).toEqual(rows);
				expect(history.hasLoadError.value).toBe(true);

				await history.fetchMore('project', 'agent');
				expect(mocks.listAgentVersions).toHaveBeenCalledTimes(2);
				const retry = history.retry('project', 'agent');
				await history.retry('project', 'agent');
				await retry;

				expect(mocks.listAgentVersions).toHaveBeenCalledTimes(3);
				expect(mocks.listAgentVersions).toHaveBeenLastCalledWith(
					expect.anything(),
					'project',
					'agent',
					{ take: 20, skip: 0 },
				);
				expect(history.items.value).toEqual(updatedRows);
				expect(history.hasLoadError.value).toBe(false);
			},
		);

		it('retries a failed next page at the same offset and keeps loaded rows', async () => {
			const rows = Array.from({ length: 20 }, (_, i) => makeVersion(`v${i}`));
			const nextPage = [makeVersion('older')];
			mocks.listAgentVersions
				.mockResolvedValueOnce(rows)
				.mockRejectedValueOnce(new Error('Failed'))
				.mockResolvedValueOnce(nextPage);
			const history = useAgentVersionHistory();
			await history.refresh('project', 'agent');
			await history.fetchMore('project', 'agent');
			expect(history.items.value).toEqual(rows);
			expect(history.hasLoadError.value).toBe(true);

			await history.retry('project', 'agent');

			expect(mocks.listAgentVersions).toHaveBeenLastCalledWith(
				expect.anything(),
				'project',
				'agent',
				{ take: 20, skip: 20 },
			);
			expect(history.items.value).toEqual([...rows, ...nextPage]);
			expect(history.hasLoadError.value).toBe(false);
		});
	});

	describe('revertToVersion', () => {
		it('opens the confirmation modal before calling the API', async () => {
			mocks.openAgentConfirmationModal.mockResolvedValue('cancel');
			mocks.listAgentVersions.mockResolvedValue([]);

			const history = useAgentVersionHistory();
			const result = await history.revertToVersion('project-1', 'agent-1', 'v1');

			expect(mocks.openAgentConfirmationModal).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'agents.versionHistory.revert.modal.title',
					description: 'agents.versionHistory.revert.modal.description',
				}),
			);
			expect(mocks.revertAgentToVersion).not.toHaveBeenCalled();
			expect(mocks.track).not.toHaveBeenCalled();
			expect(result).toBeNull();
		});

		it('calls the API, refreshes the list, and shows a toast on confirm', async () => {
			mocks.openAgentConfirmationModal.mockResolvedValue('confirm');
			const updatedAgent = { id: 'agent-1' };
			mocks.revertAgentToVersion.mockResolvedValue(updatedAgent);
			mocks.listAgentVersions.mockResolvedValue([makeVersion('v1')]);

			const history = useAgentVersionHistory();
			const result = await history.revertToVersion('project-1', 'agent-1', 'v1');

			expect(mocks.revertAgentToVersion).toHaveBeenCalledWith(
				expect.anything(),
				'project-1',
				'agent-1',
				'v1',
			);
			expect(mocks.showMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'agents.versionHistory.revert.toast.title',
					type: 'success',
				}),
			);
			expect(mocks.listAgentVersions).toHaveBeenCalledTimes(1);
			expect(result).toBe(updatedAgent);
			expect(mocks.track).toHaveBeenCalledExactlyOnceWith(
				TELEMETRY_EVENT.AGENTS.USER_REVERTED_CHANGES_ON_AGENT,
				{ agent_id: 'agent-1', push_ref: 'version-editor-session' },
			);
		});

		it('surfaces an error toast and returns null when the API fails', async () => {
			mocks.openAgentConfirmationModal.mockResolvedValue('confirm');
			mocks.revertAgentToVersion.mockRejectedValue(new Error('500'));

			const history = useAgentVersionHistory();
			const result = await history.revertToVersion('project-1', 'agent-1', 'v1');

			expect(mocks.showError).toHaveBeenCalledWith(
				expect.any(Error),
				'agents.versionHistory.revert.error',
			);
			expect(result).toBeNull();
			expect(mocks.track).not.toHaveBeenCalled();
		});
	});

	describe('publishVersion', () => {
		it('uses the shared publish dialog for the selected version and refreshes on success', async () => {
			const updated = { id: 'agent-1', activeVersionId: 'v1' };
			mocks.publishAgent.mockResolvedValue(updated);
			mocks.listAgentVersions.mockResolvedValue([makeVersion('v1')]);
			const history = useAgentVersionHistory();
			expect(await history.publishVersion('project-1', 'agent-1', 'v1')).toBe(updated);
			expect(mocks.publishAgent).toHaveBeenCalledWith(
				'project-1',
				'agent-1',
				'v1',
				expect.any(Function),
			);
			expect(history.items.value).toEqual([makeVersion('v1')]);
		});
		it('leaves the list unchanged when the publish dialog is cancelled', async () => {
			mocks.publishAgent.mockResolvedValue(null);
			const history = useAgentVersionHistory();
			expect(await history.publishVersion('project-1', 'agent-1', 'v1')).toBeNull();
			expect(mocks.listAgentVersions).not.toHaveBeenCalled();
		});
	});

	it('edits the selected version metadata without creating a publication', async () => {
		const version = makeVersion('v1', { name: 'Release', description: 'Notes' });
		mocks.listAgentVersions.mockResolvedValue([version]);
		mocks.openVersionMetadata.mockImplementationOnce(
			async (options: AgentVersionMetadataModalData) => {
				expect(options).toMatchObject({ mode: 'edit', name: 'Release', description: 'Notes' });
				return await options.onSubmit({ name: null, description: null });
			},
		);
		const history = useAgentVersionHistory();
		await history.refresh('project-1', 'agent-1');
		await history.editVersion('project-1', 'agent-1', 'v1');
		expect(mocks.updateAgentVersion).toHaveBeenCalledWith(
			expect.anything(),
			'project-1',
			'agent-1',
			'v1',
			{ name: null, description: null },
		);
		expect(mocks.publishAgent).not.toHaveBeenCalled();
	});
	it('does not replace another agent history after a pending publish completes', async () => {
		const publication = deferred<null | { id: string }>();
		mocks.publishAgent.mockReturnValue(publication.promise);
		mocks.listAgentVersions.mockResolvedValue([
			makeVersion('other-version', { agentId: 'agent-2' }),
		]);
		const history = useAgentVersionHistory();
		const pending = history.publishVersion('project-1', 'agent-1', 'v1');
		await history.refresh('project-1', 'agent-2');
		publication.resolve({ id: 'agent-1' });
		await pending;
		expect(mocks.listAgentVersions).toHaveBeenCalledTimes(1);
		expect(history.items.value[0].agentId).toBe('agent-2');
	});
});
