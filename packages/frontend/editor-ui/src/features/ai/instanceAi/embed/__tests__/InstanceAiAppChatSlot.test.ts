import { createComponentRenderer } from '@/__tests__/render';
import userEvent from '@testing-library/user-event';

import InstanceAiAppChatSlot from '../InstanceAiAppChatSlot.vue';

vi.mock('../../composables/useInstanceAiAvailability', () => ({
	useInstanceAiReady: () => ({ __v_isRef: true, value: true }),
}));

vi.mock('../InstanceAiChatPanel.vue', () => ({
	default: {
		props: ['subject', 'launch', 'threadId'],
		emits: ['close', 'update:threadId', 'update:working'],
		template: `<div data-test-id="chat-panel">
			<span data-test-id="subject">{{ subject.type }}:{{ subject.id }}:{{ subject.pending }}</span>
			<span data-test-id="launch">{{ launch.source }}:{{ launch.sourceContext.appId }}</span>
			<span data-test-id="thread">{{ threadId }}</span>
			<button data-test-id="select-thread" @click="$emit('update:threadId', 'thread-2')" />
			<button data-test-id="start" @click="$emit('update:working', true)" />
			<button data-test-id="finish" @click="$emit('update:working', false)" />
			<button data-test-id="close" @click="$emit('close')" />
			<slot name="empty" />
		</div>`,
	},
}));

const renderComponent = createComponentRenderer(InstanceAiAppChatSlot, {
	props: {
		projectId: 'project-1',
		appId: 'app-1',
		pending: true,
		threadId: 'thread-1',
	},
});

describe('InstanceAiAppChatSlot', () => {
	it('maps the App context and forwards panel events', async () => {
		const { emitted, getByTestId } = renderComponent();

		expect(getByTestId('subject')).toHaveTextContent('app:app-1:true');
		expect(getByTestId('launch')).toHaveTextContent('app_builder_page:app-1');
		expect(getByTestId('thread')).toHaveTextContent('thread-1');
		expect(emitted('update:available')).toEqual([[true]]);

		await userEvent.click(getByTestId('select-thread'));
		await userEvent.click(getByTestId('start'));
		await userEvent.click(getByTestId('finish'));
		await userEvent.click(getByTestId('close'));

		expect(emitted('update:threadId')).toEqual([['thread-2']]);
		expect(emitted('updated')).toEqual([[]]);
		expect(emitted('close')).toEqual([[]]);
	});
});
