import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Ref } from 'vue';
import type { useInfiniteScroll } from '@vueuse/core';
import AgentChatMessageList from '../components/AgentChatMessageList.vue';
import type { ChatMessage } from '@/features/ai/shared/agentsChat/types';

type InfiniteScrollOptions = NonNullable<Parameters<typeof useInfiniteScroll>[2]>;

// jsdom has no layout, so the tests drive the infinite scroll by hand.
const infiniteScroll = vi.hoisted(() => ({
	load: undefined as (() => Promise<void>) | undefined,
	options: undefined as InfiniteScrollOptions | undefined,
	isLoading: undefined as Ref<boolean> | undefined,
}));

vi.mock('@vueuse/core', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@vueuse/core')>();
	const { ref } = await import('vue');
	return {
		...actual,
		useInfiniteScroll: (
			_element: unknown,
			onLoadMore: () => Promise<void>,
			options: InfiniteScrollOptions,
		) => {
			infiniteScroll.load = onLoadMore;
			infiniteScroll.options = options;
			infiniteScroll.isLoading = ref(false);
			return { isLoading: infiniteScroll.isLoading, reset: vi.fn() };
		},
	};
});

vi.mock('@/features/agents/components/AgentChatMessageActions.vue', () => ({
	default: { template: '<div />' },
}));

vi.mock('@/features/agents/components/AgentMarkdownChunk.vue', () => ({
	default: { props: ['source'], template: '<div>{{ source }}</div>' },
}));

function message(id: string, role: ChatMessage['role'], createdAt?: number): ChatMessage {
	return { id, role, content: `${role} ${id}`, status: 'success', createdAt };
}

/**
 * Places an element at `offset()` px from the top of the scroll content, as a
 * browser does: the view position follows `scrollTop`.
 */
function placeInContent(el: HTMLElement, container: HTMLElement, offset: () => number): void {
	vi.spyOn(el, 'getBoundingClientRect').mockImplementation(() => {
		const top = offset() - container.scrollTop;
		return { top, bottom: top + 50 } as DOMRect;
	});
}

function scrollArea(wrapper: ReturnType<typeof mount>): HTMLElement {
	return wrapper.element as HTMLElement;
}

function setHeights(el: HTMLElement, scrollHeight: number, clientHeight: number): void {
	Object.defineProperty(el, 'scrollHeight', { configurable: true, value: scrollHeight });
	Object.defineProperty(el, 'clientHeight', { configurable: true, value: clientHeight });
}

function canLoadMore(el: HTMLElement): boolean {
	return infiniteScroll.options?.canLoadMore?.(el) ?? false;
}

