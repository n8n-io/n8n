import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentResource } from '../types';
import { useAgentArchive } from '../composables/useAgentArchive';

const mocks = vi.hoisted(() => ({
	archiveAgent: vi.fn(),
	openAgentConfirmationModal: vi.fn(),
	removeProjectAgentFromListCache: vi.fn(),
}));

vi.mock('../composables/useAgentApi', () => ({
	archiveAgent: mocks.archiveAgent,
	unarchiveAgent: vi.fn(),
}));

vi.mock('../composables/useAgentConfirmationModal', () => ({
	useAgentConfirmationModal: () => ({
		openAgentConfirmationModal: mocks.openAgentConfirmationModal,
	}),
}));

vi.mock('../composables/useProjectAgentsList', () => ({
	removeProjectAgentFromListCache: mocks.removeProjectAgentFromListCache,
	upsertProjectAgentsListCache: vi.fn(),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage: vi.fn(), showError: vi.fn() }),
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
});
