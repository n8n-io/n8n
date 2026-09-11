import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import { defineComponent, h } from 'vue';

import AppComponentsForm from '@/features/apps/components/AppComponentsForm.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useAppsStore } from '@/features/apps/apps.store';
import type { App } from '@/features/apps/apps.types';

vi.mock('@/features/apps/components/AppCodeEditor.vue', () => ({
	default: defineComponent({
		props: { modelValue: { type: String, required: true } },
		emits: ['update:modelValue'],
		setup:
			(props, { emit }) =>
			() =>
				h('textarea', {
					'data-test-id': 'app-code-editor',
					value: props.modelValue,
					onInput: (event: Event) =>
						emit('update:modelValue', (event.target as HTMLTextAreaElement).value),
				}),
	}),
}));

const app: App = {
	id: 'app1',
	name: 'My app',
	namespace: 'my-app',
	theme: null,
	components: null,
	auth: 'public',
	projectId: 'p1',
	activeVersionId: null,
	publishedAt: null,
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z',
};

const renderComponent = createComponentRenderer(AppComponentsForm, {
	pinia: createTestingPinia(),
	props: { projectId: 'p1', appId: 'app1', components: null },
});

const type = async (element: HTMLElement, value: string) => {
	(element as HTMLTextAreaElement).value = value;
	element.dispatchEvent(new Event('input'));
};

describe('AppComponentsForm', () => {
	let appsStore: ReturnType<typeof mockedStore<typeof useAppsStore>>;

	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		appsStore = mockedStore(useAppsStore);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	it('shows the saved components source', () => {
		const { getByTestId } = renderComponent({
			props: { components: 'export const Card = () => <div />;' },
		});

		expect(getByTestId('app-code-editor')).toHaveValue('export const Card = () => <div />;');
	});

	it('autosaves an edit and emits the updated app', async () => {
		const components = 'export function Card() { return <div />; }';
		appsStore.updateApp.mockResolvedValue({ ...app, components });
		const { getByTestId, emitted } = renderComponent();

		await type(getByTestId('app-code-editor'), components);
		await vi.advanceTimersByTimeAsync(5000);

		await waitFor(() =>
			expect(appsStore.updateApp).toHaveBeenCalledWith('p1', 'app1', { components }),
		);
		expect(emitted('saved')).toEqual([[{ ...app, components }]]);
		expect(getByTestId('app-components-saved-indicator')).toHaveTextContent('Saved');
	});

	it('saves an emptied editor as null', async () => {
		appsStore.updateApp.mockResolvedValue(app);
		const { getByTestId } = renderComponent({ props: { components: 'export {};' } });

		await type(getByTestId('app-code-editor'), '   ');
		await vi.advanceTimersByTimeAsync(5000);

		await waitFor(() =>
			expect(appsStore.updateApp).toHaveBeenCalledWith('p1', 'app1', { components: null }),
		);
	});
});
