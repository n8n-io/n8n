import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAgentPublish } from '../composables/useAgentPublish';
import {
	AGENT_PUBLISHED_MODAL_KEY,
	LOCAL_STORAGE_HIDE_AGENT_PUBLISHED_CONFIRMATION,
} from '../constants';
import type { AgentResource } from '../types';

const {
	publishAgentMock,
	showMessageMock,
	showErrorMock,
	openModalWithDataMock,
	closeModalMock,
	openAgentConfirmationModalMock,
} = vi.hoisted(() => ({
	publishAgentMock: vi.fn(),
	showMessageMock: vi.fn(),
	showErrorMock: vi.fn(),
	openModalWithDataMock: vi.fn(),
	closeModalMock: vi.fn(),
	openAgentConfirmationModalMock: vi.fn(),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage: showMessageMock, showError: showErrorMock }),
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({
		openModalWithData: openModalWithDataMock,
		closeModal: closeModalMock,
		modalsById: {},
	}),
}));

vi.mock('../composables/useAgentConfirmationModal', () => ({
	useAgentConfirmationModal: () => ({ openAgentConfirmationModal: openAgentConfirmationModalMock }),
}));

vi.mock('../composables/useAgentApi', () => ({
	publishAgent: publishAgentMock,
	unpublishAgent: vi.fn(),
	revertAgentToPublished: vi.fn(),
}));

vi.mock('../composables/useProjectAgentsList', () => ({
	upsertProjectAgentsListCache: vi.fn(),
}));

const agentResource = {
	id: 'a1',
	versionId: 'v2',
	activeVersionId: 'v2',
} as unknown as AgentResource;

describe('useAgentPublish', () => {
	beforeEach(() => {
		localStorage.removeItem(LOCAL_STORAGE_HIDE_AGENT_PUBLISHED_CONFIRMATION);
		publishAgentMock.mockReset();
		showMessageMock.mockClear();
		showErrorMock.mockClear();
		openModalWithDataMock.mockClear();
	});

	it('shows the published confirmation modal after a successful publish', async () => {
		publishAgentMock.mockResolvedValueOnce(agentResource);
		const { publish } = useAgentPublish();

		const updated = await publish('p1', 'a1');

		expect(updated).toBe(agentResource);
		expect(showMessageMock).toHaveBeenCalled();
		expect(openModalWithDataMock).toHaveBeenCalledWith({
			name: AGENT_PUBLISHED_MODAL_KEY,
			data: { agentId: 'a1' },
		});
	});

	it('keeps the toast but skips the modal when the user chose not to show it again', async () => {
		localStorage.setItem(LOCAL_STORAGE_HIDE_AGENT_PUBLISHED_CONFIRMATION, 'true');
		publishAgentMock.mockResolvedValueOnce(agentResource);
		const { publish } = useAgentPublish();

		const updated = await publish('p1', 'a1');

		expect(updated).toBe(agentResource);
		expect(showMessageMock).toHaveBeenCalled();
		expect(openModalWithDataMock).not.toHaveBeenCalled();
	});

	it('opens no modal when the publish fails', async () => {
		publishAgentMock.mockRejectedValueOnce(new Error('workflow not published'));
		const { publish } = useAgentPublish();

		const updated = await publish('p1', 'a1');

		expect(updated).toBeNull();
		expect(showErrorMock).toHaveBeenCalled();
		expect(openModalWithDataMock).not.toHaveBeenCalled();
	});
});
