import { beforeEach, describe, expect, it, vi } from 'vitest';

import { flushPromises } from '@vue/test-utils';
import type { AgentVersionMetadataModalData } from '../components/AgentVersionMetadataModal.vue';
import { useAgentPublish } from '../composables/useAgentPublish';
import {
	AGENT_PUBLISHED_MODAL_KEY,
	LOCAL_STORAGE_HIDE_AGENT_PUBLISHED_CONFIRMATION,
} from '../constants';
import type { AgentResource } from '../types';

const {
	publishAgentMock,
	getAgentMock,
	getAgentVersionMock,
	openVersionMetadataMock,
	showMessageMock,
	showErrorMock,
	openModalWithDataMock,
	closeModalMock,
	openAgentConfirmationModalMock,
	n8nChatFlag,
} = vi.hoisted(() => ({
	publishAgentMock: vi.fn(),
	getAgentMock: vi.fn(),
	getAgentVersionMock: vi.fn(),
	openVersionMetadataMock: vi.fn(),
	showMessageMock: vi.fn(),
	showErrorMock: vi.fn(),
	openModalWithDataMock: vi.fn(),
	closeModalMock: vi.fn(),
	openAgentConfirmationModalMock: vi.fn(),
	n8nChatFlag: { value: false },
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
	getAgent: getAgentMock,
	getAgentVersion: getAgentVersionMock,
	unpublishAgent: vi.fn(),
	revertAgentToPublished: vi.fn(),
}));

vi.mock('../composables/useAgentVersionMetadataModal', () => ({
	useAgentVersionMetadataModal: () => ({ openVersionMetadata: openVersionMetadataMock }),
}));

vi.mock('../composables/useAgentsN8nChatFlag', () => ({
	useAgentsN8nChatFlag: () => n8nChatFlag,
}));

vi.mock('../composables/useProjectAgentsList', () => ({
	upsertProjectAgentsListCache: vi.fn(),
}));

const agentResource = {
	id: 'a1',
	projectId: 'p1',
	versionId: 'v2',
	activeVersionId: 'v2',
} as unknown as AgentResource;

describe('useAgentPublish', () => {
	beforeEach(() => {
		localStorage.removeItem(LOCAL_STORAGE_HIDE_AGENT_PUBLISHED_CONFIRMATION);
		publishAgentMock.mockReset();
		getAgentMock.mockReset().mockResolvedValue({ versionId: 'v2' });
		getAgentVersionMock
			.mockReset()
			.mockResolvedValue({ versionId: 'v2', name: 'Release', description: 'Changes' });
		openVersionMetadataMock
			.mockReset()
			.mockImplementation(
				async (options: AgentVersionMetadataModalData) =>
					await options.onSubmit({ name: 'Release', description: 'Changes' }),
			);
		showMessageMock.mockClear();
		showErrorMock.mockClear();
		openModalWithDataMock.mockClear();
		n8nChatFlag.value = false;
	});

	it('shows the published confirmation modal after a successful publish', async () => {
		publishAgentMock.mockResolvedValueOnce(agentResource);
		const { publish } = useAgentPublish();

		const updated = await publish('p1', 'a1');

		expect(updated).toBe(agentResource);
		expect(showMessageMock).toHaveBeenCalled();
		expect(openModalWithDataMock).toHaveBeenCalledWith({
			name: AGENT_PUBLISHED_MODAL_KEY,
			data: { agentId: 'a1', projectId: 'p1', n8nChatLive: false },
		});
	});

	it.each([
		{ flag: true, integrations: [{ type: 'n8n_chat' }], live: true },
		{ flag: false, integrations: [{ type: 'n8n_chat' }], live: false },
		{ flag: true, integrations: [{ type: 'slack', credentialId: 'c1' }], live: false },
	])(
		'reports n8nChatLive $live when the flag is $flag and the published channels are $integrations',
		async ({ flag, integrations, live }) => {
			n8nChatFlag.value = flag;
			publishAgentMock.mockResolvedValueOnce({
				...agentResource,
				activeVersion: { versionId: 'v2', schema: { integrations }, skills: null, author: '' },
			});
			const { publish } = useAgentPublish();

			await publish('p1', 'a1');

			expect(openModalWithDataMock).toHaveBeenCalledWith({
				name: AGENT_PUBLISHED_MODAL_KEY,
				data: { agentId: 'a1', projectId: 'p1', n8nChatLive: live },
			});
		},
	);

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
	it('selects the list agent version once before the dialog opens', async () => {
		const current = { versionId: 'v2' };
		getAgentMock.mockResolvedValue(current);
		openVersionMetadataMock.mockImplementationOnce(
			async (options: AgentVersionMetadataModalData) => {
				current.versionId = 'v3';
				return await options.onSubmit({ name: 'Release', description: 'Line one\nLine two' });
			},
		);
		publishAgentMock.mockResolvedValue({
			...agentResource,
			versionId: 'v3',
			activeVersionId: 'v2',
		});
		const result = await useAgentPublish().publish('p1', 'a1');
		expect(publishAgentMock).toHaveBeenCalledWith({}, 'p1', 'a1', 'v2', {
			name: 'Release',
			description: 'Line one\nLine two',
		});
		expect(result?.versionId).toBe('v3');
	});

	it('publishes the selected history version without reading the current draft', async () => {
		publishAgentMock.mockResolvedValue(agentResource);
		await useAgentPublish().publish('p1', 'a1', 'older-version');
		expect(getAgentMock).not.toHaveBeenCalled();
		expect(getAgentVersionMock).toHaveBeenCalledWith({}, 'p1', 'a1', 'older-version');
		expect(publishAgentMock).toHaveBeenCalledWith(
			{},
			'p1',
			'a1',
			'older-version',
			expect.anything(),
		);
	});

	it('cancels without changing metadata or publication state', async () => {
		openVersionMetadataMock.mockResolvedValueOnce(false);
		const flow = useAgentPublish();
		expect(await flow.publish('p1', 'a1', 'v2')).toBeNull();
		expect(publishAgentMock).not.toHaveBeenCalled();
		expect(flow.publishing.value).toBe(false);
	});

	it('keeps the selected version and accepts a retry after publication fails', async () => {
		publishAgentMock
			.mockRejectedValueOnce(new Error('temporarily unavailable'))
			.mockResolvedValueOnce(agentResource);
		openVersionMetadataMock.mockImplementationOnce(
			async (options: AgentVersionMetadataModalData) => {
				expect(await options.onSubmit({ name: 'Release', description: null })).toBe(false);
				expect(await options.onSubmit({ name: 'Release', description: null })).toBe(true);
				return true;
			},
		);
		const flow = useAgentPublish();
		const pending = flow.publish('p1', 'a1', 'v2');
		expect(await flow.publish('p1', 'a1', 'v3')).toBeNull();
		await flushPromises();
		expect(await pending).toBe(agentResource);
		expect(publishAgentMock).toHaveBeenCalledTimes(2);
		expect(publishAgentMock.mock.calls.every((call) => call[3] === 'v2')).toBe(true);
	});
});

it('does not open a publish dialog after the target agent changes during loading', async () => {
	const version = Promise.withResolvers<{ versionId: string }>();
	getAgentVersionMock.mockReturnValueOnce(version.promise);
	openVersionMetadataMock.mockClear();
	let isCurrent = true;
	const pending = useAgentPublish().publish('p1', 'a1', 'v1', () => isCurrent);
	isCurrent = false;
	version.resolve({ versionId: 'v1' });
	expect(await pending).toBeNull();
	expect(openVersionMetadataMock).not.toHaveBeenCalled();
});
