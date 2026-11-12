import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentResource } from '../types';
import { useAgentArchive } from '../composables/useAgentArchive';

const mocks = vi.hoisted(() => ({
	archiveAgent: vi.fn(),
	openAgentConfirmationModal: vi.fn(),
	removeProjectAgentFromListCache: vi.fn(),
	unarchiveAgent: vi.fn(),
	upsertProjectAgentsListCache: vi.fn(),
	showError: vi.fn(),
}));

vi.mock('../composables/useAgentApi', () => ({
	archiveAgent: mocks.archiveAgent,
	unarchiveAgent: mocks.unarchiveAgent,
}));

vi.mock('../composables/useAgentConfirmationModal', () => ({
	useAgentConfirmationModal: () => ({
		openAgentConfirmationModal: mocks.openAgentConfirmationModal,
	}),
}));

vi.mock('../composables/useProjectAgentsList', () => ({
	removeProjectAgentFromListCache: mocks.removeProjectAgentFromListCache,
	upsertProjectAgentsListCache: mocks.upsertProjectAgentsListCache,
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage: vi.fn(), showError: mocks.showError }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const agent = (activeVersionId: string | null) =>
	({ id: 'agent-1', name: 'My Agent', projectId: 'project-1', activeVersionId }) as AgentResource;

describe('useAgentArchive', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.archiveAgent.mockResolvedValue({ id: 'agent-1', isArchived: true });
	});

	it('archives an unpublished agent without a confirmation', async () => {
		const updated = await useAgentArchive().archive(agent(null));

		expect(mocks.openAgentConfirmationModal).not.toHaveBeenCalled();
		expect(mocks.archiveAgent).toHaveBeenCalledWith({}, 'project-1', 'agent-1');
		expect(mocks.removeProjectAgentFromListCache).toHaveBeenCalledWith('project-1', 'agent-1');
		expect(updated).toEqual({ id: 'agent-1', isArchived: true });
	});

	it('does not archive a published agent when the user cancels the confirmation', async () => {
		mocks.openAgentConfirmationModal.mockResolvedValue('cancel');

		const updated = await useAgentArchive().archive(agent('v1'));

		expect(updated).toBeNull();
		expect(mocks.archiveAgent).not.toHaveBeenCalled();
	});

	it('archives a published agent when the user accepts the confirmation', async () => {
		mocks.openAgentConfirmationModal.mockResolvedValue('confirm');
		mocks.archiveAgent.mockResolvedValue({ id: 'agent-2', isArchived: true });

		const updated = await useAgentArchive().archive({ ...agent('v1'), id: 'agent-2' });

		expect(mocks.archiveAgent).toHaveBeenCalledWith({}, 'project-1', 'agent-2');
		expect(updated).toEqual({ id: 'agent-2', isArchived: true });
	});

	it('unarchives an agent and adds it to the project list cache', async () => {
		const unarchived = { id: 'agent-3', isArchived: false };
		mocks.unarchiveAgent.mockResolvedValue(unarchived);

		const updated = await useAgentArchive().unarchive({ ...agent(null), id: 'agent-3' });

		expect(mocks.unarchiveAgent).toHaveBeenCalledWith({}, 'project-1', 'agent-3');
		expect(mocks.upsertProjectAgentsListCache).toHaveBeenCalledWith('project-1', unarchived);
		expect(updated).toEqual(unarchived);
	});

	it('returns null and shows an error toast when the archive request fails', async () => {
		const error = new Error('Request failed');
		mocks.archiveAgent.mockRejectedValue(error);

		const updated = await useAgentArchive().archive({ ...agent(null), id: 'agent-4' });

		expect(updated).toBeNull();
		expect(mocks.showError).toHaveBeenCalledWith(error, 'agents.archive.error.archive');
		expect(mocks.removeProjectAgentFromListCache).not.toHaveBeenCalled();
	});

	it('sends one request when a second archive call starts while the first is pending', async () => {
		let resolveFirst: (value: unknown) => void = () => {};
		mocks.archiveAgent.mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)));

		const first = useAgentArchive().archive(agent(null));
		const second = await useAgentArchive().archive(agent(null));
		resolveFirst({ id: 'agent-1', isArchived: true });

		expect(second).toBeNull();
		expect(await first).toEqual({ id: 'agent-1', isArchived: true });
		expect(mocks.archiveAgent).toHaveBeenCalledTimes(1);

		// The guard clears after the request, so a later call sends a request again.
		await useAgentArchive().archive(agent(null));
		expect(mocks.archiveAgent).toHaveBeenCalledTimes(2);
	});
});
