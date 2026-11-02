import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { capabilities, capabilityRegistry, componentRegistry } from '@n8n/frontend-module-sdk';
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
			N8nResizeWrapper: { template: '<div><slot /></div>' },
			AppView: {
				props: ['section', 'pending'],
				emits: ['created', 'update:section'],
				template: `<div>
					<span data-test-id="section">{{ section }}</span>
					<span data-test-id="pending">{{ pending }}</span>
					<button data-test-id="configure" @click="$emit('update:section', 'configure')" />
					<button data-test-id="preview" @click="$emit('update:section', 'preview')" />
					<button data-test-id="created" @click="$emit('created')" />
					<slot name="aside" />
				</div>`,
			},
		},
	},
});

describe('AppDetailView', () => {
	afterEach(() => {
		route.query = {};
		history.replaceState({}, '');
		componentRegistry.clear();
		capabilityRegistry.clear();
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

	it('reads and updates the Assistant thread in the URL', async () => {
		componentRegistry.register('instance-ai-app-chat', {
			props: ['threadId'],
			emits: ['update:available', 'update:threadId'],
			template:
				'<div><span data-test-id="thread">{{ threadId }}</span><button data-test-id="select-thread" @click="$emit(\'update:threadId\', \'thread-2\')" /></div>',
			mounted() {
				this.$emit('update:available', true);
			},
		});
		capabilityRegistry.provide(capabilities.projectPermissions, {
			scopesFor: () => ['app:update'],
			isReadOnly: () => false,
		});
		route.query = { assistantThread: 'thread-1', section: 'configure' };
		const { getByTestId } = renderComponent();

		expect(getByTestId('thread')).toHaveTextContent('thread-1');
		await userEvent.click(getByTestId('select-thread'));

		expect(replace).toHaveBeenCalledWith({
			query: { assistantThread: 'thread-2', section: 'configure' },
		});
	});

	it('accepts only the pending app id from history state', async () => {
		history.replaceState({ instanceAiPendingAppId: 'app-1' }, '');
		const { getByTestId } = renderComponent();

		expect(getByTestId('pending')).toHaveTextContent('true');
		await userEvent.click(getByTestId('created'));

		expect(history.state).not.toHaveProperty('instanceAiPendingAppId');
	});
});