describe('AgentChatMessageList older messages', () => {
	beforeEach(() => {
		vi.stubGlobal('requestAnimationFrame', (onFrame: FrameRequestCallback) => {
			onFrame(0);
			return 0;
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('loads older messages only after the first scroll of a long thread', async () => {
		const wrapper = mount(AgentChatMessageList, {
			props: {
				messages: [message('u1', 'user')],
				messagingState: 'idle',
				hasOlderMessages: true,
				loadOlderMessages: vi.fn(),
			},
		});
		const el = scrollArea(wrapper);
		setHeights(el, 1000, 400);

		expect(canLoadMore(el)).toBe(false);

		await wrapper.trigger('scroll');

		expect(canLoadMore(el)).toBe(true);
		await wrapper.setProps({ hasOlderMessages: false });
		expect(canLoadMore(el)).toBe(false);
	});

	it('loads older messages of a thread too short to scroll', () => {
		const wrapper = mount(AgentChatMessageList, {
			props: {
				messages: [message('u1', 'user')],
				messagingState: 'idle',
				hasOlderMessages: true,
				loadOlderMessages: vi.fn(),
			},
		});
		const el = scrollArea(wrapper);
		setHeights(el, 400, 400);

		expect(canLoadMore(el)).toBe(true);
	});

	it('keeps the messages on screen in place when older messages load above them', async () => {
		const newest = [message('u2', 'user'), message('a2', 'assistant'), message('u3', 'user')];
		const wrapper = mount(AgentChatMessageList, {
			props: { messages: newest, messagingState: 'idle', hasOlderMessages: true },
		});
		await flushPromises();
		const el = scrollArea(wrapper);
		el.scrollTop = 20;
		const anchor = el.firstElementChild as HTMLElement;
		let anchorOffset = 100;
		placeInContent(anchor, el, () => anchorOffset);
		await wrapper.setProps({
			loadOlderMessages: async () => {
				await wrapper.setProps({
					messages: [message('u1', 'user'), message('a1', 'assistant'), ...newest],
				});
				anchorOffset = 700;
			},
		});

		await infiniteScroll.load?.();
		await flushPromises();

		// The anchor moved 600 px down, and the last message is a user message:
		// the view follows the anchor and does not jump to the bottom.
		expect(el.scrollTop).toBe(620);
		expect(el.contains(anchor)).toBe(true);
		// Browser scroll anchoring is off only while the page loads.
		expect(el.style.overflowAnchor).toBe('');
	});

	it('keeps the view in place when older messages grow after the first frame', async () => {
		const newest = [message('u2', 'user'), message('a2', 'assistant')];
		const wrapper = mount(AgentChatMessageList, {
			props: { messages: newest, messagingState: 'idle', hasOlderMessages: true },
		});
		await flushPromises();
		const el = scrollArea(wrapper);
		const anchor = el.firstElementChild as HTMLElement;
		let anchorOffset = 0;
		placeInContent(anchor, el, () => anchorOffset);
		// Markdown above the anchor finishes its render one frame late.
		let frames = 0;
		vi.stubGlobal('requestAnimationFrame', (onFrame: FrameRequestCallback) => {
			frames++;
			if (frames === 1) anchorOffset += 150;
			onFrame(0);
			return 0;
		});
		await wrapper.setProps({
			loadOlderMessages: async () => {
				await wrapper.setProps({
					messages: [message('u1', 'user'), message('a1', 'assistant'), ...newest],
				});
				anchorOffset = 500;
			},
		});

		await infiniteScroll.load?.();
		await flushPromises();

		expect(el.scrollTop).toBe(650);
	});

	it('shows the first timestamp divider only when no older messages are left', async () => {
		const now = Date.now();
		const newest = [message('u2', 'user', now), message('a2', 'assistant', now)];
		const wrapper = mount(AgentChatMessageList, {
			props: { messages: newest, messagingState: 'idle', hasOlderMessages: true },
		});
		await flushPromises();
		const el = scrollArea(wrapper);
		const dividers = () => wrapper.findAll('[data-testid="agent-chat-timestamp-divider"]');
		// The gap to the turn before is not known yet.
		expect(dividers()).toHaveLength(0);
		const firstMessage = el.firstElementChild as HTMLElement;
		let messageOffset = 40;
		placeInContent(firstMessage, el, () => messageOffset);
		await wrapper.setProps({
			loadOlderMessages: async () => {
				// The last page, two minutes before: only the new first turn gets a divider.
				await wrapper.setProps({
					messages: [
						message('u1', 'user', now - 2 * 60_000),
						message('a1', 'assistant', now - 2 * 60_000),
						...newest,
					],
					hasOlderMessages: false,
				});
				messageOffset = 840;
			},
		});

		await infiniteScroll.load?.();
		await flushPromises();

		expect(dividers()).toHaveLength(1);
		expect(el.firstElementChild).toBe(dividers()[0].element);
		expect(el.contains(firstMessage)).toBe(true);
		expect(el.scrollTop).toBe(800);
	});

	it('shows a spinner while older messages load', async () => {
		const wrapper = mount(AgentChatMessageList, {
			props: { messages: [message('u1', 'user')], messagingState: 'idle', hasOlderMessages: true },
		});
		infiniteScroll.isLoading!.value = true;
		await flushPromises();

		expect(wrapper.find('[data-testid="agent-chat-older-messages-loading"]').exists()).toBe(true);
	});

	it('shows a retry after a failed load and stops loading until the retry', async () => {
		const loadOlderMessages = vi.fn().mockRejectedValue(new Error('offline'));
		const wrapper = mount(AgentChatMessageList, {
			props: {
				messages: [message('u1', 'user')],
				messagingState: 'idle',
				hasOlderMessages: true,
				loadOlderMessages,
			},
		});
		const el = scrollArea(wrapper);
		setHeights(el, 400, 400);

		await infiniteScroll.load?.();
		await flushPromises();

		const error = wrapper.find('[data-testid="agent-chat-older-messages-error"]');
		expect(error.exists()).toBe(true);
		expect(error.attributes('role')).toBe('alert');
		expect(canLoadMore(el)).toBe(false);

		await error.find('button').trigger('click');

		expect(wrapper.find('[data-testid="agent-chat-older-messages-error"]').exists()).toBe(false);
		expect(canLoadMore(el)).toBe(true);
	});
});
