import type { BrowserAutomationIdea } from '@n8n/api-types';
import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';

import { useRecommendations } from './useRecommendations';
import type { BackgroundPushMessage } from '../../types';

type MessageHandler = (message: BackgroundPushMessage) => void;

const messageListeners: MessageHandler[] = [];

const chromeMock = {
	runtime: {
		sendMessage: vi.fn(),
		onMessage: {
			addListener: vi.fn((fn: MessageHandler) => messageListeners.push(fn)),
			removeListener: vi.fn((fn: MessageHandler) => {
				const i = messageListeners.indexOf(fn);
				if (i >= 0) messageListeners.splice(i, 1);
			}),
		},
	},
};

Object.assign(globalThis, { chrome: chromeMock });

function mountComposable() {
	let result!: ReturnType<typeof useRecommendations>;
	const TestComponent = defineComponent({
		setup() {
			result = useRecommendations();
		},
		template: '<div />',
	});
	const wrapper = mount(TestComponent);
	return { wrapper, result: () => result };
}

function pushMessage(message: BackgroundPushMessage): void {
	for (const fn of messageListeners) fn(message);
}

const flush = async () => await new Promise((resolve) => setTimeout(resolve, 0));

const idea: BrowserAutomationIdea = {
	id: '1',
	title: 'Triage new issues',
	description: 'Label and route new GitHub issues',
};

beforeEach(() => {
	vi.clearAllMocks();
	messageListeners.length = 0;
	chromeMock.runtime.sendMessage.mockResolvedValue({ success: true });
});

describe('useRecommendations', () => {
	it('asks the background for recommendations on mount', async () => {
		const { wrapper } = mountComposable();
		await flush();

		expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith({ type: 'getRecommendations' });
		wrapper.unmount();
	});

	it('adopts the status and ideas pushed from the background', async () => {
		const { wrapper, result } = mountComposable();
		await flush();

		pushMessage({ type: 'recommendationsChanged', status: 'ready', ideas: [idea] });

		expect(result().status.value).toBe('ready');
		expect(result().ideas.value).toEqual([idea]);
		wrapper.unmount();
	});

	it('sends the picked idea to the background', async () => {
		const { wrapper, result } = mountComposable();
		await flush();

		await result().send(idea);

		expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith({
			type: 'sendRecommendation',
			idea,
		});
		wrapper.unmount();
	});
});
