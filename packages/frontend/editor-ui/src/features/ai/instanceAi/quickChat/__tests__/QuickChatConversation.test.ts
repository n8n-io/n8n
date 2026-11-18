import { defineComponent } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import QuickChatConversation from '../QuickChatConversation.vue';

const store = vi.hoisted(() => ({
	getOrCreateRuntime: vi.fn(() => ({})),
	syncThread: vi.fn(async () => {}),
}));
vi.mock('../../instanceAi.store', () => ({
	useInstanceAiStore: () => store,
	provideThread: vi.fn(),
}));

let beforeSend: (() => Promise<void>) | undefined;
vi.mock('../../components/InstanceAiConversation.vue', () => ({
	default: defineComponent({
		props: ['beforeSend', 'newThread'],
		setup(props) {
			beforeSend = props.beforeSend;
			return {};
		},
		template: '<div data-test-id="conversation" :data-new-thread="String(newThread)" />',
	}),
}));

const renderComponent = createComponentRenderer(QuickChatConversation);

describe('QuickChatConversation', () => {
	beforeEach(() => {
		createTestingPinia();
		vi.clearAllMocks();
		beforeSend = undefined;
	});

	it('saves a draft thread as a quick chat before its first message', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { threadId: 't1', isDraft: true, projectId: 'p1' },
		});

		expect(getByTestId('conversation')).toHaveAttribute('data-new-thread', 'true');
		expect(store.getOrCreateRuntime).toHaveBeenCalledWith('t1', 'p1');

		await beforeSend?.();

		expect(store.syncThread).toHaveBeenCalledWith('t1', 'p1', {
			source: 'assistant_page',
			origin: 'internal',
			sourceContext: { surface: 'quick_chat' },
		});
		expect(emitted('persisted')).toEqual([['t1']]);
	});

	it('does not save a thread that already exists', async () => {
		renderComponent({ props: { threadId: 't1', isDraft: false, projectId: 'p1' } });

		await beforeSend?.();

		expect(store.syncThread).not.toHaveBeenCalled();
	});
});
