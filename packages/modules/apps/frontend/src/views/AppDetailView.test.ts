import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';

import AppDetailView from './AppDetailView.vue';

const { route, replace } = vi.hoisted(() => ({
	route: {
		params: { projectId: 'project-1', appId: 'app-1' },
		query: {} as Record<string, string>,
	},
	replace: vi.fn(),
}));
vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRoute: () => route,
	useRouter: () => ({ replace, push: vi.fn() }),
}));

const renderComponent = createComponentRenderer(AppDetailView, {
	global: {
		stubs: {
			AppView: {
				props: ['section'],
				emits: ['update:section'],
				template: `<div>
					<span data-test-id="section">{{ section }}</span>
					<button data-test-id="configure" @click="$emit('update:section', 'configure')" />
					<button data-test-id="preview" @click="$emit('update:section', 'preview')" />
				</div>`,
			},
		},
	},
});

describe('AppDetailView', () => {
	afterEach(() => {
		route.query = {};
		vi.clearAllMocks();
	});

	it('passes the section from the URL to the app view', () => {
		route.query = { section: 'configure.authentication' };
		const { getByTestId } = renderComponent();

		expect(getByTestId('section')).toHaveTextContent('configure.authentication');
	});

	it('opens the preview when the URL has no section', () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId('section')).toHaveTextContent('preview');
	});

	it('keeps the selected section in the URL', async () => {
		route.query = { assistantThread: 'thread-1' };
		const { getByTestId } = renderComponent();

		await userEvent.click(getByTestId('configure'));
		await userEvent.click(getByTestId('preview'));

		expect(replace).toHaveBeenNthCalledWith(1, {
			query: { assistantThread: 'thread-1', section: 'configure' },
		});
		expect(replace).toHaveBeenNthCalledWith(2, {
			query: { assistantThread: 'thread-1', section: undefined },
		});
	});
});
