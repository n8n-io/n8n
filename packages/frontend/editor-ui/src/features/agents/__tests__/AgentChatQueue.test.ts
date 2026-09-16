import { mount, flushPromises } from '@vue/test-utils';
import type { AgentChatQueueItem } from '@n8n/api-types';
import AgentChatQueue from '../components/AgentChatQueue.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { adjustToNumber?: number }) =>
			key === 'agents.chat.queue.count' ? `${options?.adjustToNumber} queued messages` : key,
	}),
}));

const message: Extract<AgentChatQueueItem, { kind: 'message' }> = {
	id: '1',
	status: 'queued',
	kind: 'message',
	message: 'Original',
	attachments: [{ id: 'file-1', fileName: 'notes.txt', mimeType: 'text/plain', sizeBytes: 4 }],
};

function render(messages = [message]) {
	const saveMessage = vi.fn().mockResolvedValue(undefined);
	const removeMessage = vi.fn().mockResolvedValue(undefined);
	const sendNow = vi.fn().mockResolvedValue(undefined);
	const sendAgain = vi.fn().mockResolvedValue(undefined);
	const wrapper = mount(AgentChatQueue, {
		props: { messages, saveMessage, removeMessage, sendNow, sendAgain, canSendNow: true },
	});
	return { wrapper, saveMessage, removeMessage, sendNow, sendAgain };
}

it('sends a queued message now', async () => {
	const { wrapper, sendNow } = render();
	await wrapper.get('button').trigger('click');
	await wrapper.get('[data-test-id="agent-chat-queue-send-now"]').trigger('click');
	await flushPromises();
	expect(sendNow).toHaveBeenCalledWith('1');
});

it('queues an undelivered message again', async () => {
	const { wrapper, sendAgain } = render([
		{ ...message, status: 'undelivered', failureReason: 'The run stopped' },
	]);
	await wrapper.get('button').trigger('click');
	await wrapper.get('[data-test-id="agent-chat-queue-send-again"]').trigger('click');
	await flushPromises();
	expect(sendAgain).toHaveBeenCalledWith('1');
});

it('starts collapsed and renders waiting messages in the given order with attachment metadata', async () => {
	const { wrapper, removeMessage } = render([
		message,
		{ ...message, id: '2', message: 'Second', attachments: [] },
	]);
	expect(wrapper.get('button').attributes('aria-expanded')).toBe('false');
	await wrapper.get('button').trigger('click');
	expect(
		wrapper.findAll('[data-testid="agent-chat-queue-message"]').map((row) => row.text()),
	).toEqual([expect.stringContaining('Original'), expect.stringContaining('Second')]);
	expect(wrapper.text()).toContain('notes.txt');
	expect(wrapper.text()).toContain('text/plain');
	const firstRow = wrapper.findAll('[data-testid="agent-chat-queue-message"]')[0];
	const messageRow = firstRow.get('[data-testid="agent-chat-queue-message-row"]');
	const editButton = firstRow.get('button[aria-label="generic.edit"]');
	const removeButton = firstRow.get('button[aria-label="agents.chat.queue.remove"]');
	expect(messageRow.element.lastElementChild?.contains(editButton.element)).toBe(true);
	expect(editButton.text()).toBe('');
	expect(removeButton.text()).toBe('');
	await removeButton.trigger('click');
	expect(removeMessage).toHaveBeenCalledWith('1');
});

it('saves text without changing attachments and keeps the draft when saving fails', async () => {
	const { wrapper, saveMessage } = render();
	await wrapper.get('button').trigger('click');
	await wrapper
		.findAll('button')
		.find((button) => button.attributes('aria-label') === 'generic.edit')!
		.trigger('click');
	await wrapper.get('textarea').setValue('Edited');
	saveMessage.mockRejectedValueOnce(new Error('Already processing'));
	await wrapper
		.findAll('button')
		.find((button) => button.text() === 'generic.save')!
		.trigger('click');
	await flushPromises();
	expect(saveMessage).toHaveBeenCalledWith('1', 'Edited');
	expect(wrapper.get('textarea').element.value).toBe('Edited');
	expect(wrapper.get('[role="alert"]').text()).toBe('agents.chat.queue.save.error');
	expect(wrapper.text()).toContain('notes.txt');
	await wrapper
		.findAll('button')
		.find((button) => button.text() === 'generic.save')!
		.trigger('click');
	await flushPromises();
	expect(wrapper.find('textarea').exists()).toBe(false);
});

it('disables the editor while saving', async () => {
	let finishSaving: () => void;
	const { wrapper, saveMessage } = render();
	saveMessage.mockImplementationOnce(
		() =>
			new Promise<void>((resolve) => {
				finishSaving = resolve;
			}),
	);
	await wrapper.get('button').trigger('click');
	await wrapper.get('button[aria-label="generic.edit"]').trigger('click');
	await wrapper.get('textarea').setValue('Edited');
	await wrapper.get('form').trigger('submit');

	expect(wrapper.get('textarea').attributes('disabled')).toBeDefined();

	finishSaving!();
	await flushPromises();
});

it('retains an unsaved editor after the last waiting message starts and supports keyboard cancel', async () => {
	const { wrapper, saveMessage } = render();
	await wrapper.get('button').trigger('click');
	await wrapper
		.findAll('button')
		.find((button) => button.attributes('aria-label') === 'generic.edit')!
		.trigger('click');
	await wrapper.get('textarea').setValue('Keep this draft');
	await wrapper.setProps({ messages: [] });
	expect(wrapper.text()).toContain('0 queued messages');
	expect(wrapper.get('textarea').element.value).toBe('Keep this draft');
	expect(wrapper.get('[role="status"]').text()).toBe('agents.chat.queue.noLongerWaiting');
	expect(
		wrapper
			.findAll('button')
			.find((button) => button.text() === 'generic.save')!
			.attributes('disabled'),
	).toBeDefined();
	expect(saveMessage).not.toHaveBeenCalled();
	await wrapper.get('textarea').trigger('keydown', { key: 'Escape' });
	expect(wrapper.find('[data-testid="agent-chat-queue"]').exists()).toBe(false);
});
