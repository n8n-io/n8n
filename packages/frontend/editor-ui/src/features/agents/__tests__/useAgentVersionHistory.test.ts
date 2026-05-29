/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AgentVersionListItemDto } from '@n8n/api-types';

const mocks = vi.hoisted(() => ({
	listAgentVersions: vi.fn(),
	publishAgent: vi.fn(),
	revertAgentToVersion: vi.fn(),
	openAgentConfirmationModal: vi.fn(),
	showMessage: vi.fn(),
	showError: vi.fn(),
}));

vi.mock('../composables/useAgentApi', () => ({
	listAgentVersions: mocks.listAgentVersions,
	publishAgent: mocks.publishAgent,
	revertAgentToVersion: mocks.revertAgentToVersion,
}));

vi.mock('../composables/useAgentConfirmationModal', () => ({
	useAgentConfirmationModal: () => ({
		openAgentConfirmationModal: mocks.openAgentConfirmationModal,
	}),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({
		showMessage: mocks.showMessage,
		showError: mocks.showError,
	}),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (k: string) => k }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '/rest', pushRef: 'ref' } }),
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
		});
	});

	describe('publishVersion', () => {
		it('calls publishAgent with versionId, refreshes the list, and shows a toast', async () => {
			const updatedAgent = { id: 'agent-1', activeVersionId: 'v1' };
			mocks.publishAgent.mockResolvedValue(updatedAgent);
			mocks.listAgentVersions.mockResolvedValue([makeVersion('v1', { isActive: true })]);

			const history = useAgentVersionHistory();
			const result = await history.publishVersion('project-1', 'agent-1', 'v1');

			expect(mocks.publishAgent).toHaveBeenCalledWith(
				expect.anything(),
				'project-1',
				'agent-1',
				'v1',
			);
			expect(mocks.openAgentConfirmationModal).not.toHaveBeenCalled();
			expect(mocks.showMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'agents.versionHistory.publish.toast.title',
					type: 'success',
				}),
			);
			expect(result).toBe(updatedAgent);
		});

		it('surfaces an error toast and returns null when the API fails', async () => {
			mocks.publishAgent.mockRejectedValue(new Error('500'));

			const history = useAgentVersionHistory();
			const result = await history.publishVersion('project-1', 'agent-1', 'v1');

			expect(mocks.showError).toHaveBeenCalledWith(
				expect.any(Error),
				'agents.versionHistory.publish.error',
			);
			expect(result).toBeNull();
		});
	});
});
