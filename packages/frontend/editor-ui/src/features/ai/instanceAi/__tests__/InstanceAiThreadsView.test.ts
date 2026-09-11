import { shallowMount, flushPromises } from '@vue/test-utils';
import { reactive } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InstanceAiThreadHistoryResponse, InstanceAiThreadSummary } from '@n8n/api-types';
import InstanceAiThreadsView from '../InstanceAiThreadsView.vue';

const mocks = vi.hoisted(() => ({ load: vi.fn(), scrollToTop: vi.fn() }));
const store = reactive({ threads: [] as InstanceAiThreadSummary[], loadThreadPage: mocks.load });
vi.mock('../instanceAi.store', () => ({ useInstanceAiStore: () => store }));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({ set: vi.fn() }),
}));
vi.mock('@vueuse/core', async (original) => ({
	...(await original<typeof import('@vueuse/core')>()),
	useIntersectionObserver: vi.fn(),
}));

function page(ids: string[], index = 0, hasMore = false): InstanceAiThreadHistoryResponse {
	return {
		threads: ids.map((id) => ({
			id,
			title: id,
			resourceId: 'user',
			createdAt: '2026-01-01',
			updatedAt: '2026-01-01',
		})),
		nextCursor: hasMore ? `cursor-${index + 1}` : null,
		hasMore,
	};
}
function render() {
	return shallowMount(InstanceAiThreadsView, {
		global: {
			renderStubDefaultSlot: true,
			stubs: {
				N8nScrollArea: {
					template: '<div><slot /></div>',
					methods: { scrollToTop: mocks.scrollToTop },
				},
			},
		},
	});
}
beforeEach(() => {
	vi.useFakeTimers();
	mocks.load.mockReset();
	store.threads = ['a', 'b', 'match'].map((id) => ({
		id,
		title: id,
		createdAt: '2026-01-01',
		updatedAt: '2026-01-01',
	}));
});
afterEach(() => {
	vi.useRealTimers();
});

describe('chat history pagination', () => {
	it('loads 30 at a time, appends without duplicates, and stops at the end', async () => {
		mocks.load
			.mockResolvedValueOnce(page(['a'], 0, true))
			.mockResolvedValueOnce(page(['a', 'b'], 1));
		const wrapper = render();
		await flushPromises();
		expect(mocks.load).toHaveBeenLastCalledWith(
			{ cursor: undefined, limit: 30, search: '' },
			expect.any(Function),
		);
		const button = wrapper
			.findAllComponents({ name: 'N8nButton' })
			.find((button) => button.text() === 'Load more');
		expect(button).toBeDefined();
		button!.vm.$emit('click');
		await flushPromises();
		expect(mocks.load).toHaveBeenLastCalledWith(
			{ cursor: 'cursor-1', limit: 30, search: '' },
			expect.any(Function),
		);
		expect(wrapper.findAll('[data-test-id="instance-ai-history-thread"]')).toHaveLength(2);
		expect(wrapper.text()).not.toContain('Load more');
		wrapper.unmount();
	});
	it('retries the failed page without advancing', async () => {
		mocks.load.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(page(['a']));
		const wrapper = render();
		await flushPromises();
		expect(wrapper.text()).toContain("Couldn't load chats");
		wrapper
			.findAllComponents({ name: 'N8nButton' })
			.find((button) => button.text() === 'Retry')!
			.vm.$emit('click');
		await flushPromises();
		expect(mocks.load).toHaveBeenLastCalledWith(
			{ cursor: undefined, limit: 30, search: '' },
			expect.any(Function),
		);
		expect(wrapper.findAll('[data-test-id="instance-ai-history-thread"]')).toHaveLength(1);
		wrapper.unmount();
	});
	it('debounces server search and ignores an older response', async () => {
		let resolveOld!: (value: InstanceAiThreadHistoryResponse) => void;
		mocks.load
			.mockReturnValueOnce(
				new Promise<InstanceAiThreadHistoryResponse>((resolve) => {
					resolveOld = resolve;
				}),
			)
			.mockResolvedValueOnce(page(['match']));
		const wrapper = render();
		wrapper.findComponent({ name: 'N8nInput' }).vm.$emit('update:modelValue', 'match');
		await vi.advanceTimersByTimeAsync(1000);
		await flushPromises();
		expect(mocks.load).toHaveBeenLastCalledWith(
			{ cursor: undefined, limit: 30, search: 'match' },
			expect.any(Function),
		);
		resolveOld(page(['a'], 0, true));
		await flushPromises();
		expect(wrapper.findAll('[data-test-id="instance-ai-history-thread"]')).toHaveLength(1);
		expect(wrapper.find('[data-test-id="instance-ai-history-thread"]').text()).toContain('match');
		wrapper.unmount();
	});
});
