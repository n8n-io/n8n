import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, type PropType } from 'vue';
import { fireEvent } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { mockedStore } from '@/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiThreadList from '../InstanceAiThreadList.vue';
import { useInstanceAiStore } from '../../instanceAi.store';

const ActionDropdownStub = defineComponent({
	name: 'N8nActionDropdownStub',
	props: {
		items: { type: Array as PropType<Array<{ id: string }>>, required: true },
	},
	emits: ['select'],
	setup(props, { emit }) {
		return () =>
			h(
				'div',
				props.items.map((item) =>
					h(
						'button',
						{ 'data-test-id': `action-${item.id}`, onClick: () => emit('select', item.id) },
						item.id,
					),
				),
			);
	},
});

// The shell's global RouterLink stub (`<a><slot /></a>`) doesn't support the `custom`
// scoped-slot API the new-thread button relies on for cmd/middle-click — override it
// locally with one that does, while keeping plain (non-custom) usage an `<a>` too.
const RouterLinkStub = defineComponent({
	name: 'RouterLinkStub',
	props: {
		to: { type: [String, Object], required: false },
		custom: { type: Boolean, default: false },
	},
	setup(props, { slots }) {
		const href = typeof props.to === 'string' ? props.to : '#';
		return () =>
			props.custom
				? slots.default?.({ href, navigate: () => {} })
				: h('a', { href }, slots.default?.());
	},
});

const threads = [
	{
		id: 'thread-1',
		title: 'First thread',
		createdAt: '2026-04-01T00:00:00.000Z',
		updatedAt: '2026-04-01T00:00:00.000Z',
	},
	{
		id: 'thread-2',
		title: 'Second thread',
		createdAt: '2026-04-02T00:00:00.000Z',
		updatedAt: '2026-04-02T00:00:00.000Z',
	},
];

const renderList = createComponentRenderer(InstanceAiThreadList, {
	global: {
		stubs: {
			N8nActionDropdown: ActionDropdownStub,
			ActionDropdown: ActionDropdownStub,
			RouterLink: RouterLinkStub,
		},
	},
});

describe('InstanceAiThreadList', () => {
	let store: ReturnType<typeof mockedStore<typeof useInstanceAiStore>>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		store = mockedStore(useInstanceAiStore);
		store.threads = threads as typeof store.threads;
		store.deleteThread.mockResolvedValue(true);
	});

	it('renders store.threads by default', () => {
		const { getAllByTestId } = renderList();
		expect(getAllByTestId('instance-ai-thread-item')).toHaveLength(2);
	});

	it('renders only the threads passed via the threads prop', () => {
		const { getAllByTestId } = renderList({ props: { threads: [threads[0]] } });
		expect(getAllByTestId('instance-ai-thread-item')).toHaveLength(1);
	});

	it('highlights only the activeThreadId prop', () => {
		const { getAllByTestId } = renderList({ props: { activeThreadId: 'thread-2' } });
		expect(getAllByTestId('instance-ai-thread-item')[0]).not.toHaveClass('active');
		expect(getAllByTestId('instance-ai-thread-item')[1]).toHaveClass('active');
	});

	it('highlights nothing when activeThreadId is omitted', () => {
		const { getAllByTestId } = renderList();
		for (const item of getAllByTestId('instance-ai-thread-item')) {
			expect(item).not.toHaveClass('active');
		}
	});

	it('renders a RouterLink per thread when linkTo is given', () => {
		const { container } = renderList({ props: { linkTo: (id: string) => `/assistant/${id}` } });
		expect(container.querySelectorAll('a')).toHaveLength(2);
	});

	it('renders a button and emits select when linkTo is omitted', async () => {
		const { getAllByText, emitted } = renderList();
		await fireEvent.click(getAllByText('First thread')[0]);
		expect(emitted('select')).toEqual([['thread-1']]);
	});

	it('emits new when the new-thread button is clicked', async () => {
		const { getByTestId, emitted } = renderList();
		await fireEvent.click(getByTestId('instance-ai-new-thread-button'));
		expect(emitted('new')).toEqual([[]]);
	});

	it('renders the new-thread button as a link when newThreadTo is given', () => {
		const { getByTestId } = renderList({ props: { newThreadTo: '/assistant' } });
		expect(getByTestId('instance-ai-new-thread-button').tagName).toBe('A');
	});

	it('emits collapse when the collapse button is clicked', async () => {
		const { getByTestId, emitted } = renderList();
		await fireEvent.click(getByTestId('instance-ai-sidebar-collapse'));
		expect(emitted('collapse')).toEqual([[]]);
	});

	it('deletes via the store and emits deleted with whether the thread was active', async () => {
		const { getAllByTestId, emitted } = renderList({ props: { activeThreadId: 'thread-1' } });
		await fireEvent.click(getAllByTestId('action-delete')[0]);
		expect(store.deleteThread).toHaveBeenCalledWith('thread-1');
		await vi.waitFor(() => expect(emitted('deleted')).toEqual([[true]]));
	});

	it('emits deleted with wasActive false for a non-active thread', async () => {
		const { getAllByTestId, emitted } = renderList({ props: { activeThreadId: 'thread-1' } });
		await fireEvent.click(getAllByTestId('action-delete')[1]);
		await vi.waitFor(() => expect(emitted('deleted')).toEqual([[false]]));
	});

	it('does not emit deleted when the delete fails', async () => {
		store.deleteThread.mockResolvedValue(false);
		const { getAllByTestId, emitted } = renderList({ props: { activeThreadId: 'thread-1' } });
		await fireEvent.click(getAllByTestId('action-delete')[0]);
		expect(emitted('deleted')).toBeUndefined();
	});
});
