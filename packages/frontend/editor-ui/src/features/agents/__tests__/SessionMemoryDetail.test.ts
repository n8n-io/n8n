import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import type { AgentThreadMemoryDto } from '@n8n/api-types';

import { MODAL_CANCEL, MODAL_CONFIRM } from '@/app/constants';
import SessionMemoryDetail from '../components/SessionMemoryDetail.vue';
import type { TimelineItem } from '../session-timeline.types';

const deleteAgentMemoryEntry = vi.fn();
const deleteAgentMemoryCapture = vi.fn();
vi.mock('../composables/useAgentApi', () => ({
	deleteAgentMemoryEntry: (...args: unknown[]) => deleteAgentMemoryEntry(...args),
	deleteAgentMemoryCapture: (...args: unknown[]) => deleteAgentMemoryCapture(...args),
}));

const showError = vi.fn();
const showMessage = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError, showMessage }) }));
vi.mock('@n8n/stores/useRootStore', () => ({ useRootStore: () => ({ restApiContext: {} }) }));
vi.mock('vue-router', () => ({
	useRouter: () => ({
		resolve: ({ params }: { params: { threadId: string } }) => ({
			href: `/sessions/${params.threadId}`,
		}),
	}),
}));

const openAgentConfirmationModal = vi.fn();
vi.mock('../composables/useAgentConfirmationModal', () => ({
	useAgentConfirmationModal: () => ({ openAgentConfirmationModal }),
}));

const canUpdate = ref(true);
vi.mock('../composables/useAgentPermissions', () => ({
	useAgentPermissions: () => ({ canUpdate }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) =>
			options?.interpolate ? `${key} ${Object.values(options.interpolate).join(',')}` : key,
	}),
}));

const memory: AgentThreadMemoryDto = {
	recalls: {
		recall: [
			{
				entryId: 'entry-1',
				content: 'Alerts go to Slack.',
				status: 'active',
				origin: {
					threadId: 'thread-old',
					canOpen: true,
					evidence: 'send it on Slack',
					createdAt: '2026-09-25T10:00:00.000Z',
				},
			},
		],
	},
	flags: {
		flag: {
			captureId: 'capture-1',
			content: 'Data is in Hex.',
			evidence: 'Hex',
			status: 'pending',
		},
	},
};

function mountDetail(item: Partial<TimelineItem>) {
	return mount(SessionMemoryDetail, {
		props: {
			item: { kind: 'memory', executionId: 'exec-1', timestamp: 0, ...item },
			memory,
			projectId: 'project-1',
			agentId: 'agent-1',
			threadId: 'thread-1',
		},
	});
}

describe('SessionMemoryDetail', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		canUpdate.value = true;
		openAgentConfirmationModal.mockResolvedValue(MODAL_CONFIRM);
	});

	it('shows a recalled memory with its quote and a link that opens the source session', () => {
		const wrapper = mountDetail({ memoryAction: 'recall', toolCallId: 'recall' });

		const card = wrapper.find('[data-test-id="session-memory-card"]');
		expect(card.text()).toContain('Alerts go to Slack.');
		expect(card.text()).toContain('“send it on Slack”');
		const link = card.find('[data-test-id="session-memory-origin-link"]');
		expect(link.attributes()).toMatchObject({ href: '/sessions/thread-old', target: '_blank' });
		expect(link.text()).toContain('agentSessions.timeline.memory.origin.previousSession');
		// Active is the normal state and gets no badge.
		expect(card.find('[data-test-id="session-memory-status"]').exists()).toBe(false);
	});

	it('shows a pending flag with its badge', () => {
		const wrapper = mountDetail({ memoryAction: 'flag', toolCallId: 'flag' });

		expect(wrapper.find('[data-test-id="session-memory-status"]').text()).toBe(
			'agentSessions.timeline.memory.status.pending',
		);
	});

	it('keeps a deleted memory in place without a delete action', () => {
		const wrapper = mount(SessionMemoryDetail, {
			props: {
				item: {
					kind: 'memory',
					executionId: 'exec-1',
					timestamp: 0,
					memoryAction: 'flag',
					toolCallId: 'flag',
				},
				memory: { recalls: {}, flags: { flag: { ...memory.flags.flag, status: 'deleted' } } },
				projectId: 'project-1',
				agentId: 'agent-1',
				threadId: 'thread-1',
			},
		});

		const card = wrapper.find('[data-test-id="session-memory-card"]');
		expect(card.text()).toContain('Data is in Hex.');
		expect(card.find('[data-test-id="session-memory-status"]').text()).toBe(
			'agentSessions.timeline.memory.status.deleted',
		);
		expect(card.find('[data-test-id="session-memory-delete"]').exists()).toBe(false);
	});

	it('says when a recall found nothing', () => {
		const wrapper = mount(SessionMemoryDetail, {
			props: {
				item: {
					kind: 'memory',
					executionId: 'exec-1',
					timestamp: 0,
					memoryAction: 'recall',
					toolCallId: 'recall',
				},
				memory: { recalls: { recall: [] }, flags: {} },
				projectId: 'project-1',
				agentId: 'agent-1',
				threadId: 'thread-1',
			},
		});

		expect(wrapper.find('[data-test-id="session-memory-empty"]').text()).toBe(
			'agentSessions.timeline.memory.empty',
		);
	});

	it('deletes a recalled entry after confirmation', async () => {
		const wrapper = mountDetail({ memoryAction: 'recall', toolCallId: 'recall' });

		await wrapper.find('[data-test-id="session-memory-delete"]').trigger('click');
		await flushPromises();

		expect(deleteAgentMemoryEntry).toHaveBeenCalledWith({}, 'project-1', 'agent-1', 'entry-1');
		expect(wrapper.emitted('deleted')).toHaveLength(1);
	});

	it('deletes a flagged capture after confirmation', async () => {
		const wrapper = mountDetail({ memoryAction: 'flag', toolCallId: 'flag' });

		await wrapper.find('[data-test-id="session-memory-delete"]').trigger('click');
		await flushPromises();

		expect(deleteAgentMemoryCapture).toHaveBeenCalledWith({}, 'project-1', 'agent-1', 'capture-1');
		expect(wrapper.emitted('deleted')).toHaveLength(1);
	});

	it('keeps the memory when the user cancels', async () => {
		openAgentConfirmationModal.mockResolvedValue(MODAL_CANCEL);
		const wrapper = mountDetail({ memoryAction: 'flag', toolCallId: 'flag' });

		await wrapper.find('[data-test-id="session-memory-delete"]').trigger('click');
		await flushPromises();

		expect(deleteAgentMemoryCapture).not.toHaveBeenCalled();
		expect(wrapper.emitted('deleted')).toBeUndefined();
	});

	it('shows an error when the delete fails', async () => {
		deleteAgentMemoryEntry.mockRejectedValue(new Error('boom'));
		const wrapper = mountDetail({ memoryAction: 'recall', toolCallId: 'recall' });

		await wrapper.find('[data-test-id="session-memory-delete"]').trigger('click');
		await flushPromises();

		expect(showError).toHaveBeenCalled();
		expect(wrapper.emitted('deleted')).toBeUndefined();
	});

	it('hides delete without update permission', () => {
		canUpdate.value = false;
		const wrapper = mountDetail({ memoryAction: 'recall', toolCallId: 'recall' });

		expect(wrapper.find('[data-test-id="session-memory-delete"]').exists()).toBe(false);
	});
});
